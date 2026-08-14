-- Migración para la agenda mensual de cobranza
CREATE TABLE IF NOT EXISTS public.rental_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    rental_id UUID NOT NULL
        REFERENCES public.rentals(id)
        ON DELETE CASCADE,

    payment_period DATE NOT NULL,

    expected_amount NUMERIC NOT NULL
        CHECK (expected_amount >= 0),

    status TEXT NOT NULL
        DEFAULT 'pending_confirmation'
        CHECK (
            status IN (
                'pending_confirmation',
                'confirmed'
            )
        ),

    confirmed_at TIMESTAMPTZ,
    receipt_url TEXT,
    notes TEXT,

    created_by UUID,
    confirmed_by UUID,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT rental_payments_unique_period
        UNIQUE (rental_id, payment_period)
);

ALTER TABLE public.rental_payments
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rental payments"
ON public.rental_payments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert rental payments"
ON public.rental_payments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update rental payments"
ON public.rental_payments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
