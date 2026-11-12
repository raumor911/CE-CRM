BEGIN;

CREATE TABLE public.lead_stage_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('created', 'imported', 'transition')),
  from_pipeline text CHECK (from_pipeline IN ('Comercial', 'PMO')),
  from_stage text,
  to_pipeline text NOT NULL CHECK (to_pipeline IN ('Comercial', 'PMO')),
  to_stage text NOT NULL,
  actor_id uuid NOT NULL,
  actor_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (kind = 'transition' AND from_pipeline IS NOT NULL AND from_stage IS NOT NULL
      AND (from_pipeline, from_stage) IS DISTINCT FROM (to_pipeline, to_stage))
    OR (kind IN ('created', 'imported') AND from_pipeline IS NULL AND from_stage IS NULL)
  )
);

CREATE INDEX lead_stage_events_timeline_idx
  ON public.lead_stage_events (lead_id, created_at DESC, id DESC);
ALTER TABLE public.lead_stage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lead_stage_events FROM anon, authenticated;
GRANT SELECT, INSERT ON public.lead_stage_events TO authenticated;

CREATE POLICY lead_stage_events_read ON public.lead_stage_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id)
  );
CREATE POLICY lead_stage_events_append ON public.lead_stage_events
  FOR INSERT TO authenticated WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id)
  );

-- SECURITY INVOKER: existing permissions and RLS on leads still apply.
CREATE FUNCTION public.create_leads_with_timeline(p_leads jsonb, p_import boolean DEFAULT false)
RETURNS SETOF public.leads LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_input public.leads%ROWTYPE;
  v_lead public.leads%ROWTYPE;
  v_actor uuid := auth.uid();
  v_name text := coalesce(nullif(btrim(auth.jwt()->'user_metadata'->>'full_name'), ''),
    nullif(split_part(auth.jwt()->>'email', '@', 1), ''), 'Usuario');
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Se requiere una sesión autenticada'; END IF;
  FOR v_input IN SELECT * FROM jsonb_populate_recordset(NULL::public.leads, p_leads)
  LOOP
    INSERT INTO public.leads (
      project_name, lead_name, email, phone, budget, category, stage, last_activity,
      sentiment_label, main_image_url, checklist_briefing, ai_notes, created_at, user_id
    ) VALUES (
      v_input.project_name, v_input.lead_name, v_input.email, v_input.phone,
      v_input.budget, v_input.category, v_input.stage, v_input.last_activity,
      v_input.sentiment_label, v_input.main_image_url,
      coalesce(v_input.checklist_briefing, '{"m2":false,"deadlines":false}'),
      v_input.ai_notes, coalesce(CASE WHEN p_import THEN v_input.created_at END, now()), v_actor
    ) RETURNING * INTO v_lead;

    INSERT INTO public.lead_stage_events
      (lead_id, kind, to_pipeline, to_stage, actor_id, actor_name, created_at)
    VALUES (v_lead.id, CASE WHEN p_import THEN 'imported' ELSE 'created' END,
      'Comercial', v_lead.stage, v_actor, v_name,
      CASE WHEN p_import THEN clock_timestamp() ELSE v_lead.created_at END);
    RETURN NEXT v_lead;
  END LOOP;
END;
$$;

CREATE FUNCTION public.move_lead_with_timeline(p_id uuid, p_updates jsonb)
RETURNS public.leads LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_before public.leads%ROWTYPE;
  v_after public.leads%ROWTYPE;
  v_next public.leads%ROWTYPE;
  v_actor uuid := auth.uid();
  v_name text := coalesce(nullif(btrim(auth.jwt()->'user_metadata'->>'full_name'), ''),
    nullif(split_part(auth.jwt()->>'email', '@', 1), ''), 'Usuario');
  v_from_pipeline text;
  v_to_pipeline text;
  v_from_stage text;
  v_to_stage text;
  v_assignments text;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'Se requiere una sesión autenticada'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_updates) AS k(key)
    WHERE k.key NOT IN ('stage', 'pmo_stage', 'payment_confirmed', 'contract_signed_at',
      'monto_anticipo_real', 'last_activity')
  ) THEN RAISE EXCEPTION 'El movimiento contiene campos no permitidos'; END IF;

  SELECT * INTO STRICT v_before FROM public.leads WHERE id = p_id FOR UPDATE;
  v_next := jsonb_populate_record(v_before, p_updates);
  IF v_next.stage IS NULL OR v_next.stage NOT IN ('Ingreso', 'Briefing', 'Propuesta', 'Cierre')
  THEN RAISE EXCEPTION 'Etapa comercial inválida'; END IF;

  IF to_jsonb(v_next) = to_jsonb(v_before) THEN RETURN v_before; END IF;

  SELECT string_agg(format('%I = ($1).%I', k.key, k.key), ', ' ORDER BY k.key)
  INTO v_assignments FROM jsonb_object_keys(p_updates) AS k(key)
  WHERE (to_jsonb(v_next)->k.key) IS DISTINCT FROM (to_jsonb(v_before)->k.key);

  EXECUTE format('UPDATE public.leads SET %s WHERE id = $2 RETURNING *', v_assignments)
  INTO STRICT v_after USING v_next, p_id;

  v_from_pipeline := CASE WHEN v_before.pmo_stage IS NULL THEN 'Comercial' ELSE 'PMO' END;
  v_to_pipeline := CASE WHEN v_after.pmo_stage IS NULL THEN 'Comercial' ELSE 'PMO' END;
  v_from_stage := coalesce(v_before.pmo_stage, v_before.stage::text);
  v_to_stage := coalesce(v_after.pmo_stage, v_after.stage::text);
  IF (v_from_pipeline, v_from_stage) IS DISTINCT FROM (v_to_pipeline, v_to_stage) THEN
    INSERT INTO public.lead_stage_events
      (lead_id, kind, from_pipeline, from_stage, to_pipeline, to_stage, actor_id, actor_name)
    VALUES (p_id, 'transition', v_from_pipeline, v_from_stage, v_to_pipeline, v_to_stage, v_actor, v_name);
  END IF;
  -- A financial close from PMO can advance the commercial stage independently.
  IF v_before.pmo_stage IS NOT NULL AND v_after.pmo_stage IS NOT NULL
     AND v_before.stage IS DISTINCT FROM v_after.stage THEN
    INSERT INTO public.lead_stage_events
      (lead_id, kind, from_pipeline, from_stage, to_pipeline, to_stage, actor_id, actor_name)
    VALUES (p_id, 'transition', 'Comercial', v_before.stage, 'Comercial', v_after.stage, v_actor, v_name);
  END IF;
  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.create_leads_with_timeline(jsonb, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.move_lead_with_timeline(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_leads_with_timeline(jsonb, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_lead_with_timeline(uuid, jsonb) TO authenticated;

COMMIT;
