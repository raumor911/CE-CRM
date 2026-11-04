import React, { useRef, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { GripVertical, Search, Plus, Loader2 } from 'lucide-react';
import { Lead, PMOStage, PMO_STAGES } from '../types';
import { cn } from '../lib/utils';

interface PMOPipelineProps {
  leads: Lead[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<Lead | null | undefined>;
  onSelectLead: (lead: Lead) => void;
}

const stageColors = ['bg-blue-500', 'bg-amber-500', 'bg-indigo-500', 'bg-orange-500', 'bg-violet-500', 'bg-emerald-500'];

const ProjectCard: React.FC<{
  lead: Lead;
  busy: boolean;
  onSelect: (lead: Lead) => void;
  onMove: (id: string, stage: PMOStage) => void;
}> = ({ lead, busy, onSelect, onMove }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, disabled: busy });
  return (
    <article ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }}
      className={cn('bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative', isDragging && 'z-30 opacity-80 shadow-xl')}>
      <div className="flex gap-2 items-start">
        <button type="button" disabled={busy} {...listeners} {...attributes} aria-label={`Arrastrar ${lead.project_name}`}
          className="text-slate-400 touch-none cursor-grab p-1 rounded focus-visible:ring-2 focus-visible:ring-indigo-500">
          <GripVertical size={16} />
        </button>
        <button type="button" onClick={() => onSelect(lead)} className="text-left min-w-0 rounded focus-visible:ring-2 focus-visible:ring-indigo-500">
          <h3 className="font-bold text-sm text-slate-900 break-words">{lead.project_name}</h3>
          <p className="text-xs text-slate-500 mt-1 break-words">{lead.lead_name}</p>
        </button>
      </div>
      <p className="text-[11px] text-slate-500 mt-3">{lead.category}</p>
      <label className="block text-xs text-slate-600 mt-4">
        Etapa PMO
        <select value={lead.pmo_stage ?? ''} disabled={busy} onChange={event => onMove(lead.id, event.target.value as PMOStage)}
          className="block w-full mt-1 rounded-lg border border-slate-200 p-2 bg-white text-sm disabled:opacity-50">
          {PMO_STAGES.map(stage => <option key={stage}>{stage}</option>)}
        </select>
      </label>
    </article>
  );
}

const ProjectColumn: React.FC<{ stage: PMOStage; index: number; children: React.ReactNode; count: number }> = ({ stage, index, children, count }) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section ref={setNodeRef} aria-label={stage} className={cn('min-w-0 w-full md:w-72 md:shrink-0 rounded-xl border p-3 min-h-48 md:min-h-[500px]', isOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-100/50')}>
      <h2 className="flex items-center gap-2 text-xs font-black uppercase text-slate-600 mb-4">
        <span className={cn('w-2 h-2 rounded-full', stageColors[index])} />{stage}
        <span className="ml-auto bg-white border border-slate-200 rounded-full px-2 py-0.5">{count}</span>
      </h2>
      <div className="space-y-3">{children}</div>
      {count === 0 && <p className="text-xs text-slate-400 text-center py-8">Sin proyectos en esta etapa.</p>}
    </section>
  );
}

export function PMOPipeline({ leads, onUpdateLead, onSelectLead }: PMOPipelineProps) {
  const [query, setQuery] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );
  const activeLeads = leads.filter(lead => !lead.is_archived);
  const projects = activeLeads.filter(lead => lead.pmo_stage && PMO_STAGES.includes(lead.pmo_stage));
  const candidates = activeLeads.filter(lead => !lead.pmo_stage);
  const normalizedQuery = query.trim().toLocaleLowerCase('es');
  const visibleProjects = projects.filter(lead => `${lead.project_name} ${lead.lead_name}`.toLocaleLowerCase('es').includes(normalizedQuery));

  const saveStage = async (id: string, stage: PMOStage) => {
    if (saving.current || !PMO_STAGES.includes(stage)) return;
    const lead = activeLeads.find(item => item.id === id);
    if (!lead || lead.pmo_stage === stage) return;
    saving.current = true;
    setBusy(true);
    setNotice(null);
    try {
      // PMO uses its own stage: commercial progress and activity dates are preserved.
      const updated = await onUpdateLead(id, { pmo_stage: stage });
      if (!updated) throw new Error('No se confirmó el cambio.');
      setCandidateId('');
      setNotice({ text: `Proyecto guardado en ${stage}.`, error: false });
    } catch {
      setNotice({ text: 'No se pudo guardar la etapa PMO. Revisa la conexión y confirma que el SQL de PMO esté aplicado.', error: true });
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && projects.some(lead => lead.id === active.id) && PMO_STAGES.includes(over.id as PMOStage)) {
      void saveStage(String(active.id), over.id as PMOStage);
    }
  };

  return (
    <div className="p-0 md:p-6 py-4">
      <h1 className="md:hidden text-xl font-black text-slate-900 mb-2">Pipeline PMO</h1>
      <p className="text-sm text-slate-500 mb-5">Gestiona tus proyectos desde el brief hasta la entrega.</p>
      <form onSubmit={event => { event.preventDefault(); void saveStage(candidateId, 'Brief'); }} className="flex flex-col sm:flex-row sm:items-end gap-3 mb-5">
        <label className="flex-1 text-xs font-bold text-slate-600" htmlFor="pmo-project">Incorporar proyecto existente
          <select id="pmo-project" value={candidateId} onChange={event => setCandidateId(event.target.value)} disabled={busy}
            className="block mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal">
            <option value="">Selecciona un proyecto o cliente</option>
            {candidates.map(lead => <option key={lead.id} value={lead.id}>{lead.project_name} — {lead.lead_name}</option>)}
          </select>
        </label>
        <button type="submit" disabled={!candidateId || busy} className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg px-4 py-3 text-sm font-bold disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Incorporar a Brief
        </button>
      </form>
      {notice && <p role={notice.error ? 'alert' : 'status'} className={cn('p-3 rounded-lg text-sm mb-4', notice.error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>{notice.text}</p>}
      <label className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 mb-5">
        <Search size={16} className="text-slate-400" />
        <input type="search" aria-label="Buscar proyectos PMO" placeholder="Buscar proyecto o cliente" value={query} onChange={event => setQuery(event.target.value)} className="py-3 w-full bg-transparent text-sm outline-none" />
      </label>
      <p className="text-xs text-slate-500 mb-4" aria-live="polite">{visibleProjects.length} de {projects.length} proyectos · Arrastra una tarjeta o cambia su etapa desde el selector.</p>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex flex-col md:flex-row gap-4 md:overflow-x-auto pb-6" aria-busy={busy}>
          {PMO_STAGES.map((stage, index) => {
            const stageProjects = visibleProjects.filter(lead => lead.pmo_stage === stage);
            return <ProjectColumn key={stage} stage={stage} index={index} count={stageProjects.length}>
              {stageProjects.map(lead => <ProjectCard key={lead.id} lead={lead} busy={busy} onSelect={onSelectLead} onMove={saveStage} />)}
            </ProjectColumn>;
          })}
        </div>
      </DndContext>
    </div>
  );
}
