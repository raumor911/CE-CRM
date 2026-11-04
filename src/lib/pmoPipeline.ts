import { Lead } from '../types';

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
  const updated = await updateLead(lead.id, { pmo_stage: 'Brief' });
  if (!updated || updated.id !== lead.id || updated.pmo_stage !== 'Brief') {
    throw new Error('No se confirmó el traslado a PMO.');
  }
  return updated;
}
