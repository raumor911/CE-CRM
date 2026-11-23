-- Edición de cotizaciones conservando el folio.
-- Migración SOLO ADITIVA sobre 20261123000000_create_quotes_module.sql (debe correr después de esa).
-- Reversión: supabase/rollbacks/20261123010000_drop_quotes_edit.sql
-- Reglas: se pueden editar borradores y cotizaciones enviadas; aceptadas, rechazadas y canceladas quedan congeladas.
-- Cada edición guarda la versión anterior completa en quote_revisions y sube el contador quotes.revision.

BEGIN;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS revision INT NOT NULL DEFAULT 1 CHECK (revision >= 1);

CREATE TABLE IF NOT EXISTS public.quote_revisions (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quote_id    UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    revision    INT  NOT NULL,        -- número de la versión que se guarda aquí (la que había antes de editar)
    snapshot    JSONB NOT NULL,       -- la cotización completa con sus renglones, tal como estaba
    edited_by   UUID DEFAULT auth.uid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (quote_id, revision)
);

ALTER TABLE public.quote_revisions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Solo lectura directa: las versiones se escriben únicamente desde update_quote().
  CREATE POLICY quote_revisions_select ON public.quote_revisions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

/* ───────────── Congelar lo ya cerrado, abriendo solo para update_quote ─────────────
   Antes: todo lo que no era borrador estaba congelado. Ahora, una cotización 'sent' solo cambia de contenido
   dentro de update_quote(), que activa una bandera local a la transacción (app.quote_edit). Un UPDATE directo
   desde el navegador no puede activarla, así que no se salta el recálculo de totales del servidor. */

CREATE OR REPLACE FUNCTION public.quotes_guard_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status <> 'draft'
     AND NOT (COALESCE(current_setting('app.quote_edit', true), '') = 'on' AND OLD.status = 'sent' AND NEW.status = 'sent')
     AND (to_jsonb(NEW) - 'status' - 'updated_at' - 'sent_at' - 'accepted_at' - 'rejected_at')
           IS DISTINCT FROM
         (to_jsonb(OLD) - 'status' - 'updated_at' - 'sent_at' - 'accepted_at' - 'rejected_at') THEN
    RAISE EXCEPTION 'La cotización % ya no se puede modificar (estado: %). Duplícala para crear una nueva.', OLD.folio, OLD.status;
  END IF;
  RETURN NEW;
END $$;

/* ───────────── Editar cotización ─────────────
   SECURITY DEFINER a propósito: necesita reemplazar los renglones, y la tabla no permite borrar ni insertar
   renglones directamente en una cotización ya enviada. El permiso efectivo no crece: EXECUTE solo para
   usuarios con sesión, igual que el resto del módulo. Folio, tipo y lead no cambian. */

CREATE OR REPLACE FUNCTION public.update_quote(
  p_id UUID, p_expected_updated_at TIMESTAMPTZ, p_quote JSONB, p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  q           public.quotes;
  v_rate      NUMERIC := (p_quote->>'tax_rate')::NUMERIC;
  v_issued    DATE    := (p_quote->>'issued_on')::DATE;
  v_days      INT     := (p_quote->>'validity_days')::INT;
  v_subtotal  NUMERIC;
  v_tax       NUMERIC;
  v_total     NUMERIC;
  v_deposit   NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Necesitas iniciar sesión para editar cotizaciones.';
  END IF;

  SELECT * INTO q FROM public.quotes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cotización no encontrada.';
  END IF;
  IF q.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'La cotización cambió mientras la editabas. Recarga e intenta de nuevo.';
  END IF;
  IF q.status NOT IN ('draft', 'sent') THEN
    RAISE EXCEPTION 'La cotización % está % y ya no se puede editar. Duplícala para crear una nueva.', q.folio, q.status;
  END IF;
  IF p_quote->>'quote_type' IS DISTINCT FROM q.quote_type THEN
    RAISE EXCEPTION 'El tipo de cotización no se puede cambiar. Crea una cotización nueva.';
  END IF;
  IF (p_quote->>'lead_id')::UUID IS DISTINCT FROM q.lead_id THEN
    RAISE EXCEPTION 'La cotización pertenece a otro lead.';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La cotización necesita al menos un renglón.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) i WHERE i->>'kind' = 'container') THEN
    RAISE EXCEPTION 'La cotización necesita al menos un contenedor.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) i
              WHERE COALESCE((i->>'quantity')::INT, 0) <= 0 OR COALESCE((i->>'unit_price')::NUMERIC, -1) < 0) THEN
    RAISE EXCEPTION 'Hay renglones con cantidad o precio inválidos.';
  END IF;
  IF v_days IS NULL OR v_days <= 0 THEN
    RAISE EXCEPTION 'La vigencia debe ser de al menos un día.';
  END IF;
  IF v_issued IS NULL THEN
    RAISE EXCEPTION 'Falta la fecha de la cotización.';
  END IF;

  -- Guarda la versión anterior completa antes de tocar nada.
  INSERT INTO public.quote_revisions (quote_id, revision, snapshot)
  SELECT p_id, q.revision,
         to_jsonb(q) || jsonb_build_object('items', COALESCE(
           (SELECT jsonb_agg(to_jsonb(i) ORDER BY i.position) FROM public.quote_items i WHERE i.quote_id = p_id), '[]'::JSONB));

  -- Los totales los calcula el servidor; el dinero que mande el navegador se ignora.
  SELECT COALESCE(SUM(ROUND((i->>'quantity')::INT * (i->>'unit_price')::NUMERIC, 2)), 0)
    INTO v_subtotal FROM jsonb_array_elements(p_items) i;
  v_tax     := ROUND(v_subtotal * v_rate, 2);
  v_total   := v_subtotal + v_tax;
  v_deposit := CASE WHEN q.quote_type = 'rental' THEN COALESCE((p_quote->>'security_deposit')::NUMERIC, 0) END;

  PERFORM set_config('app.quote_edit', 'on', true);   -- abre el trigger solo durante esta transacción

  UPDATE public.quotes SET
    customer_name = p_quote->>'customer_name', customer_company = p_quote->>'customer_company',
    customer_rfc = p_quote->>'customer_rfc', customer_phone = p_quote->>'customer_phone',
    customer_email = p_quote->>'customer_email', delivery_location = p_quote->>'delivery_location',
    issued_on = v_issued, validity_days = v_days, valid_until = v_issued + v_days,
    exchange_rate = (p_quote->>'exchange_rate')::NUMERIC, tax_rate = v_rate,
    subtotal = v_subtotal, tax_total = v_tax, total = v_total,
    security_deposit = v_deposit,
    total_with_deposit = CASE WHEN v_deposit IS NOT NULL THEN v_total + v_deposit END,
    down_payment_pct = CASE WHEN q.quote_type = 'sale' THEN (p_quote->>'down_payment_pct')::NUMERIC END,
    terms = COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_quote->'terms', '[]'::JSONB))), '{}'),
    required_documents = p_quote->>'required_documents', seller_name = p_quote->>'seller_name',
    seller_phone = p_quote->>'seller_phone', seller_whatsapp = p_quote->>'seller_whatsapp',
    seller_email = p_quote->>'seller_email', notes = p_quote->>'notes',
    revision = q.revision + 1, updated_at = NOW()
  WHERE id = p_id;

  DELETE FROM public.quote_items WHERE quote_id = p_id;
  INSERT INTO public.quote_items (
    quote_id, position, kind, description, detail, quantity, unit_price, unit_price_usd, line_subtotal, specs, photo_url
  )
  SELECT p_id, ord, i->>'kind', i->>'description', NULLIF(i->>'detail', ''),
         (i->>'quantity')::INT, (i->>'unit_price')::NUMERIC, (i->>'unit_price_usd')::NUMERIC,
         ROUND((i->>'quantity')::INT * (i->>'unit_price')::NUMERIC, 2),
         CASE WHEN jsonb_typeof(i->'specs') = 'object' THEN i->'specs' END, NULLIF(i->>'photo_url', '')
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(i, ord);

  PERFORM set_config('app.quote_edit', 'off', true);
  RETURN p_id;
END $$;

REVOKE ALL ON FUNCTION public.update_quote(UUID, TIMESTAMPTZ, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_quote(UUID, TIMESTAMPTZ, JSONB, JSONB) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
