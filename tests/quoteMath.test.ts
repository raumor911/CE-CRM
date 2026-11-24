import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addDaysIso, amountToSpanishWords, calculateTotals, canEdit, canTransition, formatFolio, integerToSpanish,
  isQuoteExpired, priceInMxn, quoteMatchesQuery, splitDownPayment, summarizeProducts, validateQuoteInput,
} from '../src/lib/quoteMath';
import { splitCsvLines } from '../src/lib/importLeads';
import {
  buildShareMessage, buildShareSubject, gmailComposeUrl, mailtoUrl, normalizeEmail, normalizeWhatsAppPhone, whatsappUrl,
} from '../src/lib/quoteShare';
import { createMemoryQuotesRepo } from '../src/lib/quotesRepoMemory';
import type { CreateQuoteInput, Quote } from '../src/types';

test('la cotización de venta del PDF de ejemplo cuadra al centavo', () => {
  const unit = priceInMxn(2500, 'USD', 19.45);
  assert.equal(unit, 48625);
  const t = calculateTotals([
    { quantity: 2, unit_price: unit },
    { quantity: 2, unit_price: 9500 },
    { quantity: 2, unit_price: 1600 },
    { quantity: 2, unit_price: 0 },
  ], 0.16);
  assert.equal(t.subtotal, 119450);
  assert.equal(t.tax_total, 19112);
  assert.equal(t.total, 138562);
});

test('en renta el depósito en garantía no causa IVA y se suma al final', () => {
  const t = calculateTotals([
    { quantity: 1, unit_price: 4500 },
    { quantity: 2, unit_price: 4500 },
    { quantity: 1, unit_price: 1400 },
  ], 0.16, 4500);
  assert.equal(t.subtotal, 14900);
  assert.equal(t.tax_total, 2384);
  assert.equal(t.total, 17284);
  assert.equal(t.total_with_deposit, 21784);
});

test('no acumula error de punto flotante', () => {
  const t = calculateTotals([{ quantity: 3, unit_price: 0.1 }, { quantity: 1, unit_price: 0.2 }], 0);
  assert.equal(t.total, 0.5);
  assert.equal(priceInMxn(1234.56, 'USD', 18.7321), 23125.9);
});

test('el precio en USD exige tipo de cambio válido', () => {
  assert.throws(() => priceInMxn(100, 'USD', null));
  assert.throws(() => priceInMxn(100, 'USD', 0));
  assert.equal(priceInMxn(4500, 'MXN', null), 4500);
});

test('anticipo y saldo suman exactamente el total', () => {
  assert.deepEqual(splitDownPayment(138562, 70), { down: 96993.4, balance: 41568.6 });
  const odd = splitDownPayment(100.01, 33);
  assert.equal(Math.round((odd.down + odd.balance) * 100), 10001);
});

test('importe con letra', () => {
  assert.equal(amountToSpanishWords(138562), 'Ciento treinta y ocho mil quinientos sesenta y dos pesos 00/100 M.N.');
  assert.equal(amountToSpanishWords(21784), 'Veintiún mil setecientos ochenta y cuatro pesos 00/100 M.N.');
  assert.equal(amountToSpanishWords(17284), 'Diecisiete mil doscientos ochenta y cuatro pesos 00/100 M.N.');
  assert.equal(amountToSpanishWords(1), 'Un peso 00/100 M.N.');
  assert.equal(amountToSpanishWords(21), 'Veintiún pesos 00/100 M.N.');
  assert.equal(amountToSpanishWords(31000), 'Treinta y un mil pesos 00/100 M.N.');
  assert.equal(amountToSpanishWords(100), 'Cien pesos 00/100 M.N.');
  assert.equal(amountToSpanishWords(101), 'Ciento un pesos 00/100 M.N.');
  assert.equal(amountToSpanishWords(1000), 'Mil pesos 00/100 M.N.');
  assert.equal(amountToSpanishWords(1000000), 'Un millón de pesos 00/100 M.N.');
  assert.equal(amountToSpanishWords(2500000.5), 'Dos millones quinientos mil pesos 50/100 M.N.');
  assert.equal(amountToSpanishWords(0.99), 'Cero pesos 99/100 M.N.');
  assert.equal(integerToSpanish(999999), 'novecientos noventa y nueve mil novecientos noventa y nueve');
});

test('vigencia: suma días calendario sin desfase de zona horaria', () => {
  assert.equal(addDaysIso('2026-11-23', 3), '2026-11-26');
  assert.equal(addDaysIso('2026-11-09', 5), '2026-11-14');
  assert.equal(addDaysIso('2026-12-30', 3), '2027-01-02');
});

test('vencida se deriva: solo aplica a cotizaciones enviadas', () => {
  assert.equal(isQuoteExpired({ status: 'sent', valid_until: '2026-11-20' }, '2026-11-23'), true);
  assert.equal(isQuoteExpired({ status: 'sent', valid_until: '2026-11-23' }, '2026-11-23'), false);
  assert.equal(isQuoteExpired({ status: 'accepted', valid_until: '2026-01-01' }, '2026-11-23'), false);
});

test('transiciones de estado permitidas', () => {
  assert.equal(canTransition('draft', 'sent'), true);
  assert.equal(canTransition('sent', 'accepted'), true);
  assert.equal(canTransition('draft', 'accepted'), false);
  assert.equal(canTransition('accepted', 'draft'), false);
  assert.equal(canTransition('cancelled', 'sent'), false);
});

test('folio: prefijo y relleno por serie', () => {
  assert.equal(formatFolio({ prefix: '', pad: 5 }, 21789), '21789');
  assert.equal(formatFolio({ prefix: 'ED', pad: 4 }, 80), 'ED0080');
  assert.equal(formatFolio({ prefix: 'ED', pad: 4 }, 12345), 'ED12345');
});

test('validación de captura', () => {
  const base: CreateQuoteInput = {
    lead_id: 'l1', quote_type: 'sale', customer_name: 'Sergio', issued_on: '2026-11-23', validity_days: 3,
    tax_rate: 0.16, terms: [], seller_name: 'Andrea',
    items: [{ kind: 'container', description: '20 DC usado', detail: null, quantity: 2, unit_price: 100, unit_price_usd: null, specs: null, photo_url: null }],
  };
  assert.deepEqual(validateQuoteInput(base), []);
  assert.ok(validateQuoteInput({ ...base, customer_name: ' ' }).length > 0);
  assert.ok(validateQuoteInput({ ...base, items: [] }).length > 0);
  assert.ok(validateQuoteInput({ ...base, items: [{ ...base.items[0], quantity: 1.5 }] }).length > 0);
  assert.ok(validateQuoteInput({ ...base, items: [{ ...base.items[0], kind: 'delivery' }] }).length > 0);
});

test('envío: teléfono de WhatsApp normalizado', () => {
  assert.equal(normalizeWhatsAppPhone('229 184 6751'), '522291846751');
  assert.equal(normalizeWhatsAppPhone('(55) 5426-9941'), '525554269941');
  assert.equal(normalizeWhatsAppPhone('+52 1 229 184 6751'), '522291846751');
  assert.equal(normalizeWhatsAppPhone('52 229 184 6751'), '522291846751');
  assert.equal(normalizeWhatsAppPhone('0052 229 184 6751'), '522291846751');
  assert.equal(normalizeWhatsAppPhone('+1 415 555 2671'), '14155552671');
  assert.equal(normalizeWhatsAppPhone('1234'), null);
  assert.equal(normalizeWhatsAppPhone(''), null);
  assert.equal(normalizeWhatsAppPhone(null), null);
});

test('envío: correo válido o nulo', () => {
  assert.equal(normalizeEmail(' CLIENTE@Gmail.com '), 'cliente@gmail.com');
  assert.equal(normalizeEmail('sin-arroba'), null);
  assert.equal(normalizeEmail('a@b'), null);
  assert.equal(normalizeEmail(undefined), null);
});

test('envío: mensaje y enlaces', () => {
  const quote = {
    folio: '21789', quote_type: 'sale', customer_name: 'Sergio Pérez', valid_until: '2026-11-26',
    total: 69281, total_with_deposit: null, seller_name: 'Andrea García Andrade', seller_whatsapp: '229 184 6751', seller_phone: null,
  } as unknown as Quote;
  const msg = buildShareMessage(quote);
  assert.match(msg, /^Hola Sergio, te comparto la cotización 21789 de venta/);
  assert.match(msg, /Total con IVA: \$69,281\.00 MXN/);
  assert.match(msg, /Vigente hasta el 26\/11\/2026/);
  assert.doesNotMatch(msg, /\n\n\n/);
  assert.equal(whatsappUrl('522291846751', 'a b\nc'), 'https://wa.me/522291846751?text=a%20b%0Ac');
  assert.equal(mailtoUrl('x@y.com', 'Cotización 1', 'l1\nl2'), 'mailto:x@y.com?subject=Cotizaci%C3%B3n%201&body=l1%0D%0Al2');
  assert.equal(buildShareSubject(quote), 'Cotización 21789 - Creativos Espacios');

  const rental = { ...quote, quote_type: 'rental', total_with_deposit: 21784 } as unknown as Quote;
  assert.match(buildShareMessage(rental), /de renta de contenedores/);
  assert.match(buildShareMessage(rental), /Total con depósito en garantía: \$21,784\.00 MXN/);
});

test('edición: solo borrador y enviada se pueden corregir', () => {
  assert.equal(canEdit('draft'), true);
  assert.equal(canEdit('sent'), true);
  for (const closed of ['accepted', 'rejected', 'cancelled'] as const) assert.equal(canEdit(closed), false);
});

test('edición: conserva folio, recalcula totales y sube la revisión', async () => {
  const repo = createMemoryQuotesRepo();
  const input = (qty: number, price: number): CreateQuoteInput => ({
    lead_id: 'lead-1', quote_type: 'sale', customer_name: 'Sergio', issued_on: '2026-11-23', validity_days: 3,
    tax_rate: 0.16, terms: [], seller_name: 'Andrea',
    items: [{ kind: 'container', description: '20 DC usado', detail: null, quantity: qty, unit_price: price, unit_price_usd: null, specs: null, photo_url: null }],
  });
  const created = await repo.createQuote(input(1, 100));
  assert.equal(created.revision, 1);
  assert.equal(created.total, 116);

  const sent = await repo.transitionQuote(created.id, created.updated_at, 'sent');
  await new Promise(r => setTimeout(r, 5));
  const fixed = await repo.updateQuote(sent.id, sent.updated_at, { ...input(2, 100), customer_name: 'Sergio Pérez' });
  assert.equal(fixed.folio, created.folio);
  assert.equal(fixed.status, 'sent');
  assert.equal(fixed.revision, 2);
  assert.equal(fixed.customer_name, 'Sergio Pérez');
  assert.equal(fixed.total, 232);
  assert.equal(fixed.items.length, 1);
  assert.equal(fixed.sent_at, sent.sent_at);

  // Bloqueo optimista: usar una versión vieja falla.
  await assert.rejects(repo.updateQuote(sent.id, sent.updated_at, input(3, 100)), /cambió mientras/);
  // El tipo no se cambia al editar.
  await assert.rejects(repo.updateQuote(fixed.id, fixed.updated_at, { ...input(1, 100), quote_type: 'rental' }), /tipo/);
  // Una vez aceptada, queda congelada.
  await new Promise(r => setTimeout(r, 5));
  const accepted = await repo.transitionQuote(fixed.id, fixed.updated_at, 'accepted');
  await assert.rejects(repo.updateQuote(accepted.id, accepted.updated_at, input(1, 100)), /ya no se puede editar/);
});

test('histórico: resumen de productos y búsqueda sin acentos', () => {
  const quote = {
    folio: '21789', customer_name: 'José Pérez', customer_company: 'Bodegas del Sur', delivery_location: 'Tizayuca, Hidalgo',
    items: [
      { kind: 'container', description: '20 DC usado', quantity: 2 },
      { kind: 'container', description: '40 HC usado', quantity: 1 },
      { kind: 'delivery', description: 'Logística de entrega', quantity: 3 },
    ],
  } as unknown as Quote;
  assert.equal(summarizeProducts(quote.items), '2 × 20 DC usado, 1 × 40 HC usado');
  assert.equal(summarizeProducts([]), '');
  assert.equal(quoteMatchesQuery(quote, ''), true);
  assert.equal(quoteMatchesQuery(quote, '21789'), true);
  assert.equal(quoteMatchesQuery(quote, 'jose perez'), true);
  assert.equal(quoteMatchesQuery(quote, 'TIZAYUCA hidalgo'), true);
  assert.equal(quoteMatchesQuery(quote, '40 hc'), true);
  assert.equal(quoteMatchesQuery(quote, 'bodegas'), true);
  assert.equal(quoteMatchesQuery(quote, 'logistica'), false); // los servicios no se buscan como producto
  assert.equal(quoteMatchesQuery(quote, 'monterrey'), false);
});

test('compatibilidad: CSV con saltos de línea de Windows y BOM de Excel', () => {
  assert.deepEqual(splitCsvLines('a,b\nc,d'), ['a,b', 'c,d']);
  assert.deepEqual(splitCsvLines('a,b\r\nc,d\r\n'), ['a,b', 'c,d', '']);
  assert.deepEqual(splitCsvLines('a,b\rc,d'), ['a,b', 'c,d']);
  assert.deepEqual(splitCsvLines('﻿Oportunidad_ID,Nombre\r\n1,Sergio'), ['Oportunidad_ID,Nombre', '1,Sergio']);
  // La última columna ya no arrastra un "\r" invisible.
  assert.ok(splitCsvLines('x,Cierre\r\n').every(line => !line.includes('\r')));
});

test('compatibilidad: enlace de redacción en Gmail', () => {
  assert.equal(
    gmailComposeUrl('a@b.com', 'Cotización 1', 'hola mundo'),
    'https://mail.google.com/mail/?view=cm&fs=1&to=a%40b.com&su=Cotizaci%C3%B3n%201&body=hola%20mundo',
  );
});

test('servicios: alta, cambio y baja del catálogo', async () => {
  const repo = createMemoryQuotesRepo();
  const before = (await repo.listServicePrices()).length;
  const created = await repo.saveServicePrice({
    kind: 'other', name: 'Gestoría de permisos', detail: null, default_unit_price: 800, applies_to: 'both', sort_order: 9, is_active: true,
  });
  assert.equal((await repo.listServicePrices()).length, before + 1);
  const changed = await repo.saveServicePrice({ ...created, default_unit_price: 950 });
  assert.equal(changed.id, created.id);
  assert.equal((await repo.listServicePrices()).find(s => s.id === created.id)?.default_unit_price, 950);
  await repo.deleteServicePrice(created.id);
  assert.equal((await repo.listServicePrices()).length, before);
  await assert.rejects(repo.deleteServicePrice(created.id), /No se pudo eliminar/);
});
