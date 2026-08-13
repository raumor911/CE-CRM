-- Create rentals table
CREATE TABLE IF NOT EXISTS public.rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    contact_name TEXT,
    contact_email TEXT,
    project_name TEXT,
    location TEXT,
    start_date DATE NOT NULL,
    contractual_end_date DATE,
    effective_end_date DATE,
    legacy_current_period TEXT,
    subtotal_monthly NUMERIC,
    tax_monthly NUMERIC,
    monthly_amount_total NUMERIC,
    return_freight_total NUMERIC,
    currency TEXT DEFAULT 'MXN',
    short_term_exception BOOLEAN DEFAULT false,
    short_term_reason TEXT,
    historical_missing_end_date BOOLEAN DEFAULT false,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'cancelled')),
    payment_status TEXT NOT NULL CHECK (payment_status IN ('current', 'pending_confirmation')),
    completion_reason TEXT,
    cancellation_reason TEXT,
    contract_reference_url TEXT,
    contract_reference_type TEXT,
    receipts_folder_url TEXT,
    notes TEXT,
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rental_items table
CREATE TABLE IF NOT EXISTS public.rental_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
    equipment_description TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    subtotal_monthly NUMERIC NOT NULL,
    tax_monthly NUMERIC NOT NULL,
    monthly_total NUMERIC NOT NULL,
    return_freight_cost NUMERIC,
    notes TEXT,
    source_row_number INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rental_activities table
CREATE TABLE IF NOT EXISTS public.rental_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    previous_data JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_activities ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
CREATE POLICY "Enable read access for authenticated users on rentals"
    ON public.rentals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users on rentals"
    ON public.rentals FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users on rentals"
    ON public.rentals FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users on rentals"
    ON public.rentals FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users on rental_items"
    ON public.rental_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users on rental_items"
    ON public.rental_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users on rental_items"
    ON public.rental_items FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete access for authenticated users on rental_items"
    ON public.rental_items FOR DELETE TO authenticated USING (true);

CREATE POLICY "Enable read access for authenticated users on rental_activities"
    ON public.rental_activities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users on rental_activities"
    ON public.rental_activities FOR INSERT TO authenticated WITH CHECK (true);
