-- Módulo de cotizaciones (venta y renta de contenedores).
-- Migración SOLO ADITIVA: crea tablas y funciones nuevas; no modifica leads, rentals ni inventory_products.
-- Reversión: supabase/rollbacks/20261123000000_drop_quotes_module.sql
-- Activación y decisiones abiertas: docs/cotizaciones.md

BEGIN;

/* ───────────────────────── Catálogos ───────────────────────── */

CREATE TABLE IF NOT EXISTS public.quote_exchange_rates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate        NUMERIC(12,4) NOT NULL CHECK (rate > 0),   -- MXN por 1 USD
    note        TEXT,
    created_by  UUID DEFAULT auth.uid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quote_container_prices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT NOT NULL,
    mode           TEXT NOT NULL CHECK (mode IN ('sale', 'rental')),
    product_type   TEXT NOT NULL CHECK (product_type IN ('Oficina', '20 DC', '40 DC', '40 HC')),
    condition      TEXT NOT NULL CHECK (condition IN ('Nuevo', 'Usado')),
    price          NUMERIC(14,2) NOT NULL CHECK (price >= 0),  -- venta: precio unitario; renta: precio por mes
    currency       TEXT NOT NULL CHECK (currency IN ('USD', 'MXN')),
    length_m       NUMERIC(6,2),
    width_m        NUMERIC(6,2),
    height_m       NUMERIC(6,2),
    capacity_m3    NUMERIC(8,2),
    weight_kg      NUMERIC(10,2),
    max_weight_kg  NUMERIC(10,2),
    description    TEXT,
    photo_url      TEXT,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by     UUID,
    UNIQUE (name, mode)
);

CREATE TABLE IF NOT EXISTS public.quote_service_prices (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind                TEXT NOT NULL CHECK (kind IN ('delivery', 'loading', 'unloading', 'other')),
    name                TEXT NOT NULL,
    detail              TEXT,
    default_unit_price  NUMERIC(14,2) NOT NULL CHECK (default_unit_price >= 0),  -- MXN sin IVA
    applies_to          TEXT NOT NULL CHECK (applies_to IN ('sale', 'rental', 'both')),
    sort_order          INT NOT NULL DEFAULT 0,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, applies_to)
);

CREATE TABLE IF NOT EXISTS public.quote_folio_series (
    quote_type   TEXT PRIMARY KEY CHECK (quote_type IN ('sale', 'rental')),
    prefix       TEXT NOT NULL DEFAULT '',
    pad          INT  NOT NULL DEFAULT 4 CHECK (pad BETWEEN 1 AND 12),
    last_number  BIGINT NOT NULL DEFAULT 0 CHECK (last_number >= 0)
);

/* ───────────────────────── Cotizaciones ───────────────────────── */

CREATE TABLE IF NOT EXISTS public.quotes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio               TEXT NOT NULL UNIQUE,
    quote_type          TEXT NOT NULL CHECK (quote_type IN ('sale', 'rental')),
    status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'cancelled')),
    lead_id             UUID NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,

    -- Foto fija de los datos del cliente al cotizar: si el lead cambia después, la cotización no.
    customer_name       TEXT NOT NULL,
    customer_company    TEXT,
    customer_rfc        TEXT,
    customer_phone      TEXT,
    customer_email      TEXT,
    delivery_location   TEXT,

    issued_on           DATE NOT NULL,
    validity_days       INT  NOT NULL CHECK (validity_days > 0),
    valid_until         DATE NOT NULL,

    currency            TEXT NOT NULL DEFAULT 'MXN' CHECK (currency = 'MXN'),
    exchange_rate       NUMERIC(12,4) CHECK (exchange_rate IS NULL OR exchange_rate > 0),
    tax_rate            NUMERIC(5,4)  NOT NULL CHECK (tax_rate >= 0 AND tax_rate < 1),
    subtotal            NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
    tax_total           NUMERIC(14,2) NOT NULL CHECK (tax_total >= 0),
    total               NUMERIC(14,2) NOT NULL CHECK (total >= 0),
    security_deposit    NUMERIC(14,2) CHECK (security_deposit IS NULL OR security_deposit >= 0),
    total_with_deposit  NUMERIC(14,2),
    down_payment_pct    NUMERIC(5,2)  CHECK (down_payment_pct IS NULL OR (down_payment_pct >= 0 AND down_payment_pct <= 100)),

    terms               TEXT[] NOT NULL DEFAULT '{}',
    required_documents  TEXT,
    seller_name         TEXT NOT NULL,
    seller_phone        TEXT,
    seller_whatsapp     TEXT,
    seller_email        TEXT,
    notes               TEXT,

    created_by          UUID DEFAULT auth.uid(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at             TIMESTAMPTZ,
    accepted_at         TIMESTAMPTZ,
    rejected_at         TIMESTAMPTZ,

    CONSTRAINT quotes_total_consistent CHECK (total = subtotal + tax_total),
    CONSTRAINT quotes_rental_only_fields CHECK (
        quote_type = 'rental' OR (security_deposit IS NULL AND total_with_deposit IS NULL)
    ),
    CONSTRAINT quotes_sale_only_fields CHECK (quote_type = 'sale' OR down_payment_pct IS NULL),
    CONSTRAINT quotes_deposit_consistent CHECK (
        (security_deposit IS NULL AND total_with_deposit IS NULL)
        OR total_with_deposit = total + security_deposit
    )
);

CREATE INDEX IF NOT EXISTS quotes_lead_id_idx ON public.quotes (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotes_status_idx  ON public.quotes (status);

CREATE TABLE IF NOT EXISTS public.quote_items (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id         UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    position         INT  NOT NULL CHECK (position > 0),
    kind             TEXT NOT NULL CHECK (kind IN ('container', 'delivery', 'loading', 'unloading', 'other')),
    description      TEXT NOT NULL,
    detail           TEXT,
    quantity         INT  NOT NULL CHECK (quantity > 0),
    unit_price       NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),   -- MXN sin IVA
    unit_price_usd   NUMERIC(14,2),                                    -- referencia si el precio de lista era USD
    line_subtotal    NUMERIC(14,2) NOT NULL,
    specs            JSONB,
    photo_url        TEXT,
    UNIQUE (quote_id, position),
    CONSTRAINT quote_items_line_consistent CHECK (line_subtotal = ROUND(quantity * unit_price, 2))
);

CREATE TABLE IF NOT EXISTS public.quote_events (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quote_id     UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    from_status  TEXT,
    to_status    TEXT NOT NULL,
    actor_id     UUID DEFAULT auth.uid(),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

/* ───────────────────────── Seguridad (RLS) ─────────────────────────
   Mismo criterio que el módulo de rentas: cualquier usuario autenticado. Esto NO aísla por usuario ni por rol;
   ver "Preguntas abiertas" en docs/cotizaciones.md. Las cotizaciones no se borran: se cancelan. */

ALTER TABLE public.quote_exchange_rates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_container_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_service_prices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_folio_series    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_events          ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Catálogos: leer, crear y editar (el tipo de cambio es un historial: solo se agregan filas).
  CREATE POLICY quote_rates_select ON public.quote_exchange_rates FOR SELECT TO authenticated USING (true);
  CREATE POLICY quote_rates_insert ON public.quote_exchange_rates FOR INSERT TO authenticated WITH CHECK (true);

  CREATE POLICY quote_cprices_select ON public.quote_container_prices FOR SELECT TO authenticated USING (true);
  CREATE POLICY quote_cprices_insert ON public.quote_container_prices FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY quote_cprices_update ON public.quote_container_prices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  CREATE POLICY quote_sprices_select ON public.quote_service_prices FOR SELECT TO authenticated USING (true);
  CREATE POLICY quote_sprices_insert ON public.quote_service_prices FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY quote_sprices_update ON public.quote_service_prices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  -- Series de folio: solo lectura directa; el contador se mueve únicamente con las funciones de abajo.
  CREATE POLICY quote_series_select ON public.quote_folio_series FOR SELECT TO authenticated USING (true);

  -- Cotizaciones: leer, crear y actualizar (el trigger de abajo congela lo ya enviado).
  CREATE POLICY quotes_select ON public.quotes FOR SELECT TO authenticated USING (true);
  CREATE POLICY quotes_insert ON public.quotes FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY quotes_update ON public.quotes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  -- Renglones: solo se agregan mientras la cotización es borrador; nunca se editan ni se borran.
  CREATE POLICY quote_items_select ON public.quote_items FOR SELECT TO authenticated USING (true);
  CREATE POLICY quote_items_insert ON public.quote_items FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.status = 'draft'));

  CREATE POLICY quote_events_select ON public.quote_events FOR SELECT TO authenticated USING (true);
  CREATE POLICY quote_events_insert ON public.quote_events FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL; -- migración repetible
END $$;

/* ───────────────────────── Congelar lo enviado ───────────────────────── */

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

DROP TRIGGER IF EXISTS quotes_guard_update ON public.quotes;
CREATE TRIGGER quotes_guard_update BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.quotes_guard_update();

/* ───────────────────────── Folios (atómicos) ─────────────────────────
   SECURITY DEFINER a propósito: el contador no es editable directamente por los usuarios. */

CREATE OR REPLACE FUNCTION public.next_quote_folio(p_quote_type TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.quote_folio_series;
BEGIN
  UPDATE public.quote_folio_series
     SET last_number = last_number + 1
   WHERE quote_type = p_quote_type
   RETURNING * INTO s;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe una serie de folios para el tipo %.', p_quote_type;
  END IF;
  RETURN s.prefix || LPAD(s.last_number::TEXT, s.pad, '0');
END $$;

CREATE OR REPLACE FUNCTION public.set_quote_folio_next(p_quote_type TEXT, p_next_number BIGINT)
RETURNS public.quote_folio_series
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  s public.quote_folio_series;
BEGIN
  SELECT * INTO s FROM public.quote_folio_series WHERE quote_type = p_quote_type FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe una serie de folios para el tipo %.', p_quote_type;
  END IF;
  IF p_next_number - 1 < s.last_number THEN
    RAISE EXCEPTION 'El siguiente folio no puede ser menor al último emitido (%).', s.last_number;
  END IF;
  UPDATE public.quote_folio_series SET last_number = p_next_number - 1
   WHERE quote_type = p_quote_type RETURNING * INTO s;
  RETURN s;
END $$;

REVOKE ALL ON FUNCTION public.next_quote_folio(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_quote_folio_next(TEXT, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_quote_folio(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_quote_folio_next(TEXT, BIGINT) TO authenticated;

/* ───────────────────────── Crear cotización ─────────────────────────
   Los totales los calcula el servidor: lo que mande el navegador para dinero se ignora. */

CREATE OR REPLACE FUNCTION public.create_quote(p_quote JSONB, p_items JSONB) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_type      TEXT := p_quote->>'quote_type';
  v_rate      NUMERIC := (p_quote->>'tax_rate')::NUMERIC;
  v_issued    DATE := (p_quote->>'issued_on')::DATE;
  v_days      INT := (p_quote->>'validity_days')::INT;
  v_subtotal  NUMERIC;
  v_tax       NUMERIC;
  v_total     NUMERIC;
  v_deposit   NUMERIC;
  v_id        UUID;
BEGIN
  IF v_type NOT IN ('sale', 'rental') THEN
    RAISE EXCEPTION 'Tipo de cotización inválido.';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'La cotización necesita al menos un renglón.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) i WHERE i->>'kind' = 'container') THEN
    RAISE EXCEPTION 'La cotización necesita al menos un contenedor.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) i
              WHERE COALESCE((i->>'quantity')::INT, 0) <= 0 OR COALESCE((i->>'unit_price')::NUMERIC, -1) < 0) THEN
    RAISE EXCEPTION 'Hay renglones con cantidad o precio inválidos.';
  END IF;
  IF v_days IS NULL OR v_days <= 0 THEN
    RAISE EXCEPTION 'La vigencia debe ser de al menos un día.';
  END IF;

  SELECT COALESCE(SUM(ROUND((i->>'quantity')::INT * (i->>'unit_price')::NUMERIC, 2)), 0)
    INTO v_subtotal FROM jsonb_array_elements(p_items) i;
  v_tax   := ROUND(v_subtotal * v_rate, 2);
  v_total := v_subtotal + v_tax;
  v_deposit := CASE WHEN v_type = 'rental' THEN COALESCE((p_quote->>'security_deposit')::NUMERIC, 0) END;

  INSERT INTO public.quotes (
    folio, quote_type, lead_id, customer_name, customer_company, customer_rfc, customer_phone, customer_email,
    delivery_location, issued_on, validity_days, valid_until, exchange_rate, tax_rate,
    subtotal, tax_total, total, security_deposit, total_with_deposit, down_payment_pct,
    terms, required_documents, seller_name, seller_phone, seller_whatsapp, seller_email, notes
  ) VALUES (
    public.next_quote_folio(v_type), v_type, (p_quote->>'lead_id')::UUID,
    p_quote->>'customer_name', p_quote->>'customer_company', p_quote->>'customer_rfc',
    p_quote->>'customer_phone', p_quote->>'customer_email', p_quote->>'delivery_location',
    v_issued, v_days, v_issued + v_days, (p_quote->>'exchange_rate')::NUMERIC, v_rate,
    v_subtotal, v_tax, v_total, v_deposit, CASE WHEN v_deposit IS NOT NULL THEN v_total + v_deposit END,
    CASE WHEN v_type = 'sale' THEN (p_quote->>'down_payment_pct')::NUMERIC END,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_quote->'terms', '[]'::JSONB))), '{}'),
    p_quote->>'required_documents', p_quote->>'seller_name', p_quote->>'seller_phone',
    p_quote->>'seller_whatsapp', p_quote->>'seller_email', p_quote->>'notes'
  ) RETURNING id INTO v_id;

  INSERT INTO public.quote_items (
    quote_id, position, kind, description, detail, quantity, unit_price, unit_price_usd, line_subtotal, specs, photo_url
  )
  SELECT v_id, ord, i->>'kind', i->>'description', NULLIF(i->>'detail', ''),
         (i->>'quantity')::INT, (i->>'unit_price')::NUMERIC, (i->>'unit_price_usd')::NUMERIC,
         ROUND((i->>'quantity')::INT * (i->>'unit_price')::NUMERIC, 2),
         CASE WHEN jsonb_typeof(i->'specs') = 'object' THEN i->'specs' END, NULLIF(i->>'photo_url', '')
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(i, ord);

  INSERT INTO public.quote_events (quote_id, from_status, to_status) VALUES (v_id, NULL, 'draft');
  RETURN v_id;
END $$;

/* ───────────────────────── Cambiar estado ─────────────────────────
   Bloqueo optimista: si alguien más la modificó, falla en vez de pisar el cambio. */

CREATE OR REPLACE FUNCTION public.transition_quote(p_id UUID, p_expected_updated_at TIMESTAMPTZ, p_to_status TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  q public.quotes;
  v_ok BOOLEAN;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cotización no encontrada.';
  END IF;
  IF q.updated_at <> p_expected_updated_at THEN
    RAISE EXCEPTION 'La cotización cambió mientras la editabas. Recarga e intenta de nuevo.';
  END IF;
  v_ok := CASE q.status
            WHEN 'draft' THEN p_to_status IN ('sent', 'cancelled')
            WHEN 'sent'  THEN p_to_status IN ('accepted', 'rejected', 'cancelled')
            ELSE FALSE
          END;
  IF NOT v_ok THEN
    RAISE EXCEPTION 'No se puede pasar una cotización de % a %.', q.status, p_to_status;
  END IF;

  UPDATE public.quotes SET
    status = p_to_status,
    updated_at = NOW(),
    sent_at     = CASE WHEN p_to_status = 'sent'     THEN NOW() ELSE sent_at END,
    accepted_at = CASE WHEN p_to_status = 'accepted' THEN NOW() ELSE accepted_at END,
    rejected_at = CASE WHEN p_to_status = 'rejected' THEN NOW() ELSE rejected_at END
  WHERE id = p_id;

  INSERT INTO public.quote_events (quote_id, from_status, to_status) VALUES (p_id, q.status, p_to_status);
END $$;

-- Solo usuarios con sesión pueden ejecutar estas funciones (por defecto Postgres las abre a PUBLIC).
REVOKE ALL ON FUNCTION public.create_quote(JSONB, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_quote(UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quote(JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_quote(UUID, TIMESTAMPTZ, TEXT) TO authenticated;

/* ───────────────────────── Valores iniciales ─────────────────────────
   Salen de las cotizaciones de ejemplo (venta 21788 y renta ED0079). Se ajustan en la vista "Precios".
   Los folios continúan desde esos números: el siguiente será 21789 (venta) y ED0080 (renta). */

INSERT INTO public.quote_folio_series (quote_type, prefix, pad, last_number) VALUES
  ('sale',   '',   5, 21788),
  ('rental', 'ED', 4, 79)
ON CONFLICT (quote_type) DO NOTHING;

INSERT INTO public.quote_exchange_rates (rate, note)
SELECT 19.45, 'Valor inicial tomado de las cotizaciones vigentes'
WHERE NOT EXISTS (SELECT 1 FROM public.quote_exchange_rates);

INSERT INTO public.quote_container_prices
  (name, mode, product_type, condition, price, currency, length_m, width_m, height_m, capacity_m3, weight_kg, max_weight_kg, description, photo_url)
VALUES
  ('20 DC usado',          'sale',   '20 DC', 'Usado', 2500, 'USD', 6, 2.4, 2.5,  33.30, 2250, 28240, 'Acero, doble cerrojo de seguridad', '/media/containers/20dc-usado.jpg'),
  ('20 DC estándar usado', 'rental', '20 DC', 'Usado', 4500, 'MXN', 6, 2.4, 2.59, 33.30, 2250, 28240, 'Acero, doble cerrojo de seguridad', '/media/containers/20dc-estandar.jpg')
ON CONFLICT (name, mode) DO NOTHING;

INSERT INTO public.quote_service_prices (kind, name, detail, default_unit_price, applies_to, sort_order) VALUES
  ('delivery',  'Logística de entrega',            NULL,                                           9500, 'sale',   1),
  ('delivery',  'Logística de entrega y regreso',  'Descarga y carga en sitio con rampa hidráulica', 4500, 'rental', 2),
  ('loading',   'Maniobras de carga al camión',    NULL,                                           1600, 'sale',   3),
  ('loading',   'Maniobras de carga al camión',    NULL,                                           1400, 'rental', 4),
  ('unloading', 'Maniobras de descarga en sitio',  'Sencilla, a piso con rampa hidráulica',           0, 'sale',   5)
ON CONFLICT (name, applies_to) DO NOTHING;

COMMIT;

-- Pide a la API de Supabase que reconozca las tablas y funciones nuevas sin esperar.
NOTIFY pgrst, 'reload schema';
