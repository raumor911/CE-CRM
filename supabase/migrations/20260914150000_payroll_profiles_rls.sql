-- Mantener RLS habilitado
ALTER TABLE public.fin_payroll_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_payroll_compensation_history ENABLE ROW LEVEL SECURITY;

-- Policies para fin_payroll_profiles
CREATE POLICY "Permitir select a usuarios autenticados en perfiles" 
ON public.fin_payroll_profiles 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir insert a usuarios autenticados en perfiles" 
ON public.fin_payroll_profiles 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir update a usuarios autenticados en perfiles" 
ON public.fin_payroll_profiles 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Policies para fin_payroll_compensation_history (necesario porque el alta de personal también inserta aquí)
CREATE POLICY "Permitir select a usuarios autenticados en historial" 
ON public.fin_payroll_compensation_history 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir insert a usuarios autenticados en historial" 
ON public.fin_payroll_compensation_history 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir update a usuarios autenticados en historial" 
ON public.fin_payroll_compensation_history 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);