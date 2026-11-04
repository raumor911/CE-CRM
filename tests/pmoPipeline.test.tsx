import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { PMOPipeline } from '../src/components/PMOPipeline';
import { Lead } from '../src/types';

const lead = (id: string, updates: Partial<Lead> = {}): Lead => ({
  id, project_name: `Proyecto ${id}`, lead_name: `Cliente ${id}`, stage: 'Propuesta',
  phone: '', category: 'Proyecto', last_activity: '2026-11-04T12:00:00Z',
  sentiment_label: 'Dudoso', main_image_url: '', ...updates,
});
const render = (leads: Lead[]) => renderToStaticMarkup(
  <PMOPipeline leads={leads} onUpdateLead={async () => null} onSelectLead={() => {}} />,
);

test('comercial y PMO conservan etapas independientes; solo proyectos incorporados tienen tarjeta', () => {
  const html = render([lead('comercial'), lead('manufactura', { pmo_stage: 'Manufactura' })]);
  assert.match(html, /1 de 1 proyectos/);
  assert.match(html, /value="comercial"/); // Disponible para incorporar.
  assert.doesNotMatch(html, /value="manufactura"/); // No permite duplicar incorporación.
  assert.equal((html.match(/<article/g) || []).length, 1);
  assert.match(html, /<h3[^>]*>Proyecto manufactura<\/h3>/);
  assert.doesNotMatch(html, /<h3[^>]*>Proyecto comercial<\/h3>/);
});

test('archivados quedan fuera de tarjetas y del selector de incorporación', () => {
  const html = render([lead('archivo', { is_archived: true, pmo_stage: 'Diseño' }), lead('archivoNuevo', { is_archived: true })]);
  assert.match(html, /0 de 0 proyectos/);
  assert.doesNotMatch(html, /Proyecto archivo/);
  assert.equal((html.match(/<article/g) || []).length, 0);
});

test('tablero vacío muestra las cinco etapas en el orden solicitado', () => {
  const html = render([]);
  const stages = [...html.matchAll(/<section[^>]*aria-label="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(stages, ['Necesidad', 'Diseño', 'Propuesta', 'Manufactura', 'Entrega']);
  assert.match(html, /disabled=""[^>]*>.*Incorporar a Necesidad/);
});

import { getCommercialLeads, transferLeadToPMO } from '../src/lib/pmoPipeline';

test('traslado actualiza el mismo UUID a Necesidad y deja una sola tarjeta en PMO', async () => {
  const source = lead('proyecto', { budget: 250000, category: '10 ft Modificado' });
  let calls = 0;
  const updated = await transferLeadToPMO(source, async (id, updates) => {
    calls++;
    assert.equal(id, source.id);
    assert.deepEqual(updates, { pmo_stage: 'Necesidad' });
    return { ...source, ...updates };
  });
  assert.equal(calls, 1);
  assert.equal(updated.stage, source.stage);
  assert.equal(updated.budget, source.budget);
  assert.equal(updated.last_activity, source.last_activity);
  assert.equal(getCommercialLeads([updated]).length, 0);
  const html = render([updated]);
  assert.equal((html.match(/<article/g) || []).length, 1);
  assert.match(html, /<option selected="">Necesidad<\/option>/);
});

test('si falla el guardado, el registro permanece comercial y se propaga el error', async () => {
  const source = lead('fallo');
  await assert.rejects(transferLeadToPMO(source, async () => null));
  await assert.rejects(transferLeadToPMO(source, async () => { throw new Error('offline'); }));
  assert.deepEqual(getCommercialLeads([source]), [source]);
  assert.equal(source.pmo_stage, undefined);
  assert.equal((render([source]).match(/<article/g) || []).length, 0);
});

test('trasladar un registro ya incorporado no duplica ni reinicia su avance', async () => {
  const source = lead('existente', { pmo_stage: 'Manufactura' });
  const updated = await transferLeadToPMO(source, async () => { assert.fail('No debe volver a guardar'); });
  assert.equal(updated.pmo_stage, 'Manufactura');
  assert.equal(getCommercialLeads([source]).length, 0);
});

test('Propuesta PMO muestra su tarjeta y permanece fuera del comercial', () => {
  const project = lead('propuesta-pmo', { stage: 'Ingreso', pmo_stage: 'Propuesta' });
  const html = render([project]);
  assert.equal((html.match(/<article/g) || []).length, 1);
  assert.match(html, /<option selected="">Propuesta<\/option>/);
  assert.deepEqual(getCommercialLeads([project]), []);
});

test('tarjetas heredadas en Brief siguen visibles en Necesidad mientras se aplica la migración', () => {
  const legacy = { ...lead('heredado'), pmo_stage: 'Brief' } as unknown as Lead;
  const html = render([legacy]);
  assert.equal((html.match(/<article/g) || []).length, 1);
  assert.match(html, /<option selected="">Necesidad<\/option>/);
  assert.doesNotMatch(html, /aria-label="Brief"/);
  assert.deepEqual(getCommercialLeads([legacy]), []);
});
