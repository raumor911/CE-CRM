-- Revierte 20261123020000_quotes_service_delete.sql: vuelve a impedir borrar servicios del catálogo.
BEGIN;
DROP POLICY IF EXISTS quote_sprices_delete ON public.quote_service_prices;
COMMIT;
NOTIFY pgrst, 'reload schema';
