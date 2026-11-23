import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ContainerPrice, CreateQuoteInput, Lead, Quote, QuoteItem, QuoteType, ServicePrice } from '../../types';
import {
  DEFAULT_RENTAL_DOCUMENTS, QUOTE_TYPE_LABEL, QuoteSellerDefaults, QuoteTypeDefaults, TAX_RATE, defaultTerms,
} from '../../config/quoteDefaults';
import { addDaysIso, calculateTotals, formatIsoDate, formatMoney, priceInMxn, todayIso, validateQuoteInput } from '../../lib/quoteMath';
import type { useQuotePricing } from '../../hooks/useQuotePricing';
import { cn } from '../../lib/utils';

type Pricing = ReturnType<typeof useQuotePricing>;

interface Props {
  lead: Lead;
  pricing: Pricing;
  /** Si viene, la cotización nueva parte de una anterior (duplicar). */
  duplicateOf?: Quote | null;
  /** Si viene, se corrige esa cotización conservando su folio (no se crea otra). */
  editing?: Quote | null;
  onClose: () => void;
  /** Crea o actualiza, según el modo. Devuelve la cotización guardada. */
  onSubmit: (input: CreateQuoteInput) => Promise<Quote>;
  onCreated: (quote: Quote) => void;
}

interface Line {
  key: string;
  kind: QuoteItem['kind'];
  description: string;
  detail: string;
  quantity: string;
  unit_price: string;
  unit_price_usd: number | null;
  specs: QuoteItem['specs'];
  photo_url: string | null;
  catalogId: string;
  /** Si el vendedor ya ajustó la cantidad a mano, deja de acompañar a la de los contenedores. */
  qtyTouched?: boolean;
}

const input = 'w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-60';
const labelCls = 'text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1';
let lineSeq = 0;
const newKey = () => `l${++lineSeq}`;

const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <label className={cn('block space-y-1', className)}>
    <span className={labelCls}>{label}</span>
    {children}
  </label>
);

const leadType = (lead: Lead): QuoteType =>
  lead.category === 'Renta Contenedor' || lead.category === 'Renta Oficina 20 ft' ? 'rental' : 'sale';

const toNumber = (v: string): number => (v.trim() === '' ? NaN : Number(v));

export const QuoteBuilderModal: React.FC<Props> = ({ lead, pricing, duplicateOf, editing, onClose, onSubmit, onCreated }) => {
  // Datos de partida: la cotización que se edita, o la que se duplica.
  const source = editing ?? duplicateOf ?? null;
  const initialType = source?.quote_type ?? leadType(lead);
  const [type, setType] = useState<QuoteType>(initialType);
  const [customer, setCustomer] = useState({
    name: source?.customer_name ?? lead.lead_name ?? '',
    company: source?.customer_company ?? '',
    rfc: source?.customer_rfc ?? '',
    phone: source?.customer_phone ?? lead.phone ?? '',
    email: source?.customer_email ?? lead.email ?? '',
    location: source?.delivery_location ?? '',
  });
  const [seller, setSeller] = useState({
    name: source?.seller_name ?? QuoteSellerDefaults.name,
    phone: source?.seller_phone ?? QuoteSellerDefaults.phone,
    whatsapp: source?.seller_whatsapp ?? QuoteSellerDefaults.whatsapp,
    email: source?.seller_email ?? QuoteSellerDefaults.email,
  });
  const [validityDays, setValidityDays] = useState(String(source?.validity_days ?? QuoteTypeDefaults[initialType].validityDays));
  const [downPct, setDownPct] = useState(String(source?.down_payment_pct ?? QuoteTypeDefaults.sale.downPaymentPct));
  const [terms, setTerms] = useState((source?.terms ?? defaultTerms(initialType, QuoteTypeDefaults[initialType].validityDays, QuoteTypeDefaults.sale.downPaymentPct)).join('\n'));
  const [termsTouched, setTermsTouched] = useState(Boolean(source));
  const [documents, setDocuments] = useState(source?.required_documents ?? DEFAULT_RENTAL_DOCUMENTS);
  const [notes, setNotes] = useState(source?.notes ?? '');
  const [deposit, setDeposit] = useState(source?.security_deposit != null ? String(source.security_deposit) : '');
  const [depositTouched, setDepositTouched] = useState(source?.security_deposit != null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  // Al editar se conserva el tipo de cambio con el que se cotizó, para que el PDF no cambie de criterio a medias.
  const rate = editing ? (editing.exchange_rate ?? pricing.currentRate?.rate ?? null) : (pricing.currentRate?.rate ?? null);

  const serviceLines = (t: QuoteType, containerQty: number): Line[] =>
    pricing.services
      .filter(s => s.is_active && (s.applies_to === t || s.applies_to === 'both'))
      .map(s => serviceToLine(s, containerQty, t));

  const [lines, setLines] = useState<Line[]>(() =>
    source
      ? source.items.map(i => ({
          key: newKey(), kind: i.kind, description: i.description, detail: i.detail ?? '', quantity: String(i.quantity),
          unit_price: String(i.unit_price), unit_price_usd: i.unit_price_usd, specs: i.specs, photo_url: i.photo_url,
          // Deja seleccionado en la lista el equipo del catálogo que ya tenía la cotización.
          catalogId: i.kind === 'container'
            ? (pricing.containers.find(c => c.mode === source.quote_type && c.name === i.description)?.id ?? '')
            : '',
        }))
      : [emptyContainerLine(), ...serviceLines(initialType, 1)],
  );

  function emptyContainerLine(): Line {
    return { key: newKey(), kind: 'container', description: '', detail: '', quantity: '1', unit_price: '', unit_price_usd: null, specs: null, photo_url: null, catalogId: '' };
  }
  function serviceToLine(s: ServicePrice, containerQty: number, t: QuoteType): Line {
    const factor = t === 'rental' && s.kind === 'delivery' ? 2 : 1; // en renta la logística cubre ida y regreso
    return {
      key: newKey(), kind: s.kind, description: s.name, detail: s.detail ?? '', quantity: String(Math.max(1, containerQty) * factor),
      unit_price: String(s.default_unit_price), unit_price_usd: null, specs: null, photo_url: null, catalogId: s.id,
    };
  }

  const containerQty = lines.filter(l => l.kind === 'container').reduce((a, l) => a + (Number(l.quantity) || 0), 0);
  const catalog = useMemo(() => pricing.containers.filter(c => c.is_active && c.mode === type), [pricing.containers, type]);

  const changeType = (next: QuoteType) => {
    if (next === type) return;
    setType(next);
    setLines([emptyContainerLine(), ...serviceLines(next, 1)]);
    setValidityDays(String(QuoteTypeDefaults[next].validityDays));
    setDepositTouched(false);
    setDeposit('');
    if (!termsTouched) setTerms(defaultTerms(next, QuoteTypeDefaults[next].validityDays, Number(downPct) || 70).join('\n'));
  };

  const refreshTerms = (days: string, pct: string, t: QuoteType = type) => {
    if (!termsTouched) setTerms(defaultTerms(t, Number(days) || 1, t === 'sale' ? Number(pct) || 70 : null).join('\n'));
  };

  const patchLine = (key: string, patch: Partial<Line>) =>
    setLines(ls => {
      const next = ls.map(l => (l.key === key ? { ...l, ...patch } : l));
      const edited = next.find(l => l.key === key);
      if (edited?.kind === 'container' && 'quantity' in patch) {
        // Los servicios que vienen del catálogo (flete, maniobras) acompañan la cantidad de equipos.
        const qty = Math.max(1, next.filter(l => l.kind === 'container').reduce((a, l) => a + (Number(l.quantity) || 0), 0));
        return next.map(l => (l.kind !== 'container' && l.catalogId && !l.qtyTouched
          ? { ...l, quantity: String(qty * (type === 'rental' && l.kind === 'delivery' ? 2 : 1)) } : l));
      }
      return next;
    });

  const pickContainer = (key: string, id: string) => {
    const c: ContainerPrice | undefined = catalog.find(x => x.id === id);
    if (!c) { patchLine(key, { catalogId: '' }); return; }
    let unit = '';
    let usd: number | null = null;
    try {
      unit = String(priceInMxn(c.price, c.currency, rate));
      usd = c.currency === 'USD' ? c.price : null;
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
    patchLine(key, {
      catalogId: id, description: c.name, detail: c.description ?? '', unit_price: unit, unit_price_usd: usd,
      photo_url: c.photo_url, specs: {
        length_m: c.length_m, width_m: c.width_m, height_m: c.height_m, capacity_m3: c.capacity_m3,
        weight_kg: c.weight_kg, max_weight_kg: c.max_weight_kg,
      },
    });
  };

  const parsedItems = lines.map(l => ({
    kind: l.kind, description: l.description.trim(), detail: l.detail.trim() || null, quantity: toNumber(l.quantity),
    unit_price: toNumber(l.unit_price), unit_price_usd: l.unit_price_usd, specs: l.specs, photo_url: l.photo_url,
  }));
  const priced = parsedItems.filter(i => Number.isFinite(i.quantity) && Number.isFinite(i.unit_price));
  const monthlyRent = priced.filter(i => i.kind === 'container').reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const effectiveDeposit = type === 'rental' ? (depositTouched ? Number(deposit) || 0 : monthlyRent) : 0;
  const totals = calculateTotals(priced, TAX_RATE, effectiveDeposit);
  const days = Number(validityDays) || 0;
  const issuedOn = editing?.issued_on ?? todayIso();
  const validUntil = days > 0 ? addDaysIso(issuedOn, days) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    const payload: CreateQuoteInput = {
      lead_id: lead.id, quote_type: type, customer_name: customer.name.trim(),
      customer_company: customer.company.trim() || null, customer_rfc: customer.rfc.trim() || null,
      customer_phone: customer.phone.trim() || null, customer_email: customer.email.trim() || null,
      delivery_location: customer.location.trim() || null, issued_on: issuedOn, validity_days: days, tax_rate: TAX_RATE,
      exchange_rate: type === 'sale' ? rate : null,
      security_deposit: type === 'rental' ? effectiveDeposit : null,
      down_payment_pct: type === 'sale' ? Number(downPct) || null : null,
      terms: terms.split('\n').map(t => t.trim()).filter(Boolean),
      required_documents: type === 'rental' ? documents.trim() || null : null,
      seller_name: seller.name.trim(), seller_phone: seller.phone.trim() || null,
      seller_whatsapp: seller.whatsapp.trim() || null, seller_email: seller.email.trim() || null, notes: notes.trim() || null,
      items: parsedItems,
    };
    const problems = validateQuoteInput(payload);
    if (!seller.name.trim()) problems.push('Falta el nombre del vendedor.');
    if (type === 'sale' && parsedItems.some(i => i.unit_price_usd !== null) && !rate) problems.push('Falta el tipo de cambio. Captúralo en Ajustes → Precios y cotizaciones.');
    if (problems.length > 0) { setError(problems.join(' ')); return; }
    if (editing?.status === 'sent' && !window.confirm(
      `La cotización ${editing.folio} ya está marcada como enviada. Al guardar, el documento cambia pero conserva el folio. Recuerda reenviar el PDF corregido al cliente. ¿Guardar los cambios?`,
    )) return;

    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const quote = await onSubmit(payload);
      onCreated(quote);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo guardar la cotización. Intenta de nuevo.');
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={saving ? undefined : onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-4xl bg-white sm:rounded-3xl shadow-2xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4 safe-top">
            <div>
              <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight">
                {editing ? `Editar cotización ${editing.folio}` : 'Nueva cotización'}
              </h2>
              <p className="text-xs text-zinc-500">
                {lead.project_name}
                {editing ? ` · el folio no cambia · revisión ${editing.revision + 1} al guardar` : duplicateOf ? ` · duplicada de ${duplicateOf.folio}: revisa los precios` : ''}
              </p>
            </div>
            <button type="button" onClick={onClose} disabled={saving} aria-label="Cerrar" className="w-10 h-10 flex items-center justify-center hover:bg-zinc-100 rounded-full text-zinc-500">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {error && (
              <div role="alert" className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-rose-700 font-medium">{error}</p>
              </div>
            )}

            {editing ? (
              <p className="inline-flex items-center gap-2 text-xs text-zinc-500">
                <span className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-bold">{QUOTE_TYPE_LABEL[type]}</span>
                El tipo no se puede cambiar al editar. Para pasar de venta a renta, crea una cotización nueva.
              </p>
            ) : (
            <div className="inline-flex rounded-xl bg-zinc-100 p-1" role="tablist" aria-label="Tipo de cotización">
              {(['sale', 'rental'] as const).map(t => (
                <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => changeType(t)}
                  className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all', type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900')}>
                  {QUOTE_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            )}

            <section className="space-y-3">
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Nombre *"><input className={input} value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} /></Field>
                <Field label="Empresa"><input className={input} value={customer.company} onChange={e => setCustomer({ ...customer, company: e.target.value })} /></Field>
                <Field label="RFC"><input className={input} value={customer.rfc} onChange={e => setCustomer({ ...customer, rfc: e.target.value.toUpperCase() })} /></Field>
                <Field label="Teléfono"><input className={input} value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} /></Field>
                <Field label="Correo"><input type="email" className={input} value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} /></Field>
                <Field label={type === 'rental' ? 'Entrega y regreso en' : 'Entrega en'}><input className={input} value={customer.location} onChange={e => setCustomer({ ...customer, location: e.target.value })} placeholder="Ciudad o dirección" /></Field>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Renglones</h3>
                {type === 'sale' && (
                  <span className="text-xs text-zinc-500">
                    {rate ? <>Tipo de cambio: <b className="text-zinc-900">1 USD = ${rate.toFixed(2)} MXN</b></> : <b className="text-rose-600">Sin tipo de cambio</b>}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {lines.map(l => (
                  <div key={l.key} className={cn('rounded-2xl border p-3 grid grid-cols-12 gap-2 items-end', l.kind === 'container' ? 'border-indigo-200 bg-indigo-50/40' : 'border-zinc-200')}>
                    {l.kind === 'container' ? (
                      <Field label="Equipo" className="col-span-12 sm:col-span-5">
                        <select className={input} value={l.catalogId} onChange={e => pickContainer(l.key, e.target.value)}>
                          <option value="">
                            {l.description && !l.catalogId ? `${l.description} (como estaba)` : catalog.length ? 'Elige un equipo del catálogo' : 'Sin equipos en el catálogo'}
                          </option>
                          {catalog.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </Field>
                    ) : (
                      <Field label="Concepto" className="col-span-12 sm:col-span-5">
                        <input className={input} value={l.description} onChange={e => patchLine(l.key, { description: e.target.value })} />
                      </Field>
                    )}
                    <Field label="Cant." className="col-span-3 sm:col-span-2">
                      <input inputMode="numeric" className={input} value={l.quantity} onChange={e => patchLine(l.key, { quantity: e.target.value, qtyTouched: l.kind !== 'container' ? true : l.qtyTouched })} />
                    </Field>
                    <Field label={l.kind === 'container' && type === 'rental' ? 'Precio por mes' : 'Precio unitario'} className="col-span-6 sm:col-span-3">
                      <input inputMode="decimal" className={input} value={l.unit_price} onChange={e => patchLine(l.key, { unit_price: e.target.value, unit_price_usd: null })} />
                    </Field>
                    <div className="col-span-3 sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pb-2.5">
                      <span className="text-sm font-black text-zinc-900 tabular-nums">
                        {formatMoney(Math.round((toNumber(l.quantity) || 0) * (toNumber(l.unit_price) || 0) * 100) / 100)}
                      </span>
                      <button type="button" onClick={() => setLines(ls => ls.filter(x => x.key !== l.key))} aria-label="Quitar renglón" className="p-1.5 text-zinc-400 hover:text-rose-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {l.kind !== 'container' && (
                      <Field label="Detalle" className="col-span-12">
                        <input className={input} value={l.detail} onChange={e => patchLine(l.key, { detail: e.target.value })} placeholder="Opcional" />
                      </Field>
                    )}
                    {l.kind === 'container' && l.unit_price_usd !== null && rate && (
                      <p className="col-span-12 text-[11px] text-zinc-500">USD {l.unit_price_usd.toLocaleString('en-US')} × {rate.toFixed(2)} = {formatMoney(Number(l.unit_price))} MXN por unidad</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setLines(ls => [...ls, emptyContainerLine()])} className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5">
                  <Plus size={14} /> Equipo
                </button>
                {pricing.services.filter(s => s.is_active && (s.applies_to === type || s.applies_to === 'both')).map(s => (
                  <button key={s.id} type="button" onClick={() => setLines(ls => [...ls, serviceToLine(s, containerQty, type)])} className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5">
                    <Plus size={14} /> {s.name}
                  </button>
                ))}
                <button type="button" onClick={() => setLines(ls => [...ls, { ...emptyContainerLine(), kind: 'other' }])} className="px-3 py-2 rounded-xl border border-dashed border-zinc-300 text-xs font-bold text-zinc-500 hover:bg-zinc-50 flex items-center gap-1.5">
                  <Plus size={14} /> Otro concepto
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Field label="Vigencia (días)">
                <input inputMode="numeric" className={input} value={validityDays} onChange={e => { setValidityDays(e.target.value); refreshTerms(e.target.value, downPct); }} />
              </Field>
              {type === 'sale' ? (
                <Field label="Anticipo (%)">
                  <input inputMode="numeric" className={input} value={downPct} onChange={e => { setDownPct(e.target.value); refreshTerms(validityDays, e.target.value); }} />
                </Field>
              ) : (
                <Field label="Depósito en garantía">
                  <input inputMode="decimal" className={input} value={depositTouched ? deposit : String(monthlyRent || '')}
                    onChange={e => { setDepositTouched(true); setDeposit(e.target.value); }} placeholder="1 mes de renta" />
                </Field>
              )}
              <div className="sm:col-span-2 flex items-end pb-2 text-xs text-zinc-500">
                {validUntil && <>Vigente hasta <b className="ml-1 text-zinc-900">{formatIsoDate(validUntil)}</b></>}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Términos y condiciones</h3>
              <textarea rows={6} className={cn(input, 'font-medium leading-snug')} value={terms}
                onChange={e => { setTerms(e.target.value); setTermsTouched(true); }} aria-label="Términos, uno por línea" />
              <p className="text-[11px] text-zinc-500">Un término por línea. Lo que escribas aquí queda guardado con esta cotización.</p>
              {type === 'rental' && (
                <Field label="Documentación solicitada para la renta">
                  <textarea rows={3} className={cn(input, 'font-medium')} value={documents} onChange={e => setDocuments(e.target.value)} />
                </Field>
              )}
              <Field label="Notas (aparecen en el PDF)">
                <textarea rows={2} className={cn(input, 'font-medium')} value={notes} onChange={e => setNotes(e.target.value)} />
              </Field>
            </section>

            <details className="rounded-2xl border border-zinc-200 p-3">
              <summary className="cursor-pointer text-xs font-black text-zinc-500 uppercase tracking-widest">Vendedor</summary>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-3">
                <Field label="Nombre"><input className={input} value={seller.name} onChange={e => setSeller({ ...seller, name: e.target.value })} /></Field>
                <Field label="Teléfono"><input className={input} value={seller.phone} onChange={e => setSeller({ ...seller, phone: e.target.value })} /></Field>
                <Field label="WhatsApp"><input className={input} value={seller.whatsapp} onChange={e => setSeller({ ...seller, whatsapp: e.target.value })} /></Field>
                <Field label="Correo"><input className={input} value={seller.email} onChange={e => setSeller({ ...seller, email: e.target.value })} /></Field>
              </div>
            </details>
          </div>

          <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 safe-bottom">
            <dl className="text-sm grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 tabular-nums">
              <dt className="text-zinc-500">Subtotal</dt><dd className="text-right font-semibold">{formatMoney(totals.subtotal)}</dd>
              <dt className="text-zinc-500">IVA {Math.round(TAX_RATE * 100)} %</dt><dd className="text-right font-semibold">{formatMoney(totals.tax_total)}</dd>
              <dt className="font-black text-zinc-900">Total</dt><dd className="text-right font-black text-zinc-900">{formatMoney(totals.total)}</dd>
              {type === 'rental' && (<><dt className="text-zinc-500">Con depósito</dt><dd className="text-right font-semibold">{formatMoney(totals.total_with_deposit)}</dd></>)}
            </dl>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={saving} className="px-5 py-3 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-zinc-200/60">Cancelar</button>
              <button type="submit" disabled={saving} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                {saving ? <><Loader2 size={18} className="animate-spin" /> Guardando</> : editing ? 'Guardar cambios' : 'Generar cotización'}
              </button>
            </div>
          </div>
        </motion.form>
      </div>
    </AnimatePresence>
  );
};
