import React, { useRef, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Lead } from '../types';
import { transferLeadToPMO } from '../lib/pmoPipeline';

export const TransferToPMOButton: React.FC<{
  lead: Lead;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<Lead | null> | void;
}> = ({ lead, onUpdateLead }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const saving = useRef(false);
  if (lead.pmo_stage || lead.is_archived) return null;
  return (
    <div onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
      <button type="button" disabled={busy} onClick={async () => {
        if (saving.current) return;
        saving.current = true;
        setBusy(true);
        setError(false);
        try {
          await transferLeadToPMO(lead, onUpdateLead);
        } catch {
          setError(true);
        } finally {
          saving.current = false;
          setBusy(false);
        }
      }} className="w-full py-2 px-3 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
        {busy ? 'Trasladando…' : 'Pasar a PMO'}
      </button>
      {error && <p role="alert" className="text-xs text-rose-600 mt-2">No se pudo trasladar. La tarjeta sigue en el pipeline comercial. Reintenta después de verificar la conexión y el SQL de PMO.</p>}
    </div>
  );
};
