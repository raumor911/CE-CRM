-- Baja de servicios del catálogo de cotizaciones (flete, maniobras, etc.).
-- Es seguro: quote_items guarda su propia copia de la descripción y el precio, sin llave foránea al catálogo,
-- así que borrar un servicio no altera ninguna cotización ya emitida.
-- Reversión: supabase/rollbacks/20261123020000_drop_quotes_service_delete.sql

BEGIN;

DO $$
BEGIN
  CREATE POLICY quote_sprices_delete ON public.quote_service_prices FOR DELETE TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL; -- migración repetible
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
