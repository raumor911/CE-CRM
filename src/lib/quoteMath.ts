import type { CreateQuoteInput, FolioSeries, PriceCurrency, Quote, QuoteItem, QuoteStatus } from '../types';

/* Todo el dinero se calcula en centavos enteros para que 0.1 + 0.2 nunca produzca $0.30000000000000004. */

export const toCents = (amount: number): number => Math.round((amount + Number.EPSILON) * 100);
export const fromCents = (cents: number): number => cents / 100;
export const round2 = (amount: number): number => fromCents(toCents(amount));

/** Convierte un precio de lista a pesos. Los precios en USD requieren un tipo de cambio válido. */
export function priceInMxn(price: number, currency: PriceCurrency, exchangeRate: number | null | undefined): number {
  if (currency === 'MXN') return round2(price);
  if (!exchangeRate || !(exchangeRate > 0)) {
    throw new Error('Falta el tipo de cambio USD a MXN para cotizar un precio en dólares.');
  }
  return round2(price * exchangeRate);
}

export interface QuoteTotals {
  lines: number[];
  subtotal: number;
  tax_total: number;
  total: number;
  security_deposit: number;
  total_with_deposit: number;
}

/** El IVA se calcula sobre el subtotal. El depósito en garantía no causa IVA y se suma después. */
export function calculateTotals(
  items: Array<{ quantity: number; unit_price: number }>,
  taxRate: number,
  securityDeposit = 0,
): QuoteTotals {
  const lineCents = items.map(i => Math.round(i.quantity * toCents(i.unit_price)));
  const subtotalCents = lineCents.reduce((a, b) => a + b, 0);
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents;
  const depositCents = toCents(securityDeposit);
  return {
    lines: lineCents.map(fromCents),
    subtotal: fromCents(subtotalCents),
    tax_total: fromCents(taxCents),
    total: fromCents(totalCents),
    security_deposit: fromCents(depositCents),
    total_with_deposit: fromCents(totalCents + depositCents),
  };
}

/** Reparte el total entre anticipo y saldo; el saldo absorbe el redondeo para que la suma sea exacta. */
export function splitDownPayment(total: number, pct: number): { down: number; balance: number } {
  const totalCents = toCents(total);
  const downCents = Math.round(totalCents * (pct / 100));
  return { down: fromCents(downCents), balance: fromCents(totalCents - downCents) };
}

/* ───────────── Fechas (YYYY-MM-DD, sin zona horaria) ───────────── */

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return todayIso(new Date(y, m - 1, d + days));
}

export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

/** Una cotización enviada está vencida cuando su vigencia terminó antes de hoy. No se guarda: se deriva. */
export function isQuoteExpired(quote: Pick<Quote, 'status' | 'valid_until'>, today: string = todayIso()): boolean {
  return quote.status === 'sent' && quote.valid_until < today;
}

/* ───────────── Estados ───────────── */

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['accepted', 'rejected', 'cancelled'],
  accepted: [],
  rejected: [],
  cancelled: [],
};

export const canTransition = (from: QuoteStatus, to: QuoteStatus): boolean => TRANSITIONS[from].includes(to);
export const nextStatuses = (from: QuoteStatus): QuoteStatus[] => TRANSITIONS[from];

/** Resumen de equipos para listados: "2 × 20 DC usado, 1 × 40 HC usado". Los servicios (flete, maniobras) no cuentan. */
export function summarizeProducts(items: Array<Pick<QuoteItem, 'kind' | 'description' | 'quantity'>>): string {
  return items
    .filter(i => i.kind === 'container')
    .map(i => `${i.quantity} × ${i.description}`)
    .join(', ');
}

const fold = (text: string): string => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Búsqueda del histórico: ignora acentos y mayúsculas; todas las palabras deben aparecer en folio, cliente, productos o destino. */
export function quoteMatchesQuery(
  quote: Pick<Quote, 'folio' | 'customer_name' | 'customer_company' | 'delivery_location' | 'items'>, query: string,
): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = fold([
    quote.folio, quote.customer_name, quote.customer_company ?? '', quote.delivery_location ?? '', summarizeProducts(quote.items),
  ].join(' '));
  return words.every(w => haystack.includes(w));
}

/** Se puede corregir una cotización mientras no sea un compromiso cerrado: borrador o enviada. */
export const canEdit = (status: QuoteStatus): boolean => status === 'draft' || status === 'sent';

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
};

/* ───────────── Folio ───────────── */

/** El número definitivo lo asigna la base de datos; esta función solo le da formato (y lo usa el modo demo). */
export function formatFolio(series: Pick<FolioSeries, 'prefix' | 'pad'>, number: number): string {
  return `${series.prefix}${String(number).padStart(series.pad, '0')}`;
}

/* ───────────── Importe con letra ───────────── */

const UNITS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce',
  'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós',
  'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const TENS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const HUNDREDS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos',
  'ochocientos', 'novecientos'];

function below100(n: number): string {
  if (n < 30) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? TENS[t] : `${TENS[t]} y ${UNITS[u]}`;
}

function below1000(n: number): string {
  if (n === 100) return 'cien';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts = [] as string[];
  if (h > 0) parts.push(HUNDREDS[h]);
  if (rest > 0) parts.push(below100(rest));
  return parts.join(' ');
}

/** Apócope ante sustantivo: "uno" → "un", "veintiuno" → "veintiún" ("veintiún mil", "treinta y un pesos"). */
function apocope(words: string): string {
  return words.replace(/veintiuno$/, 'veintiún').replace(/uno$/, 'un');
}

export function integerToSpanish(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1_000_000_000) throw new RangeError('Importe fuera de rango');
  if (n === 0) return 'cero';
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts = [] as string[];
  if (millions > 0) parts.push(millions === 1 ? 'un millón' : `${apocope(below1000(millions))} millones`);
  if (thousands > 0) parts.push(thousands === 1 ? 'mil' : `${apocope(below1000(thousands))} mil`);
  if (rest > 0) parts.push(below1000(rest));
  return parts.join(' ');
}

/** "Ciento treinta y ocho mil quinientos sesenta y dos pesos 00/100 M.N." */
export function amountToSpanishWords(amount: number): string {
  const cents = toCents(amount);
  const pesos = Math.floor(cents / 100);
  const centavos = String(cents % 100).padStart(2, '0');
  const body = integerToSpanish(pesos);
  const exactMillion = pesos > 0 && pesos % 1_000_000 === 0;
  const words = pesos === 1 ? 'un peso' : `${exactMillion ? body : apocope(body)}${exactMillion ? ' de' : ''} pesos`;
  const sentence = words.charAt(0).toUpperCase() + words.slice(1);
  return `${sentence} ${centavos}/100 M.N.`;
}

/* ───────────── Validación de captura ───────────── */

export function validateQuoteInput(input: CreateQuoteInput): string[] {
  const errors: string[] = [];
  if (!input.customer_name.trim()) errors.push('Falta el nombre del cliente.');
  if (input.items.length === 0) errors.push('Agrega al menos un renglón.');
  if (!input.items.some(i => i.kind === 'container')) errors.push('Agrega al menos un contenedor.');
  input.items.forEach((item, idx) => {
    if (!item.description.trim()) errors.push(`El renglón ${idx + 1} no tiene descripción.`);
    if (!(item.quantity > 0) || !Number.isInteger(item.quantity)) errors.push(`El renglón ${idx + 1} necesita una cantidad entera mayor a cero.`);
    if (!(item.unit_price >= 0) || !Number.isFinite(item.unit_price)) errors.push(`El renglón ${idx + 1} tiene un precio inválido.`);
  });
  if (!(input.validity_days > 0)) errors.push('La vigencia debe ser de al menos un día.');
  if (!(input.tax_rate >= 0 && input.tax_rate < 1)) errors.push('La tasa de IVA debe estar entre 0 y 1.');
  if (input.quote_type === 'rental' && (input.security_deposit ?? 0) < 0) errors.push('El depósito en garantía no puede ser negativo.');
  return errors;
}

/* ───────────── Formato ───────────── */

/** "$119,450.00": igual que en las cotizaciones impresas de la empresa. */
export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Medida con su unidad. Sin `decimals` quita los ceros de sobra (6 → "6 m", 2.4 → "2.4 m"). */
export function formatMeasure(value: number | null | undefined, unit: string, decimals?: number): string | null {
  if (value === null || value === undefined) return null;
  const text = decimals !== undefined
    ? value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : String(value);
  return `${text}${unit ? ` ${unit}` : ''}`;
}
