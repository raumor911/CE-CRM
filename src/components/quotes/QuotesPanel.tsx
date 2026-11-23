import React, { useState } from 'react';
import { AlertCircle, Copy, Eye, FileText, Loader2, Pencil, Plus } from 'lucide-react';
import type { Lead, Quote, QuoteStatus } from '../../types';
import { QUOTE_TYPE_LABEL } from '../../config/quoteDefaults';
import { useLeadQuotes } from '../../hooks/useLeadQuotes';
import { useQuotePricing } from '../../hooks/useQuotePricing';
import { STATUS_LABEL, canEdit, formatIsoDate, formatMoney, isQuoteExpired, nextStatuses } from '../../lib/quoteMath';
import { cn } from '../../lib/utils';
import { QuoteBuilderModal } from './QuoteBuilderModal';
import { QuotePdfPreview } from './QuotePdfPreview';

const STATUS_STYLE: Record<QuoteStatus | 'expired', string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-sky-100 text-sky-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-zinc-100 text-zinc-400 line-through',
  expired: 'bg-amber-100 text-amber-700',
};

const ACTION_LABEL: Record<QuoteStatus, string> = {
  draft: '', sent: 'Marcar enviada', accepted: 'Aceptada', rejected: 'Rechazada', cancelled: 'Cancelar',
};
const CONFIRM: Partial<Record<QuoteStatus, string>> = {
  rejected: '¿Marcar esta cotización como rechazada?',
  cancelled: '¿Cancelar esta cotización? Esta acción no se puede deshacer.',
};

export const QuotesPanel: React.FC<{ lead: Lead }> = ({ lead }) => {
  const { quotes, loading, error, createQuote, updateQuote, transition } = useLeadQuotes(lead.id);
  const pricing = useQuotePricing();
  const [builder, setBuilder] = useState<{ duplicateOf: Quote | null; editing: Quote | null } | null>(null);
  const [preview, setPreview] = useState<Quote | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const change = async (quote: Quote, to: QuoteStatus) => {
    const msg = CONFIRM[to];
    if (msg && !window.confirm(msg)) return;
    setBusyId(quote.id);
    setActionError(null);
    try {
      await transition(quote, to);
    } catch (e: any) {
      setActionError(e?.message ?? 'No se pudo actualizar la cotización.');
    } finally {
      setBusyId(null);
    }
  };

  const canCreate = !pricing.loading && !pricing.error;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cotizaciones de este lead</h4>
        <button
          type="button" disabled={!canCreate} onClick={() => setBuilder({ duplicateOf: null, editing: null })}
          className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-40"
        >
          {pricing.loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Nueva cotización
        </button>
      </div>

      {(pricing.error || error || actionError) && (
        <div role="alert" className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
          <div className="text-xs text-rose-700 font-medium space-y-1">
            <p>{actionError ?? error ?? pricing.error}</p>
            {(pricing.error || error) && (
              <p className="text-rose-600/80">Si es la primera vez, falta aplicar la migración de cotizaciones en Supabase (ver docs/cotizaciones.md).</p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center text-zinc-400"><Loader2 className="animate-spin" /></div>
      ) : quotes.length === 0 && !error ? (
        <div className="py-12 text-center border-2 border-dashed border-zinc-200 rounded-3xl">
          <FileText className="mx-auto text-zinc-300 mb-2" size={32} />
          <p className="text-sm font-bold text-zinc-700">Este lead aún no tiene cotizaciones</p>
          <p className="text-xs text-zinc-500 mt-1">Crea la primera: se guarda con su folio y se descarga en PDF.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {quotes.map(q => {
            const expired = isQuoteExpired(q);
            const total = q.total_with_deposit ?? q.total;
            return (
              <li key={q.id} className="rounded-2xl border border-zinc-200 p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-zinc-900 tracking-wide tabular-nums">{q.folio}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-white">{QUOTE_TYPE_LABEL[q.quote_type]}</span>
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_STYLE[expired ? 'expired' : q.status])}>
                        {expired ? 'Vencida' : STATUS_LABEL[q.status]}
                      </span>
                      {q.revision > 1 && (
                        <span title="Se ha corregido desde su primera versión; el folio es el mismo" className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-zinc-300 text-zinc-600">
                          Rev. {q.revision}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {formatIsoDate(q.issued_on)} · vigente hasta {formatIsoDate(q.valid_until)} · {q.items.filter(i => i.kind === 'container').reduce((a, i) => a + i.quantity, 0)} equipo(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-zinc-900 tabular-nums">{formatMoney(total)}</p>
                    <p className="text-[11px] text-zinc-500">{q.total_with_deposit !== null ? 'Total con depósito' : 'Total con IVA'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setPreview(q)} className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold flex items-center gap-1.5 hover:bg-zinc-700">
                    <Eye size={14} /> Ver PDF
                  </button>
                  {canEdit(q.status) && (
                    <button type="button" disabled={!canCreate} onClick={() => setBuilder({ duplicateOf: null, editing: q })} className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 flex items-center gap-1.5 hover:bg-zinc-50 disabled:opacity-40">
                      <Pencil size={14} /> Editar
                    </button>
                  )}
                  <button type="button" onClick={() => setBuilder({ duplicateOf: q, editing: null })} className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 flex items-center gap-1.5 hover:bg-zinc-50">
                    <Copy size={14} /> Duplicar
                  </button>
                  {nextStatuses(q.status).map(to => (
                    <button
                      key={to} type="button" disabled={busyId === q.id} onClick={() => change(q, to)}
                      className={cn('px-3 py-2 rounded-xl border text-xs font-bold disabled:opacity-40',
                        to === 'cancelled' || to === 'rejected' ? 'border-zinc-200 text-zinc-500 hover:bg-rose-50 hover:text-rose-600' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50')}
                    >
                      {ACTION_LABEL[to]}
                    </button>
                  ))}
                  {busyId === q.id && <Loader2 size={14} className="animate-spin text-zinc-400" />}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {builder && (
        <QuoteBuilderModal
          lead={lead} pricing={pricing} duplicateOf={builder.duplicateOf} editing={builder.editing}
          onClose={() => setBuilder(null)}
          onSubmit={input => (builder.editing ? updateQuote(builder.editing, input) : createQuote(input))}
          onCreated={quote => { setBuilder(null); setPreview(quote); }}
        />
      )}
      {preview && <QuotePdfPreview quote={preview} onClose={() => setPreview(null)} />}
    </div>
  );
};
