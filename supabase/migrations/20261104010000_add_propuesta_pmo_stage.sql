-- Ampliar las etapas permitidas de PMO sin modificar registros.
BEGIN;
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_pmo_stage_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_pmo_stage_check
  CHECK (pmo_stage IN ('Brief', 'Necesidad', 'Diseño', 'Propuesta', 'Manufactura', 'Entrega'));
COMMIT;
