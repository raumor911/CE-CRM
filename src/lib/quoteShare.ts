import type { Quote } from '../types';
import { QuoteIssuer } from '../config/quoteDefaults';
import { formatIsoDate, formatMoney } from './quoteMath';

/**
 * Número listo para wa.me (solo dígitos, con lada de país), o null si no alcanza para marcar.
 * Supone México cuando el número trae 10 dígitos. Acepta "+52 1 …" y "52 …" (el 1 móvil se descarta,
 * WhatsApp ya no lo pide) y respeta otros países si el número ya trae su código.
 */
export function normalizeWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10) return `52${d}`;
  if (d.length === 12 && d.startsWith('52')) return d;
  if (d.length === 13 && d.startsWith('521')) return `52${d.slice(3)}`;
  if (d.length >= 11 && d.length <= 15) return d;
  return null;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const email = raw?.trim().toLowerCase();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

const firstName = (full: string): string => full.trim().split(/\s+/)[0] ?? '';

/** Mensaje de cortesía. El PDF no viaja en el enlace: se adjunta a mano (ver QuotePdfPreview). */
export function buildShareMessage(quote: Quote): string {
  const kind = quote.quote_type === 'sale' ? 'venta' : 'renta';
  const total = quote.total_with_deposit ?? quote.total;
  const totalLabel = quote.total_with_deposit !== null ? 'Total con depósito en garantía' : 'Total con IVA';
  const name = firstName(quote.customer_name);
  return [
    `Hola${name ? ` ${name}` : ''}, te comparto la cotización ${quote.folio} de ${kind} de contenedores de ${QuoteIssuer.companyName}.`,
    '',
    `${totalLabel}: ${formatMoney(total)} MXN`,
    `Vigente hasta el ${formatIsoDate(quote.valid_until)}.`,
    '',
    'Te adjunto el PDF con el detalle. Quedo al pendiente de cualquier duda.',
    '',
    quote.seller_name,
    quote.seller_whatsapp ? `WhatsApp ${quote.seller_whatsapp}` : quote.seller_phone ? `Tel. ${quote.seller_phone}` : '',
  ].filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== '')).join('\n').trim();
}

export const buildShareSubject = (quote: Quote): string =>
  `Cotización ${quote.folio} - ${QuoteIssuer.companyName}`;

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function mailtoUrl(email: string, subject: string, body: string): string {
  const crlf = body.replace(/\r?\n/g, '\r\n');
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlf)}`;
}
