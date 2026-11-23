import React, { useMemo, useState } from 'react';
import { AlertCircle, Eye, Loader2, RefreshCw, Search } from 'lucide-react';
import type { Quote, QuoteStatus, QuoteType } from '../../types';
import { QUOTE_TYPE_LABEL } from '../../config/quoteDefaults';
import { QUOTE_HISTORY_LIMIT, useQuoteHistory } from '../../hooks/useQuoteHistory';
import { STATUS_LABEL, formatMoney, isQuoteExpired, quoteMatchesQuery, summarizeProducts } from '../../lib/quoteMath';
import { cn, formatDateTime } from '../../lib/utils';
import { QuotePdfPreview } from './QuotePdfPreview';

const STATUS_STYLE: Record<QuoteStatus | 'expired', string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-sky-100 text-sky-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-zinc-100 text-zinc-400 line-through',
  expired: 'bg-amber-100 text-amber-700',
};

const control = 'px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none';

/** Histórico consultable de cotizaciones: folio, cliente, productos, destino y fecha de generación. */
export const QuoteHistory: React.FC = () => {
  const { quotes, loading, error, reload } = useQuoteHistory();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<QuoteType | 'all'>('all');
  const [status, setStatus] = useState<QuoteStatus | 'all'>('all');
  const [preview, setPreview] = useState<Quote | null>(null);

  const visible = useMemo(
    () => quotes.filter(q => (type === 'all' || q.quote_type === type) && (status === 'all' || q.status === status) && quoteMatchesQuery(q, query)),
    [quotes, query, type, status],
  );
  const filtering = query.trim() !== '' || type !== 'all' || status !== 'all';

  return (
    <section className="space-y-4" aria-label="Histórico de cotizaciones">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Histórico de cotizaciones</h2>
          <p className="text-xs text-zinc-500 mt-1">
            {loading ? 'Cargando…' : filtering
              ? `${visible.length} de ${quotes.length} ${quotes.length === 1 ? 'cotización' : 'cotizaciones'}`
              : `${quotes.length} ${quotes.length === 1 ? 'cotización' : 'cotizaciones'}`}
            {!loading && quotes.length >= QUOTE_HISTORY_LIMIT && ` · se muestran las ${QUOTE_HISTORY_LIMIT} más recientes`}
          </p>
        </div>
        <button type="button" onClick={() => void reload()} disabled={loading} aria-label="Actualizar histórico"
          className="p-2.5 rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
        <label className="relative block">
          <span className="sr-only">Buscar</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por folio, cliente, producto o destino"
            className={cn(control, 'w-full pl-9')} />
        </label>
        <select aria-label="Tipo" className={control} value={type} onChange={e => setType(e.target.value as QuoteType | 'all')}>
          <option value="all">Venta y renta</option>
          <option value="sale">{QUOTE_TYPE_LABEL.sale}</option>
          <option value="rental">{QUOTE_TYPE_LABEL.rental}</option>
        </select>
        <select aria-label="Estado" className={control} value={status} onChange={e => setStatus(e.target.value as QuoteStatus | 'all')}>
          <option value="all">Todos los estados</option>
          {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>

      {error && (
        <div role="alert" className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center text-zinc-400"><Loader2 className="animate-spin" /></div>
      ) : visible.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-zinc-200 rounded-3xl">
          <p className="text-sm font-bold text-zinc-700">{filtering ? 'Ninguna cotización coincide con la búsqueda' : 'Aún no hay cotizaciones'}</p>
          <p className="text-xs text-zinc-500 mt-1">{filtering ? 'Prueba con otro folio, nombre o quita los filtros.' : 'Se crean desde la pestaña Cotizaciones de cada lead.'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full min-w-215 text-sm text-left">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-widest text-zinc-400">
              <tr>
                <th scope="col" className="p-3">Folio</th>
                <th scope="col" className="p-3">Cliente</th>
                <th scope="col" className="p-3">Productos</th>
                <th scope="col" className="p-3">Destino</th>
                <th scope="col" className="p-3">Fecha de generación</th>
                <th scope="col" className="p-3 text-right"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {visible.map(q => {
                const expired = isQuoteExpired(q);
                return (
                  <tr key={q.id} className="align-top hover:bg-zinc-50/60">
                    <td className="p-3">
                      <p className="font-black text-zinc-900 tabular-nums tracking-wide">{q.folio}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-900 text-white">{QUOTE_TYPE_LABEL[q.quote_type]}</span>
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_STYLE[expired ? 'expired' : q.status])}>
                          {expired ? 'Vencida' : STATUS_LABEL[q.status]}
                        </span>
                        {q.revision > 1 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-zinc-300 text-zinc-600">Rev. {q.revision}</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-zinc-900">{q.customer_name}</p>
                      {q.customer_company && <p className="text-xs text-zinc-500">{q.customer_company}</p>}
                    </td>
                    <td className="p-3 text-zinc-700">
                      {summarizeProducts(q.items) || '—'}
                      <p className="text-xs text-zinc-500 tabular-nums mt-0.5">{formatMoney(q.total_with_deposit ?? q.total)}</p>
                    </td>
                    <td className="p-3 text-zinc-700">{q.delivery_location || <span className="text-zinc-400">Sin destino</span>}</td>
                    <td className="p-3 text-zinc-700 tabular-nums whitespace-nowrap">{formatDateTime(q.created_at)}</td>
                    <td className="p-3 text-right">
                      <button type="button" onClick={() => setPreview(q)} aria-label={`Ver PDF de la cotización ${q.folio}`}
                        className="px-3 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-zinc-700">
                        <Eye size={14} /> Ver PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {preview && <QuotePdfPreview quote={preview} onClose={() => setPreview(null)} />}
    </section>
  );
};
