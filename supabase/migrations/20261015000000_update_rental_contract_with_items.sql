-- H04: Edicion atomica del contrato y de los renglones de equipo.
-- SECURITY INVOKER: respeta las politicas RLS existentes.
-- No modifica rental_payments ni rental_inventory_assignments.
CREATE OR REPLACE FUNCTION public.update_rental_contract_with_items(
  p_rental_id uuid,
  p_expected_updated_at timestamptz,
  p_rental_data jsonb,
  p_items jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_before public.rentals%ROWTYPE;
  v_after public.rentals%ROWTYPE;
  v_old_item public.rental_items%ROWTYPE;
  v_item jsonb;
  v_before_items jsonb;
  v_after_items jsonb;
  v_seen_ids uuid[] := ARRAY[]::uuid[];
  v_id uuid;
  v_name text;
  v_phone text;
  v_project text;
  v_location text;
  v_start date;
  v_end date;
  v_description text;
  v_qty integer;
  v_unit numeric;
  v_tax numeric;
  v_monthly_total numeric;
  v_subtotal numeric;
  v_total_tax numeric;
  v_total numeric;
  v_freight numeric;
  v_financial_change boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesion para editar una renta.';
  END IF;

  IF p_expected_updated_at IS NULL
     OR jsonb_typeof(p_rental_data) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'La solicitud de edicion de renta es invalida.';
  END IF;

  SELECT * INTO v_before
  FROM public.rentals
  WHERE id = p_rental_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La renta ya no existe o no tienes acceso a ella.';
  END IF;

  IF v_before.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'Otro usuario modifico esta renta. Cierra y vuelve a abrir el formulario antes de guardar.';
  END IF;

  v_name := btrim(coalesce(p_rental_data->>'customer_name', ''));
  v_phone := nullif(btrim(coalesce(p_rental_data->>'customer_phone', '')), '');
  v_project := nullif(btrim(coalesce(p_rental_data->>'project_name', '')), '');
  v_location := nullif(btrim(coalesce(p_rental_data->>'location', '')), '');
  v_start := nullif(p_rental_data->>'start_date', '')::date;
  v_end := nullif(p_rental_data->>'contractual_end_date', '')::date;

  IF v_name = '' OR v_start IS NULL OR v_end IS NULL OR v_end < v_start THEN
    RAISE EXCEPTION 'Completa cliente, inicio y vencimiento contractual con fechas validas.';
  END IF;

  -- Los periodos emitidos tienen fechas historicas independientes del contrato.
  -- No mover el ancla de vencimiento si ya existen pagos mensuales.
  IF v_start IS DISTINCT FROM v_before.start_date
     AND EXISTS (
       SELECT 1 FROM public.rental_payments
       WHERE rental_id = p_rental_id
     ) THEN
    RAISE EXCEPTION 'No se puede cambiar la fecha de inicio porque ya existen mensualidades. Requiere una correccion administrativa.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rental_payments
    WHERE rental_id = p_rental_id
      AND payment_due_date > v_end
  ) THEN
    RAISE EXCEPTION 'El vencimiento propuesto deja pagos existentes fuera de vigencia. Revisa esas mensualidades antes de acortar el contrato.';
  END IF;

  SELECT coalesce(jsonb_agg(to_jsonb(ri) ORDER BY ri.created_at, ri.id), '[]'::jsonb)
    INTO v_before_items
  FROM public.rental_items ri
  WHERE ri.rental_id = p_rental_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'El detalle de equipos contiene un renglon invalido.';
    END IF;

    v_id := nullif(v_item->>'id', '')::uuid;
    v_description := btrim(coalesce(v_item->>'equipment_description', ''));
    v_qty := nullif(v_item->>'quantity', '')::integer;
    v_unit := nullif(v_item->>'subtotal_monthly', '')::numeric;
    v_tax := nullif(v_item->>'tax_monthly', '')::numeric;
    v_monthly_total := nullif(v_item->>'monthly_total', '')::numeric;

    IF v_description = ''
       OR v_qty IS NULL OR v_qty <= 0
       OR v_unit IS NULL OR v_unit <= 0
       OR v_tax IS NULL OR v_tax < 0
       OR v_monthly_total IS NULL OR v_monthly_total <= 0 THEN
      RAISE EXCEPTION 'Cada equipo debe tener descripcion, cantidad e importes validos.';
    END IF;

    IF v_id IS NULL THEN
      -- El formulario usa IVA 16%; se verifica del lado del servidor.
      IF round(v_unit * v_qty * 0.16, 2) IS DISTINCT FROM v_tax
         OR round(v_unit * v_qty, 2) + v_tax IS DISTINCT FROM v_monthly_total THEN
        RAISE EXCEPTION 'El IVA y total de un equipo nuevo no coinciden con su subtotal y cantidad.';
      END IF;

      INSERT INTO public.rental_items (
        rental_id, equipment_description, quantity,
        subtotal_monthly, tax_monthly, monthly_total,
        return_freight_cost
      ) VALUES (
        p_rental_id, v_description, v_qty,
        v_unit, v_tax, v_monthly_total, 0
      )
      RETURNING id INTO v_id;
    ELSE
      IF v_id = ANY(v_seen_ids) THEN
        RAISE EXCEPTION 'Un equipo aparece duplicado en el formulario.';
      END IF;

      SELECT * INTO v_old_item
      FROM public.rental_items
      WHERE id = v_id AND rental_id = p_rental_id
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Un equipo ya no pertenece a esta renta. Vuelve a abrir el formulario.';
      END IF;

      v_financial_change :=
        v_old_item.quantity IS DISTINCT FROM v_qty
        OR v_old_item.subtotal_monthly IS DISTINCT FROM v_unit
        OR v_old_item.tax_monthly IS DISTINCT FROM v_tax
        OR v_old_item.monthly_total IS DISTINCT FROM v_monthly_total;

      -- No reescribir importes heredados que no fueron editados.
      IF v_financial_change AND (
         round(v_unit * v_qty * 0.16, 2) IS DISTINCT FROM v_tax
         OR round(v_unit * v_qty, 2) + v_tax IS DISTINCT FROM v_monthly_total
      ) THEN
        RAISE EXCEPTION 'Los importes de un equipo modificado no coinciden. Revisa el subtotal y la cantidad.';
      END IF;

      IF v_old_item.equipment_description IS DISTINCT FROM v_description
         OR v_financial_change THEN
        UPDATE public.rental_items
        SET equipment_description = v_description,
            quantity = v_qty,
            subtotal_monthly = v_unit,
            tax_monthly = v_tax,
            monthly_total = v_monthly_total,
            updated_at = clock_timestamp()
        WHERE id = v_id;
      END IF;
    END IF;

    v_seen_ids := array_append(v_seen_ids, v_id);
  END LOOP;

  -- Solo borrar los renglones omitidos, sin recrear los que conservan su ID.
  DELETE FROM public.rental_items
  WHERE rental_id = p_rental_id
    AND NOT (id = ANY(v_seen_ids));

  SELECT
    coalesce(sum(ri.subtotal_monthly * ri.quantity), 0),
    coalesce(sum(ri.tax_monthly), 0),
    coalesce(sum(ri.monthly_total), 0),
    coalesce(sum(ri.return_freight_cost), 0)
  INTO v_subtotal, v_total_tax, v_total, v_freight
  FROM public.rental_items ri
  WHERE ri.rental_id = p_rental_id;

  UPDATE public.rentals
  SET customer_name = v_name,
      customer_phone = v_phone,
      project_name = v_project,
      location = v_location,
      start_date = v_start,
      contractual_end_date = v_end,
      subtotal_monthly = v_subtotal,
      tax_monthly = v_total_tax,
      monthly_amount_total = v_total,
      return_freight_total = v_freight,
      updated_by = auth.uid(),
      updated_at = clock_timestamp()
  WHERE id = p_rental_id
  RETURNING * INTO v_after;

  SELECT coalesce(jsonb_agg(to_jsonb(ri) ORDER BY ri.created_at, ri.id), '[]'::jsonb)
    INTO v_after_items
  FROM public.rental_items ri
  WHERE ri.rental_id = p_rental_id;

  INSERT INTO public.rental_activities (
    rental_id, activity_type, description, previous_data, created_by
  ) VALUES (
    p_rental_id,
    'contract_updated',
    'Contrato y detalle de equipos revisados desde el formulario de renta.',
    jsonb_build_object(
      'before', jsonb_build_object('rental', to_jsonb(v_before), 'items', v_before_items),
      'after', jsonb_build_object('rental', to_jsonb(v_after), 'items', v_after_items)
    ),
    auth.uid()
  );

  -- Pagos emitidos (confirmados o pendientes) permanecen intactos.
  RETURN jsonb_build_object('rental', to_jsonb(v_after), 'items', v_after_items);
END;
$$;

REVOKE ALL ON FUNCTION public.update_rental_contract_with_items(uuid, timestamptz, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_rental_contract_with_items(uuid, timestamptz, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_rental_contract_with_items(uuid, timestamptz, jsonb, jsonb) TO authenticated;
