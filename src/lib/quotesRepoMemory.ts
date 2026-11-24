import { addDaysIso, calculateTotals, canEdit, canTransition, formatFolio, todayIso } from './quoteMath';
import type { QuotesRepo } from './quotesRepo';
import type {
  ContainerPrice, CreateQuoteInput, ExchangeRate, FolioSeries, Quote, QuoteItem, QuoteType, ServicePrice,
} from '../types';

let seq = 0;
// Los ids nuevos llevan "n" para no chocar con los datos de ejemplo (sp-1, cp-1…), que antes se pisaban al crear.
const uid = (p: string) => `${p}-n${++seq}`;
const nowIso = () => new Date().toISOString();

/** Repositorio con datos SINTÉTICOS para la vista previa de desarrollo. No toca Supabase. */
export function createMemoryQuotesRepo(): QuotesRepo {
  const containers: ContainerPrice[] = [
    {
      id: 'cp-1', name: '20 DC usado', mode: 'sale', product_type: '20 DC', condition: 'Usado', price: 2500, currency: 'USD',
      length_m: 6, width_m: 2.4, height_m: 2.5, capacity_m3: 33.3, weight_kg: 2250, max_weight_kg: 28240,
      description: 'Acero, doble cerrojo de seguridad', photo_url: '/media/containers/20dc-usado.jpg',
      is_active: true, updated_at: nowIso(), updated_by: null,
    },
    {
      id: 'cp-2', name: '20 DC nuevo', mode: 'sale', product_type: '20 DC', condition: 'Nuevo', price: 3400, currency: 'USD',
      length_m: 6, width_m: 2.4, height_m: 2.59, capacity_m3: 33.2, weight_kg: 2300, max_weight_kg: 28200,
      description: 'Acero corten, un solo uso, doble cerrojo', photo_url: '/media/containers/20dc-usado.jpg',
      is_active: true, updated_at: nowIso(), updated_by: null,
    },
    {
      id: 'cp-3', name: '20 DC estándar usado', mode: 'rental', product_type: '20 DC', condition: 'Usado', price: 4500, currency: 'MXN',
      length_m: 6, width_m: 2.4, height_m: 2.59, capacity_m3: 33.3, weight_kg: 2250, max_weight_kg: 28240,
      description: 'Acero, doble cerrojo de seguridad', photo_url: '/media/containers/20dc-estandar.jpg',
      is_active: true, updated_at: nowIso(), updated_by: null,
    },
    {
      id: 'cp-4', name: '40 HC usado', mode: 'rental', product_type: '40 HC', condition: 'Usado', price: 7800, currency: 'MXN',
      length_m: 12, width_m: 2.4, height_m: 2.9, capacity_m3: 76, weight_kg: 3800, max_weight_kg: 28600,
      description: 'High cube, acero, doble cerrojo', photo_url: '/media/containers/40dc-usado.png',
      is_active: true, updated_at: nowIso(), updated_by: null,
    },
    {
      id: 'cp-5', name: '40 DC usado', mode: 'sale', product_type: '40 DC', condition: 'Usado', price: 3800, currency: 'USD',
      length_m: 12, width_m: 2.4, height_m: 2.5, capacity_m3: 67.7, weight_kg: 3680, max_weight_kg: 32500,
      description: 'Acero, doble cerrojo de seguridad', photo_url: '/media/containers/40dc-usado.png',
      is_active: true, updated_at: nowIso(), updated_by: null,
    },
    {
      id: 'cp-6', name: '40 HC usado', mode: 'sale', product_type: '40 HC', condition: 'Usado', price: 4200, currency: 'USD',
      length_m: 12, width_m: 2.4, height_m: 2.9, capacity_m3: 76, weight_kg: 3800, max_weight_kg: 28600,
      description: 'High cube, acero, doble cerrojo de seguridad', photo_url: '/media/containers/40dc-usado.png',
      is_active: true, updated_at: nowIso(), updated_by: null,
    },
  ];
  const services: ServicePrice[] = [
    { id: 'sp-1', kind: 'delivery', name: 'Logística de entrega', detail: null, default_unit_price: 9500, applies_to: 'sale', sort_order: 1, is_active: true, updated_at: nowIso() },
    { id: 'sp-2', kind: 'delivery', name: 'Logística de entrega y regreso', detail: 'Descarga y carga en sitio con rampa hidráulica', default_unit_price: 4500, applies_to: 'rental', sort_order: 2, is_active: true, updated_at: nowIso() },
    { id: 'sp-3', kind: 'loading', name: 'Maniobras de carga al camión', detail: null, default_unit_price: 1600, applies_to: 'sale', sort_order: 3, is_active: true, updated_at: nowIso() },
    { id: 'sp-4', kind: 'loading', name: 'Maniobras de carga al camión', detail: null, default_unit_price: 1400, applies_to: 'rental', sort_order: 4, is_active: true, updated_at: nowIso() },
    { id: 'sp-5', kind: 'unloading', name: 'Maniobras de descarga en sitio', detail: 'Sencilla, a piso con rampa hidráulica', default_unit_price: 0, applies_to: 'sale', sort_order: 5, is_active: true, updated_at: nowIso() },
  ];
  const rates: ExchangeRate[] = [
    { id: 'fx-2', rate: 19.45, note: 'Tipo de cambio de las cotizaciones vigentes', created_by: null, created_at: '2026-11-23T15:00:00.000Z' },
    { id: 'fx-1', rate: 19.12, note: 'Ajuste anterior', created_by: null, created_at: '2026-11-02T15:00:00.000Z' },
  ];
  const series: FolioSeries[] = [
    { quote_type: 'sale', prefix: '', pad: 5, last_number: 21788 },
    { quote_type: 'rental', prefix: 'ED', pad: 4, last_number: 79 },
  ];
  const quotes: Quote[] = [];

  const delay = <T,>(v: T): Promise<T> => new Promise(r => setTimeout(() => r(structuredClone(v)), 120));

  /** Arma la cotización. Con `existing` conserva folio, estado y fechas de captura (edición); sin ella toma un folio nuevo. */
  const build = (input: CreateQuoteInput, existing?: Quote): Quote => {
    let folio = existing?.folio ?? '';
    if (!existing) {
      const s = series.find(x => x.quote_type === input.quote_type)!;
      s.last_number += 1;
      folio = formatFolio(s, s.last_number);
    }
    const items: QuoteItem[] = input.items.map((it, i) => ({ ...it, id: uid('qi'), position: i + 1, line_subtotal: 0 }));
    const t = calculateTotals(items, input.tax_rate, input.quote_type === 'rental' ? input.security_deposit ?? 0 : 0);
    items.forEach((it, i) => { it.line_subtotal = t.lines[i]; });
    const ts = nowIso();
    return {
      id: existing?.id ?? uid('q'), folio, quote_type: input.quote_type, status: existing?.status ?? 'draft', lead_id: input.lead_id,
      customer_name: input.customer_name, customer_company: input.customer_company ?? null, customer_rfc: input.customer_rfc ?? null,
      customer_phone: input.customer_phone ?? null, customer_email: input.customer_email ?? null,
      delivery_location: input.delivery_location ?? null, issued_on: input.issued_on, validity_days: input.validity_days,
      valid_until: addDaysIso(input.issued_on, input.validity_days), currency: 'MXN', exchange_rate: input.exchange_rate ?? null,
      tax_rate: input.tax_rate, subtotal: t.subtotal, tax_total: t.tax_total, total: t.total,
      security_deposit: input.quote_type === 'rental' ? t.security_deposit : null,
      total_with_deposit: input.quote_type === 'rental' ? t.total_with_deposit : null,
      down_payment_pct: input.down_payment_pct ?? null, terms: input.terms, required_documents: input.required_documents ?? null,
      seller_name: input.seller_name, seller_phone: input.seller_phone ?? null, seller_whatsapp: input.seller_whatsapp ?? null,
      seller_email: input.seller_email ?? null, notes: input.notes ?? null, created_by: null,
      created_at: existing?.created_at ?? ts, updated_at: ts,
      sent_at: existing?.sent_at ?? null, accepted_at: existing?.accepted_at ?? null, rejected_at: existing?.rejected_at ?? null,
      revision: existing ? existing.revision + 1 : 1, items,
    };
  };

  return {
    listQuotesByLead: async leadId => delay(quotes.filter(q => q.lead_id === leadId).sort((a, b) => b.created_at.localeCompare(a.created_at))),
    listAllQuotes: async limit => delay([...quotes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit ?? 500)),
    createQuote: async input => { const q = build(input); quotes.push(q); return delay(q); },
    updateQuote: async (id, expected, input) => {
      const i = quotes.findIndex(x => x.id === id);
      if (i < 0) throw new Error('Cotización no encontrada.');
      const q = quotes[i];
      if (q.updated_at !== expected) throw new Error('La cotización cambió mientras la editabas. Recarga e intenta de nuevo.');
      if (!canEdit(q.status)) throw new Error(`La cotización ${q.folio} ya no se puede editar. Duplícala para crear una nueva.`);
      if (input.quote_type !== q.quote_type) throw new Error('El tipo de cotización no se puede cambiar. Crea una cotización nueva.');
      if (input.lead_id !== q.lead_id) throw new Error('La cotización pertenece a otro lead.');
      quotes[i] = build(input, q);
      return delay(quotes[i]);
    },
    transitionQuote: async (id, expected, to) => {
      const q = quotes.find(x => x.id === id);
      if (!q) throw new Error('Cotización no encontrada.');
      if (q.updated_at !== expected) throw new Error('La cotización cambió mientras la editabas. Recarga e intenta de nuevo.');
      if (!canTransition(q.status, to)) throw new Error(`No se puede pasar de ${q.status} a ${to}.`);
      q.status = to; q.updated_at = nowIso();
      if (to === 'sent') q.sent_at = q.updated_at;
      if (to === 'accepted') q.accepted_at = q.updated_at;
      if (to === 'rejected') q.rejected_at = q.updated_at;
      return delay(q);
    },
    listContainerPrices: async () => delay(containers),
    saveContainerPrice: async input => {
      const row: ContainerPrice = { ...input, id: input.id ?? uid('cp'), updated_at: nowIso(), updated_by: null };
      const i = containers.findIndex(c => c.id === row.id);
      if (i >= 0) containers[i] = row; else containers.push(row);
      return delay(row);
    },
    listServicePrices: async () => delay(services),
    deleteServicePrice: async id => {
      const i = services.findIndex(s => s.id === id);
      if (i < 0) throw new Error('No se pudo eliminar el servicio. Es posible que ya no exista.');
      services.splice(i, 1);
      return delay(undefined);
    },
    saveServicePrice: async input => {
      const row: ServicePrice = { ...input, id: input.id ?? uid('sp'), updated_at: nowIso() };
      const i = services.findIndex(c => c.id === row.id);
      if (i >= 0) services[i] = row; else services.push(row);
      return delay(row);
    },
    listExchangeRates: async () => delay(rates),
    addExchangeRate: async (rate, note) => {
      const row: ExchangeRate = { id: uid('fx'), rate, note, created_by: null, created_at: nowIso() };
      rates.unshift(row);
      return delay(row);
    },
    listFolioSeries: async () => delay(series),
    setNextFolioNumber: async (type: QuoteType, next) => {
      const s = series.find(x => x.quote_type === type)!;
      if (next - 1 < s.last_number) throw new Error('El siguiente folio no puede ser menor al último emitido.');
      s.last_number = next - 1;
      return delay(s);
    },
  };
}

export const PREVIEW_TODAY = todayIso();
