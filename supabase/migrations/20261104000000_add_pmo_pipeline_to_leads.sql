-- Ejecutar en el SQL Editor de Supabase antes de usar Pipeline PMO.
-- Reutiliza public.leads y sus políticas RLS. No crea tablas ni duplica clientes.
BEGIN;
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS pmo_stage text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.leads'::regclass
      AND conname = 'leads_pmo_stage_check'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_pmo_stage_check
      CHECK (pmo_stage IN ('Brief', 'Necesidad', 'Diseño', 'Manufactura', 'Entrega'));
  END IF;
END $$;

COMMENT ON COLUMN public.leads.pmo_stage IS
  'Etapa de gestión PMO independiente de stage comercial. NULL = no incorporado a PMO.';
COMMIT;
