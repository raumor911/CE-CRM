import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLeadTimeline, formatTimelineDate, type LeadStageEvent } from '../src/lib/leadTimeline';

const transfer: LeadStageEvent = {
  id: 2, kind: 'transition', from_pipeline: 'Comercial', from_stage: 'Propuesta',
  to_pipeline: 'PMO', to_stage: 'Necesidad', actor_name: 'Usuario de prueba',
  created_at: '2026-11-12T16:42:00Z',
};

test('ordena actividades y traspasos; conserva el alta de mayo como evidencia parcial', () => {
  const rows = buildLeadTimeline([{
    id: 'note', lead_id: 'lead', user_id: 'actor', type: 'Nota', description: 'Actividad conservada',
    created_at: '2026-11-12T17:00:00Z',
  }], [transfer], '2026-05-12T13:00:00Z');
  assert.deepEqual(rows.map(row => row.type), ['Nota', 'Traspaso de pipeline', 'Fecha de alta registrada']);
  assert.match(rows[1].description, /Usuario de prueba.*Comercial: Propuesta.*PMO: Necesidad/);
  assert.match(formatTimelineDate(rows[1].created_at), /10:42/);
  assert.match(rows[2].description, /no están verificados/);
});

test('un alta auditada se muestra una vez y una importación se distingue de una creación', () => {
  const created: LeadStageEvent = {
    ...transfer, id: 1, kind: 'created', from_pipeline: null, from_stage: null,
    to_pipeline: 'Comercial', to_stage: 'Ingreso',
  };
  assert.deepEqual(buildLeadTimeline([], [created], created.created_at).map(row => row.type), ['Creación']);
  assert.deepEqual(buildLeadTimeline([], [{ ...created, kind: 'imported' }], '2026-05-12T13:00:00Z')
    .map(row => row.type), ['Importación', 'Fecha de alta registrada']);
});
