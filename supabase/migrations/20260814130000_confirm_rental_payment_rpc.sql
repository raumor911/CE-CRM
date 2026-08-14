CREATE OR REPLACE FUNCTION public.confirm_rental_payment(
  p_payment_id UUID,
  p_rental_id UUID,
  p_expected_amount NUMERIC,
  p_receipt_url TEXT,
  p_notes TEXT,
  p_user_id UUID,
  p_period_label TEXT,
  p_payment_period TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Actualizar el pago
  UPDATE public.rental_payments
  SET 
    status = 'confirmed',
    confirmed_at = NOW(),
    confirmed_by = p_user_id,
    receipt_url = NULLIF(p_receipt_url, ''),
    notes = NULLIF(p_notes, ''),
    updated_at = NOW()
  WHERE id = p_payment_id
    AND status = 'pending_confirmation';

  -- Si no se actualizó nada (ya estaba confirmado o no existe), salimos
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pago ya fue confirmado o no existe.';
  END IF;

  -- 2. Actualizar el status legado en rentals
  UPDATE public.rentals
  SET 
    payment_status = 'current',
    updated_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_rental_id;

  -- 3. Registrar la actividad
  INSERT INTO public.rental_activities (
    rental_id,
    activity_type,
    description,
    previous_data,
    created_by
  ) VALUES (
    p_rental_id,
    'monthly_payment_confirmed',
    'Pago de ' || p_period_label || ' confirmado',
    jsonb_build_object(
      'payment_id', p_payment_id,
      'payment_period', p_payment_period,
      'expected_amount', p_expected_amount,
      'before', jsonb_build_object('status', 'pending_confirmation'),
      'after', jsonb_build_object('status', 'confirmed'),
      'receipt_url', NULLIF(p_receipt_url, '')
    ),
    p_user_id
  );
END;
$$;
