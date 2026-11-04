import { Lead, PMOStage, PMO_STAGES } from '../types';

export function getCommercialLeads(leads: Lead[]): Lead[] {
  return leads.filter(lead => !lead.is_archived && !lead.pmo_stage);
}

// The same UUID remains the identity for the card, documents and activities.
export async function transferLeadToPMO(
  lead: Lead,
  updateLead: (id: string, updates: Partial<Lead>) => Promise<Lead | null> | void,
): Promise<Lead> {
  if (lead.is_archived) throw new Error('El proyecto está archivado.');
  if (lead.pmo_stage) return lead; // Never reset a project already in PMO.
  const updated = await updateLead(lead.id, { pmo_stage: 'Necesidad' });
  if (!updated || updated.id !== lead.id || updated.pmo_stage !== 'Necesidad') {
    throw new Error('No se confirmó el traslado a PMO.');
  }
  return updated;
}

// Keep pre-migration Brief cards visible in the first PMO column.
export function getPMOStage(stage: string | null | undefined): PMOStage | null {
  if (stage === 'Brief') return 'Necesidad';
  return PMO_STAGES.includes(stage as PMOStage) ? stage as PMOStage : null;
}
