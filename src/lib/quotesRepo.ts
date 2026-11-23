import { supabase } from './supabase';
import type {
  ContainerPrice, CreateQuoteInput, ExchangeRate, FolioSeries, Quote, QuoteStatus, QuoteType, ServicePrice,
} from '../types';

export type ContainerPriceInput = Omit<ContainerPrice, 'id' | 'updated_at' | 'updated_by'> & { id?: string };
export type ServicePriceInput = Omit<ServicePrice, 'id' | 'updated_at'> & { id?: string };

/**
 * Acceso a datos de cotizaciones. Hay dos implementaciones: Supabase (producción) y una en memoria
 * con datos sintéticos (vista previa de desarrollo). La interfaz es lo único que conocen los hooks.
 */
export interface QuotesRepo {
  listQuotesByLead(leadId: string): Promise<Quote[]>;
  /** Histórico de todas las cotizaciones, de la más reciente a la más antigua. */
  listAllQuotes(limit?: number): Promise<Quote[]>;
  createQuote(input: CreateQuoteInput): Promise<Quote>;
  transitionQuote(id: string, expectedUpdatedAt: string, to: QuoteStatus): Promise<Quote>;
  /** Corrige una cotización (borrador o enviada) conservando su folio. Falla si alguien la cambió antes. */
  updateQuote(id: string, expectedUpdatedAt: string, input: CreateQuoteInput): Promise<Quote>;

  listContainerPrices(): Promise<ContainerPrice[]>;
  saveContainerPrice(input: ContainerPriceInput): Promise<ContainerPrice>;
  listServicePrices(): Promise<ServicePrice[]>;
  saveServicePrice(input: ServicePriceInput): Promise<ServicePrice>;
  listExchangeRates(): Promise<ExchangeRate[]>;
  addExchangeRate(rate: number, note: string | null): Promise<ExchangeRate>;
  listFolioSeries(): Promise<FolioSeries[]>;
  setNextFolioNumber(type: QuoteType, nextNumber: number): Promise<FolioSeries>;
}

const sortItems = (q: Quote): Quote => ({ ...q, items: [...(q.items ?? [])].sort((a, b) => a.position - b.position) });

/**
 * Deja rastro en el expediente del lead. Es "al mejor esfuerzo": el esquema de lead_activities no está en las
 * migraciones del repo, así que un fallo aquí nunca debe impedir guardar o actualizar la cotización.
 */
async function logLeadActivity(leadId: string, description: string): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    await supabase.from('lead_activities').insert({ lead_id: leadId, user_id: auth.user.id, type: 'Presupuesto', description });
  } catch {
    console.warn('No se pudo registrar la actividad de cotización en el lead.');
  }
}

const STATUS_ACTIVITY: Partial<Record<QuoteStatus, string>> = {
  sent: 'enviada al cliente',
  accepted: 'aceptada por el cliente',
  rejected: 'rechazada por el cliente',
  cancelled: 'cancelada',
};

async function fetchQuote(id: string): Promise<Quote> {
  const { data, error } = await supabase.from('quotes').select('*, items:quote_items(*)').eq('id', id).single();
  if (error) throw error;
  return sortItems(data as Quote);
}

export const supabaseQuotesRepo: QuotesRepo = {
  async listQuotesByLead(leadId) {
    const { data, error } = await supabase
      .from('quotes').select('*, items:quote_items(*)').eq('lead_id', leadId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Quote[]).map(sortItems);
  },

  async listAllQuotes(limit = 500) {
    const { data, error } = await supabase
      .from('quotes').select('*, items:quote_items(*)').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return (data as Quote[]).map(sortItems);
  },

  async createQuote(input) {
    const { items, ...quote } = input;
    // Los totales NO se envían: el servidor los calcula a partir de renglones, IVA y depósito.
    const { data, error } = await supabase.rpc('create_quote', { p_quote: quote, p_items: items });
    if (error) throw error;
    const created = await fetchQuote(data as string);
    await logLeadActivity(created.lead_id, `Cotización ${created.folio} creada (${created.quote_type === 'sale' ? 'venta' : 'renta'}).`);
    return created;
  },

  async updateQuote(id, expectedUpdatedAt, input) {
    const { items, ...quote } = input;
    const { error } = await supabase.rpc('update_quote', {
      p_id: id, p_expected_updated_at: expectedUpdatedAt, p_quote: quote, p_items: items,
    });
    if (error) throw error;
    const updated = await fetchQuote(id);
    await logLeadActivity(updated.lead_id, `Cotización ${updated.folio} editada (revisión ${updated.revision}).`);
    return updated;
  },

  async transitionQuote(id, expectedUpdatedAt, to) {
    const { error } = await supabase.rpc('transition_quote', {
      p_id: id, p_expected_updated_at: expectedUpdatedAt, p_to_status: to,
    });
    if (error) throw error;
    const updated = await fetchQuote(id);
    const what = STATUS_ACTIVITY[to];
    if (what) await logLeadActivity(updated.lead_id, `Cotización ${updated.folio} ${what}.`);
    return updated;
  },

  async listContainerPrices() {
    const { data, error } = await supabase.from('quote_container_prices').select('*').order('mode').order('name');
    if (error) throw error;
    return data as ContainerPrice[];
  },
  async saveContainerPrice(input) {
    const { data: auth } = await supabase.auth.getUser();
    const row = { ...input, updated_at: new Date().toISOString(), updated_by: auth.user?.id ?? null };
    const { data, error } = await supabase.from('quote_container_prices').upsert(row).select().single();
    if (error) throw error;
    return data as ContainerPrice;
  },

  async listServicePrices() {
    const { data, error } = await supabase.from('quote_service_prices').select('*').order('sort_order').order('name');
    if (error) throw error;
    return data as ServicePrice[];
  },
  async saveServicePrice(input) {
    const row = { ...input, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('quote_service_prices').upsert(row).select().single();
    if (error) throw error;
    return data as ServicePrice;
  },

  async listExchangeRates() {
    const { data, error } = await supabase.from('quote_exchange_rates').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return data as ExchangeRate[];
  },
  async addExchangeRate(rate, note) {
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('quote_exchange_rates').insert({ rate, note, created_by: auth.user?.id ?? null }).select().single();
    if (error) throw error;
    return data as ExchangeRate;
  },

  async listFolioSeries() {
    const { data, error } = await supabase.from('quote_folio_series').select('*');
    if (error) throw error;
    return data as FolioSeries[];
  },
  async setNextFolioNumber(type, nextNumber) {
    const { data, error } = await supabase.rpc('set_quote_folio_next', { p_quote_type: type, p_next_number: nextNumber });
    if (error) throw error;
    return data as FolioSeries;
  },
};
