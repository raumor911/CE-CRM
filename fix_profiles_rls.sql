ALTER TABLE public.fin_payroll_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir select a usuarios autenticados en perfiles') THEN
        CREATE POLICY "Permitir select a usuarios autenticados en perfiles" ON public.fin_payroll_profiles FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir insert a usuarios autenticados en perfiles') THEN
        CREATE POLICY "Permitir insert a usuarios autenticados en perfiles" ON public.fin_payroll_profiles FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir update a usuarios autenticados en perfiles') THEN
        CREATE POLICY "Permitir update a usuarios autenticados en perfiles" ON public.fin_payroll_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
