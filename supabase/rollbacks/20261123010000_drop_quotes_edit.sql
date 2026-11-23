-- Revierte 20261123010000_quotes_edit.sql. DESTRUCTIVO: borra el historial de versiones (quote_revisions).
-- Las cotizaciones y sus renglones NO se tocan (quedan con el contenido de su última edición).

BEGIN;

DROP FUNCTION IF EXISTS public.update_quote(UUID, TIMESTAMPTZ, JSONB, JSONB);
DROP TABLE IF EXISTS public.quote_revisions;
ALTER TABLE public.quotes DROP COLUMN IF EXISTS revision;

-- Vuelve al trigger original: todo lo que no es borrador queda congelado.
CREATE OR REPLACE FUNCTION public.quotes_guard_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status <> 'draft' AND
     (to_jsonb(NEW) - 'status' - 'updated_at' - 'sent_at' - 'accepted_at' - 'rejected_at')
       IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'sent_at' - 'accepted_at' - 'rejected_at') THEN
    RAISE EXCEPTION 'La cotización % ya no es borrador y no se puede modificar. Duplícala para crear una nueva.', OLD.folio;
  END IF;
  RETURN NEW;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
