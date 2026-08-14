-- Add the column as nullable first
ALTER TABLE public.rental_payments 
ADD COLUMN IF NOT EXISTS payment_due_date DATE;

-- Update existing rows by calculating the due date based on rentals.start_date
UPDATE public.rental_payments rp
SET payment_due_date = (
  SELECT 
    CASE 
      WHEN EXTRACT(DAY FROM r.start_date) > EXTRACT(DAY FROM (rp.payment_period + INTERVAL '1 month - 1 day')) THEN
        (rp.payment_period + INTERVAL '1 month - 1 day')::DATE
      ELSE
        (rp.payment_period + (EXTRACT(DAY FROM r.start_date) - 1 || ' days')::INTERVAL)::DATE
    END
  FROM public.rentals r
  WHERE r.id = rp.rental_id
)
WHERE rp.payment_due_date IS NULL;

-- Make it NOT NULL
ALTER TABLE public.rental_payments 
ALTER COLUMN payment_due_date SET NOT NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_rental_payments_due_date ON public.rental_payments(payment_due_date);
