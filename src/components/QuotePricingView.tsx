import React, { useState } from 'react';
import { AlertCircle, Check, Loader2, Pencil, Plus, X } from 'lucide-react';
import type { ContainerPrice, PriceCurrency, ProductCondition, ProductType, QuoteLineKind, QuoteType, ServicePrice } from '../types';
import type { ContainerPriceInput, ServicePriceInput } from '../lib/quotesRepo';
import { useQuotePricing } from '../hooks/useQuotePricing';
import { QuoteHistory } from './quotes/QuoteHistory';
import { QUOTE_TYPE_LABEL } from '../config/quoteDefaults';
import { formatFolio, formatMoney, priceInMxn } from '../lib/quoteMath';
import { cn, formatDateTime } from '../lib/utils';

type Tab = 'rate' | 'containers' | 'services' | 'folios';
const TABS: { id: Tab; label: string }[] = [
  { id: 'rate', label: 'Tipo de cambio' }, { id: 'containers', label: 'Contenedores' },
  { id: 'services', label: 'Servicios' }, { id: 'folios', label: 'Folios' },
];

const field = 'w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none';
const lbl = 'text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1';
const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <label className={cn('block space-y-1', className)}><span className={lbl}>{label}</span>{children}</label>
);
const num = (v: string): number | null => (v.trim() === '' || Number.isNaN(Number(v)) ? null : Number(v));
const KIND_LABEL: Record<QuoteLineKind, string> = { container: 'Equipo', delivery: 'Entrega', loading: 'Carga', unloading: 'Descarga', other: 'Otro' };

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4" role="dialog" aria-label={title}>
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
    <div className="relative w-full max-w-2xl bg-white sm:rounded-3xl shadow-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="font-black text-zinc-900 uppercase tracking-tight">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="w-10 h-10 flex items-center justify-center hover:bg-zinc-100 rounded-full text-zinc-500"><X size={20} /></button>
      </div>
      <div className="overflow-y-auto p-6">{children}</div>
    </div>
  </div>
);

const ErrorNote: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div role="alert" className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
      <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
      <p className="text-xs text-rose-700 font-medium">{message}</p>
    </div>
  ) : null;

/* ───────── Tipo de cambio ───────── */
const RateSection: React.FC<{ p: ReturnType<typeof useQuotePricing> }> = ({ p }) => {
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const parsed = num(value);
  const valid = parsed !== null && parsed > 0 && parsed < 1000;
  const sale = p.containers.filter(c => c.is_active && c.mode === 'sale' && c.currency === 'USD');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true); setErr(null);
    try { await p.addRate(parsed!, note.trim() || null); setValue(''); setNote(''); }
    catch (x: any) { setErr(x?.message ?? 'No se pudo guardar el tipo de cambio.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        <div className="rounded-3xl bg-zinc-900 text-white p-6">
          <p className="text-xs text-zinc-400">Tipo de cambio vigente</p>
          <p className="text-4xl font-black tabular-nums mt-1">{p.currentRate ? `$${p.currentRate.rate.toFixed(2)}` : 'Sin definir'}</p>
          <p className="text-xs text-zinc-400 mt-1">pesos por 1 USD{p.currentRate ? ` · desde ${formatDateTime(p.currentRate.created_at)}` : ''}</p>
        </div>
        <form onSubmit={save} className="space-y-3">
          <ErrorNote message={err} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nuevo valor (MXN por USD)"><input inputMode="decimal" className={field} value={value} onChange={e => setValue(e.target.value)} placeholder="19.45" /></Field>
            <Field label="Nota (opcional)"><input className={field} value={note} onChange={e => setNote(e.target.value)} placeholder="Ej. cierre del día" /></Field>
          </div>
          {parsed !== null && !valid && <p className="text-xs text-rose-600">Escribe un valor mayor a 0 y menor a 1,000.</p>}
          {valid && sale.length > 0 && (
            <div className="rounded-2xl bg-indigo-50 p-3 text-xs text-indigo-900 space-y-1">
              <p className="font-bold">Así quedarían los precios de venta:</p>
              {sale.map(c => <p key={c.id} className="tabular-nums">{c.name}: USD {c.price.toLocaleString('en-US')} → <b>{formatMoney(priceInMxn(c.price, 'USD', parsed))}</b></p>)}
            </div>
          )}
          <button type="submit" disabled={!valid || saving} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-40">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Actualizar tipo de cambio
          </button>
          <p className="text-[11px] text-zinc-500">Las cotizaciones ya emitidas conservan el tipo de cambio con el que se hicieron.</p>
        </form>
      </div>
      <div>
        <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest mb-2">Historial</h3>
        <ul className="divide-y divide-zinc-100 rounded-2xl border border-zinc-200">
          {p.rates.length === 0 && <li className="p-4 text-sm text-zinc-500">Aún no hay valores registrados.</li>}
          {p.rates.map((r, i) => (
            <li key={r.id} className="p-3 flex items-center justify-between gap-3">
              <div><p className="font-bold tabular-nums">${r.rate.toFixed(2)} {i === 0 && <span className="ml-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Vigente</span>}</p>
                {r.note && <p className="text-xs text-zinc-500">{r.note}</p>}</div>
              <p className="text-xs text-zinc-400 shrink-0">{formatDateTime(r.created_at)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

/* ───────── Contenedores ───────── */
const emptyContainer = (): ContainerPriceInput => ({
  name: '', mode: 'sale', product_type: '20 DC', condition: 'Usado', price: 0, currency: 'USD', length_m: null, width_m: null,
  height_m: null, capacity_m3: null, weight_kg: null, max_weight_kg: null, description: null, photo_url: null, is_active: true,
});

const ContainerForm: React.FC<{ initial: ContainerPriceInput; onSave: (v: ContainerPriceInput) => Promise<void>; onClose: () => void }> = ({ initial, onSave, onClose }) => {
  const [v, setV] = useState({ ...initial, price: initial.price as number | string });
  const [specs, setSpecs] = useState({
    length_m: String(initial.length_m ?? ''), width_m: String(initial.width_m ?? ''), height_m: String(initial.height_m ?? ''),
    capacity_m3: String(initial.capacity_m3 ?? ''), weight_kg: String(initial.weight_kg ?? ''), max_weight_kg: String(initial.max_weight_kg ?? ''),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = num(String(v.price));
    if (!v.name.trim()) return setErr('Falta el nombre del equipo.');
    if (price === null || price < 0) return setErr('El precio debe ser un número mayor o igual a 0.');
    setSaving(true); setErr(null);
    try {
      await onSave({
        ...v, name: v.name.trim(), price, description: v.description?.trim() || null, photo_url: v.photo_url?.trim() || null,
        length_m: num(specs.length_m), width_m: num(specs.width_m), height_m: num(specs.height_m),
        capacity_m3: num(specs.capacity_m3), weight_kg: num(specs.weight_kg), max_weight_kg: num(specs.max_weight_kg),
      });
      onClose();
    } catch (x: any) {
      setErr(x?.code === '23505' ? 'Ya existe un equipo con ese nombre y modalidad.' : x?.message ?? 'No se pudo guardar.');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorNote message={err} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" className="col-span-2"><input className={field} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} placeholder="20 DC usado" /></Field>
        <Field label="Modalidad"><select className={field} value={v.mode} onChange={e => { const mode = e.target.value as QuoteType; setV({ ...v, mode, currency: mode === 'sale' ? 'USD' : 'MXN' }); }}><option value="sale">Venta</option><option value="rental">Renta (por mes)</option></select></Field>
        <Field label="Tipo"><select className={field} value={v.product_type} onChange={e => setV({ ...v, product_type: e.target.value as ProductType })}>{['Oficina', '20 DC', '40 DC', '40 HC'].map(t => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Condición"><select className={field} value={v.condition} onChange={e => setV({ ...v, condition: e.target.value as ProductCondition })}><option>Nuevo</option><option>Usado</option></select></Field>
        <div className="grid grid-cols-[1fr_88px] gap-2">
          <Field label="Precio"><input inputMode="decimal" className={field} value={v.price} onChange={e => setV({ ...v, price: e.target.value })} /></Field>
          <Field label="Moneda"><select className={field} value={v.currency} onChange={e => setV({ ...v, currency: e.target.value as PriceCurrency })}><option>USD</option><option>MXN</option></select></Field>
        </div>
        <Field label="Descripción" className="col-span-2"><input className={field} value={v.description ?? ''} onChange={e => setV({ ...v, description: e.target.value })} placeholder="Acero, doble cerrojo de seguridad" /></Field>
        <Field label="Foto (ruta o URL)" className="col-span-2"><input className={field} value={v.photo_url ?? ''} onChange={e => setV({ ...v, photo_url: e.target.value })} placeholder="/media/containers/20dc-usado.jpg" /></Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {([['length_m', 'Largo (m)'], ['width_m', 'Ancho (m)'], ['height_m', 'Alto (m)'], ['capacity_m3', 'Capacidad (m³)'], ['weight_kg', 'Peso (kg)'], ['max_weight_kg', 'Peso máx. (kg)']] as const).map(([k, l]) => (
          <Field key={k} label={l}><input inputMode="decimal" className={field} value={specs[k]} onChange={e => setSpecs({ ...specs, [k]: e.target.value })} /></Field>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700"><input type="checkbox" checked={v.is_active} onChange={e => setV({ ...v, is_active: e.target.checked })} className="w-4 h-4 accent-indigo-600" /> Disponible para cotizar</label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-zinc-100">Cancelar</button>
        <button type="submit" disabled={saving} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />} Guardar</button>
      </div>
    </form>
  );
};

const ContainersSection: React.FC<{ p: ReturnType<typeof useQuotePricing> }> = ({ p }) => {
  const [editing, setEditing] = useState<ContainerPriceInput | null>(null);
  const rate = p.currentRate?.rate ?? null;
  const mxn = (c: ContainerPrice): string | null => { try { return c.currency === 'USD' ? formatMoney(priceInMxn(c.price, 'USD', rate)) : null; } catch { return null; } };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" onClick={() => setEditing(emptyContainer())} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700"><Plus size={16} /> Agregar equipo</button></div>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] text-zinc-500 bg-zinc-50"><th className="p-3">Equipo</th><th className="p-3">Modalidad</th><th className="p-3 text-right">Precio de lista</th><th className="p-3 text-right">En pesos hoy</th><th className="p-3">Estado</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-zinc-100">
            {p.containers.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-zinc-500">Sin equipos. Agrega el primero.</td></tr>}
            {p.containers.map(c => (
              <tr key={c.id} className={cn(!c.is_active && 'opacity-50')}>
                <td className="p-3 font-bold text-zinc-900">{c.name}<span className="block text-xs font-normal text-zinc-500">{c.product_type} · {c.condition}</span></td>
                <td className="p-3">{QUOTE_TYPE_LABEL[c.mode]}</td>
                <td className="p-3 text-right tabular-nums font-semibold">{c.currency === 'USD' ? `USD ${c.price.toLocaleString('en-US')}` : formatMoney(c.price)}{c.mode === 'rental' && <span className="text-xs font-normal text-zinc-500"> /mes</span>}</td>
                <td className="p-3 text-right tabular-nums">{mxn(c) ?? <span className="text-zinc-400">—</span>}</td>
                <td className="p-3"><span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500')}>{c.is_active ? 'Activo' : 'Inactivo'}</span></td>
                <td className="p-3 text-right"><button type="button" onClick={() => setEditing(c)} aria-label={`Editar ${c.name}`} className="p-2 text-zinc-400 hover:text-indigo-600"><Pencil size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <Modal title={editing.id ? 'Editar equipo' : 'Nuevo equipo'} onClose={() => setEditing(null)}><ContainerForm initial={editing} onSave={async v => { await p.saveContainer(v); }} onClose={() => setEditing(null)} /></Modal>}
    </div>
  );
};

/* ───────── Servicios ───────── */
const emptyService = (): ServicePriceInput => ({ kind: 'delivery', name: '', detail: null, default_unit_price: 0, applies_to: 'both', sort_order: 0, is_active: true });

const ServiceForm: React.FC<{ initial: ServicePriceInput; onSave: (v: ServicePriceInput) => Promise<void>; onClose: () => void }> = ({ initial, onSave, onClose }) => {
  const [v, setV] = useState({ ...initial, default_unit_price: initial.default_unit_price as number | string });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = num(String(v.default_unit_price));
    if (!v.name.trim()) return setErr('Falta el nombre del servicio.');
    if (price === null || price < 0) return setErr('El precio debe ser un número mayor o igual a 0.');
    setSaving(true); setErr(null);
    try { await onSave({ ...v, name: v.name.trim(), detail: v.detail?.trim() || null, default_unit_price: price }); onClose(); }
    catch (x: any) { setErr(x?.code === '23505' ? 'Ya existe un servicio con ese nombre para esa modalidad.' : x?.message ?? 'No se pudo guardar.'); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorNote message={err} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" className="col-span-2"><input className={field} value={v.name} onChange={e => setV({ ...v, name: e.target.value })} placeholder="Logística de entrega" /></Field>
        <Field label="Tipo"><select className={field} value={v.kind} onChange={e => setV({ ...v, kind: e.target.value as QuoteLineKind })}>{(['delivery', 'loading', 'unloading', 'other'] as const).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></Field>
        <Field label="Aplica a"><select className={field} value={v.applies_to} onChange={e => setV({ ...v, applies_to: e.target.value as ServicePrice['applies_to'] })}><option value="both">Venta y renta</option><option value="sale">Solo venta</option><option value="rental">Solo renta</option></select></Field>
        <Field label="Precio unitario (MXN, sin IVA)"><input inputMode="decimal" className={field} value={v.default_unit_price} onChange={e => setV({ ...v, default_unit_price: e.target.value })} /></Field>
        <Field label="Orden"><input inputMode="numeric" className={field} value={v.sort_order} onChange={e => setV({ ...v, sort_order: Number(e.target.value) || 0 })} /></Field>
        <Field label="Detalle (opcional)" className="col-span-2"><input className={field} value={v.detail ?? ''} onChange={e => setV({ ...v, detail: e.target.value })} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700"><input type="checkbox" checked={v.is_active} onChange={e => setV({ ...v, is_active: e.target.checked })} className="w-4 h-4 accent-indigo-600" /> Se sugiere al cotizar</label>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="px-5 py-3 rounded-2xl text-sm font-bold text-zinc-600 hover:bg-zinc-100">Cancelar</button>
        <button type="submit" disabled={saving} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">{saving && <Loader2 size={16} className="animate-spin" />} Guardar</button>
      </div>
    </form>
  );
};

const ServicesSection: React.FC<{ p: ReturnType<typeof useQuotePricing> }> = ({ p }) => {
  const [editing, setEditing] = useState<ServicePriceInput | null>(null);
  const applies = { sale: 'Venta', rental: 'Renta', both: 'Ambas' } as const;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button type="button" onClick={() => setEditing(emptyService())} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700"><Plus size={16} /> Agregar servicio</button></div>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-[11px] text-zinc-500 bg-zinc-50"><th className="p-3">Servicio</th><th className="p-3">Aplica a</th><th className="p-3 text-right">Precio (sin IVA)</th><th className="p-3">Estado</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-zinc-100">
            {p.services.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-zinc-500">Sin servicios. Agrega el primero.</td></tr>}
            {p.services.map(s => (
              <tr key={s.id} className={cn(!s.is_active && 'opacity-50')}>
                <td className="p-3 font-bold text-zinc-900">{s.name}<span className="block text-xs font-normal text-zinc-500">{KIND_LABEL[s.kind]}{s.detail ? ` · ${s.detail}` : ''}</span></td>
                <td className="p-3">{applies[s.applies_to]}</td>
                <td className="p-3 text-right tabular-nums font-semibold">{formatMoney(s.default_unit_price)}</td>
                <td className="p-3"><span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500')}>{s.is_active ? 'Activo' : 'Inactivo'}</span></td>
                <td className="p-3 text-right"><button type="button" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`} className="p-2 text-zinc-400 hover:text-indigo-600"><Pencil size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <Modal title={editing.id ? 'Editar servicio' : 'Nuevo servicio'} onClose={() => setEditing(null)}><ServiceForm initial={editing} onSave={async v => { await p.saveService(v); }} onClose={() => setEditing(null)} /></Modal>}
    </div>
  );
};

/* ───────── Folios ───────── */
const FolioRow: React.FC<{ p: ReturnType<typeof useQuotePricing>; type: QuoteType }> = ({ p, type }) => {
  const s = p.series.find(x => x.quote_type === type);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!s) return <div className="rounded-2xl border border-zinc-200 p-5 text-sm text-zinc-500">No hay serie de folios para {QUOTE_TYPE_LABEL[type].toLowerCase()}.</div>;
  const next = s.last_number + 1;
  const parsed = num(value);
  const valid = parsed !== null && Number.isInteger(parsed) && parsed >= next;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true); setErr(null);
    try { await p.setNextFolio(type, parsed!); setValue(''); }
    catch (x: any) { setErr(x?.message ?? 'No se pudo actualizar el folio.'); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={save} className="rounded-2xl border border-zinc-200 p-5 space-y-3">
      <h3 className="text-xs font-black text-zinc-900 uppercase tracking-widest">Cotizaciones de {QUOTE_TYPE_LABEL[type].toLowerCase()}</h3>
      <p className="text-sm text-zinc-500">Siguiente folio</p>
      <p className="text-3xl font-black text-zinc-900 tabular-nums tracking-wider">{formatFolio(s, next)}</p>
      <ErrorNote message={err} />
      <div className="flex items-end gap-2">
        <Field label="Cambiar el siguiente número" className="flex-1"><input inputMode="numeric" className={field} value={value} onChange={e => setValue(e.target.value)} placeholder={String(next)} /></Field>
        <button type="submit" disabled={!valid || saving} className="px-4 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-bold disabled:opacity-40">{saving ? '…' : 'Guardar'}</button>
      </div>
      {value !== '' && !valid && <p className="text-xs text-rose-600">Debe ser un número entero de {next} en adelante. Un folio ya emitido no se reutiliza.</p>}
    </form>
  );
};

export const QuotePricingView: React.FC = () => {
  const p = useQuotePricing();
  const [tab, setTab] = useState<Tab>('rate');
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Precios y cotizaciones</h2>
        <p className="text-sm text-zinc-500 mt-1">Actualiza precios, tipo de cambio y folios. Los cambios aplican a las cotizaciones nuevas; las ya emitidas no se alteran.</p>
      </div>
      <div className="inline-flex flex-wrap rounded-xl bg-zinc-100 p-1" role="tablist">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-2 rounded-lg text-sm font-bold transition-all', tab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900')}>{t.label}</button>
        ))}
      </div>
      {p.error && <ErrorNote message={`${p.error} Si es la primera vez, falta aplicar la migración de cotizaciones en Supabase (ver docs/cotizaciones.md).`} />}
      {p.loading ? <div className="py-16 flex justify-center text-zinc-400"><Loader2 className="animate-spin" /></div> : (
        <>
          {tab === 'rate' && <RateSection p={p} />}
          {tab === 'containers' && <ContainersSection p={p} />}
          {tab === 'services' && <ServicesSection p={p} />}
          {tab === 'folios' && (
            <div className="@container space-y-8">
              <div className="grid grid-cols-1 @3xl:grid-cols-2 gap-4"><FolioRow p={p} type="sale" /><FolioRow p={p} type="rental" /></div>
              <QuoteHistory />
            </div>
          )}
        </>
      )}
    </div>
  );
};
