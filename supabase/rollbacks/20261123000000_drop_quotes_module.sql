-- Reversión del módulo de cotizaciones (20261123000000_create_quotes_module.sql).
-- ⚠ DESTRUCTIVA: borra cotizaciones, renglones, historial, catálogo de precios, tipo de cambio y folios.
-- Ejecútala SOLO si las tablas están vacías o contienen únicamente datos de prueba.
-- Si ya hay cotizaciones reales, NO la corras: basta con volver a la versión anterior de la app,
-- porque el módulo es aditivo y no afecta leads, rentals ni inventory_products.

BEGIN;

DROP FUNCTION IF EXISTS public.transition_quote(UUID, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS public.create_quote(JSONB, JSONB);
DROP FUNCTION IF EXISTS public.set_quote_folio_next(TEXT, BIGINT);
DROP FUNCTION IF EXISTS public.next_quote_folio(TEXT);

DROP TABLE IF EXISTS public.quote_events;
DROP TABLE IF EXISTS public.quote_items;
DROP TABLE IF EXISTS public.quotes;           -- elimina también el trigger quotes_guard_update
DROP FUNCTION IF EXISTS public.quotes_guard_update();
DROP TABLE IF EXISTS public.quote_folio_series;
DROP TABLE IF EXISTS public.quote_service_prices;
DROP TABLE IF EXISTS public.quote_container_prices;
DROP TABLE IF EXISTS public.quote_exchange_rates;

COMMIT;
