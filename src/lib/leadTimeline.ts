import type { LeadActivity } from '../types';

export interface LeadStageEvent {
  id: number;
  kind: 'created' | 'imported' | 'transition';
  from_pipeline: 'Comercial' | 'PMO' | null;
  from_stage: string | null;
  to_pipeline: 'Comercial' | 'PMO';
  to_stage: string;
  actor_name: string;
  created_at: string;
}

const formatter = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City', day: 'numeric', month: 'short',
  year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function buildLeadTimeline(activities: LeadActivity[], events: LeadStageEvent[], createdAt?: string) {
  const entries = [
    ...activities.map(item => ({ ...item, id: `activity:${item.id}`, exactDate: false })),
    ...events.map(event => {
      const transfer = event.kind === 'transition' && event.from_pipeline !== event.to_pipeline;
      const type = event.kind === 'created' ? 'Creación' : event.kind === 'imported' ? 'Importación' :
        transfer ? 'Traspaso de pipeline' : 'Cambio de etapa';
      const description = event.kind === 'created'
        ? `${event.actor_name} creó la oportunidad en ${event.to_pipeline}: ${event.to_stage}.`
        : event.kind === 'imported'
          ? `${event.actor_name} importó la oportunidad a ${event.to_pipeline}: ${event.to_stage}.`
          : `${event.actor_name} movió la oportunidad de ${event.from_pipeline}: ${event.from_stage} a ${event.to_pipeline}: ${event.to_stage}.`;
      return { id: `stage:${event.id}`, type, description, created_at: event.created_at, exactDate: true };
    }),
  ];
  if (createdAt && Number.isFinite(Date.parse(createdAt)) && !events.some(event => event.kind === 'created')) {
    entries.push({
      id: 'legacy:created', type: 'Fecha de alta registrada', created_at: createdAt, exactDate: true,
      description: 'Fecha disponible en la ficha. La etapa inicial y el autor no están verificados.',
    });
  }
  return entries.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function formatTimelineDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? formatter.format(date) : 'Fecha no disponible';
}
