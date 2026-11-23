import { createElement } from 'react';
import type { Quote } from '../types';

/**
 * Genera el PDF de una cotización en el navegador. La librería (~1 MB) y el diseño se cargan bajo demanda,
 * solo la primera vez que alguien pide un PDF, para no pesar en el arranque de la app.
 */
export async function generateQuotePdf(quote: Quote): Promise<Blob> {
  const [{ pdf }, { QuoteDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('../components/quotes/QuoteDocument'),
  ]);
  return pdf(createElement(QuoteDocument, { quote })).toBlob();
}

export const quotePdfFileName = (quote: Quote): string =>
  `Cotizacion-${quote.quote_type === 'sale' ? 'venta' : 'renta'}-${quote.folio}.pdf`;

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
