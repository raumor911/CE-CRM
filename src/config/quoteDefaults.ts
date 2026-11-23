import type { QuoteType } from '../types';

/** Datos fijos del emisor que aparecen en toda cotización. Se toman de las cotizaciones vigentes de la empresa. */
export const QuoteIssuer = {
  companyName: 'Creativos Espacios',
  rfc: 'ICE130415IUA',
  address: 'Av. del Árbol 104, Col. Lomas de San Lorenzo, C.P. 09780, Iztapalapa, CDMX',
  phone: '55 54 26 99 41',
  hours: 'Lunes a viernes, 9:00 a 18:00 h',
  /** Para cambiar el logo, reemplaza este archivo (o apunta la ruta a otro) sin tocar el diseño del PDF. */
  logoPath: '/media/branding/creativos-espacios-logo.jpg',
} as const;

export const QuoteSellerDefaults = {
  name: 'Andrea García Andrade',
  phone: '55 54 26 99 41',
  whatsapp: '229 184 6751',
  email: 'ventas@creativosespacios.mx',
} as const;

export const TAX_RATE = 0.16;

export const QuoteTypeDefaults: Record<QuoteType, { validityDays: number; downPaymentPct: number | null }> = {
  sale: { validityDays: 3, downPaymentPct: 70 },
  rental: { validityDays: 5, downPaymentPct: null },
};

export const DEFAULT_RENTAL_DOCUMENTS =
  'Acta constitutiva (persona moral), poder notarial, INE del representante legal, comprobante de domicilio y RFC para facturación. ' +
  'También 3 referencias comerciales y 3 contactos dentro de la empresa. Se requiere contrato firmado por ambas partes.';

/** Términos por defecto; el vendedor puede editarlos en cada cotización y lo escrito queda guardado con ella. */
export function defaultTerms(type: QuoteType, validityDays: number, downPaymentPct: number | null): string[] {
  const days = (n: number) => (n === 1 ? '1 día' : `${n} días`);
  if (type === 'sale') {
    const pct = downPaymentPct ?? 70;
    return [
      'Precios más IVA.',
      `Pago del ${pct} % de anticipo y ${100 - pct} % contra entrega.`,
      'Entrega en 5 días hábiles como máximo. Si el cliente realiza el transporte, tiene 5 días para retirar la unidad; después se genera un cargo por estadía.',
      'Las maniobras de descarga son por cuenta del cliente, con grúa o montacargas de 4 toneladas mínimo.',
      `Esta cotización tiene vigencia de ${days(validityDays)} a partir de la fecha indicada.`,
      'En caso de devolución de la compra se aplica un cargo del 15 % sobre el anticipo, por costos de operación de la gestión.',
    ];
  }
  return [
    'Precios más IVA. El depósito en garantía no causa IVA.',
    'Pago por adelantado del 100 %.',
    'Entrega en 4 días hábiles aproximadamente.',
    'Las maniobras de descarga en sitio están incluidas (libre de maniobras y a ras de piso).',
    `Esta cotización tiene vigencia de ${days(validityDays)} a partir de la fecha indicada.`,
  ];
}

export const QUOTE_TYPE_LABEL: Record<QuoteType, string> = { sale: 'Venta', rental: 'Renta' };
