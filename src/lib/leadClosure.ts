import { Lead } from '../types';

export interface LeadClosureValidation {
  canClose: boolean;
  missing: string[];
}

export function validateLeadClosure(
  lead: Pick<
    Lead,
    'payment_confirmed' | 'contract_signed_at' | 'budget'
  >
): LeadClosureValidation {
  const missing: string[] = [];

  if ((lead.budget || 0) <= 0) {
    missing.push('Presupuesto mayor a $0');
  }

  if (lead.payment_confirmed !== true) {
    missing.push('Pago o adelanto confirmado');
  }

  if (!lead.contract_signed_at) {
    missing.push('Fecha de confirmación financiera');
  }

  return {
    canClose: missing.length === 0,
    missing
  };
}
