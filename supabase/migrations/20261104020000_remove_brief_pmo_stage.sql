-- Conservar las tarjetas existentes de Brief y llevarlas a Necesidad.
-- Ejecutar en Supabase; no crea tablas ni duplica registros.
BEGIN;
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_pmo_stage_check;

UPDATE public.leads
SET pmo_stage = 'Necesidad'
WHERE pmo_stage = 'Brief';

ALTER TABLE public.leads
  ADD CONSTRAINT leads_pmo_stage_check
  CHECK (pmo_stage IN ('Necesidad', 'Diseño', 'Propuesta', 'Manufactura', 'Entrega'));
COMMIT;
