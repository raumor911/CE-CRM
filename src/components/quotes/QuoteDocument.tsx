import React from 'react';
import { Document, Font, Image, Page, Rect, StyleSheet, Svg, Text, View } from '@react-pdf/renderer';
import type { Quote, QuoteItem } from '../../types';
import { QuoteIssuer } from '../../config/quoteDefaults';
import { amountToSpanishWords, formatIsoDate, formatMeasure, formatMoney, splitDownPayment } from '../../lib/quoteMath';

const origin = typeof window !== 'undefined' ? window.location.origin : '';
export const assetUrl = (path: string): string => (/^(https?:|data:|blob:)/.test(path) ? path : `${origin}${path}`);

Font.register({
  family: 'Barlow',
  fonts: [
    { src: assetUrl('/fonts/Barlow-Regular.ttf'), fontWeight: 400 },
    { src: assetUrl('/fonts/Barlow-Medium.ttf'), fontWeight: 500 },
    { src: assetUrl('/fonts/Barlow-SemiBold.ttf'), fontWeight: 600 },
  ],
});
Font.register({
  family: 'BarlowCondensed',
  fonts: [
    { src: assetUrl('/fonts/BarlowCondensed-SemiBold.ttf'), fontWeight: 600 },
    { src: assetUrl('/fonts/BarlowCondensed-Bold.ttf'), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback(word => [word]); // sin cortes de palabra con guion

const C = {
  steel: '#16222d', steel2: '#2b3c4a', cyan: '#0095d9', mist: '#eef2f5',
  line: '#d3dae0', text: '#1a2530', muted: '#5a6875', onDark: '#c4d0da',
};

const s = StyleSheet.create({
  page: { fontFamily: 'Barlow', fontSize: 9, color: C.text, paddingBottom: 64, lineHeight: 1.35 },
  body: { paddingHorizontal: 40, paddingTop: 14 },
  muted: { color: C.muted },
  small: { fontSize: 7.8, color: C.muted },
  semi: { fontWeight: 600 },

  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  plate: { flexDirection: 'row', borderWidth: 1.2, borderColor: C.steel },
  plateCell: { paddingHorizontal: 9, paddingTop: 3, paddingBottom: 4 },
  plateType: { backgroundColor: C.steel },
  plateValue: { fontFamily: 'BarlowCondensed', fontWeight: 700, fontSize: 20, letterSpacing: 1.6, color: C.steel, lineHeight: 1.05 },

  titleRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderBottomWidth: 0.75, borderBottomColor: C.line, paddingBottom: 7 },
  h1: { fontFamily: 'BarlowCondensed', fontWeight: 600, fontSize: 30, lineHeight: 1, color: C.steel },
  dates: { flexDirection: 'row' },
  dateBox: { marginLeft: 20, alignItems: 'flex-end' },
  dateValue: { fontWeight: 600, fontSize: 10 },

  parties: { flexDirection: 'row', marginTop: 10 },
  party: { flex: 1 },
  partyTitle: { fontFamily: 'BarlowCondensed', fontWeight: 600, fontSize: 11, letterSpacing: 0.4, color: C.cyan, marginBottom: 2 },
  who: { fontWeight: 600, fontSize: 11 },

  unit: { marginTop: 10, paddingVertical: 10, borderTopWidth: 1.5, borderTopColor: C.steel, borderBottomWidth: 0.75, borderBottomColor: C.line, flexDirection: 'row' },
  photoBox: { width: 138, height: 124, backgroundColor: C.mist, marginRight: 16 },
  photo: { width: 138, height: 124, objectFit: 'contain' },
  unitName: { fontFamily: 'BarlowCondensed', fontWeight: 600, fontSize: 18, lineHeight: 1.05, color: C.steel },
  specs: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 7 },
  spec: { width: '33.33%', marginBottom: 5 },
  specValue: { fontWeight: 600, fontSize: 10 },
  priceRow: { marginTop: 'auto', paddingTop: 6, borderTopWidth: 0.75, borderTopColor: C.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  priceAmt: { fontFamily: 'BarlowCondensed', fontWeight: 600, fontSize: 18, color: C.steel },

  th: { flexDirection: 'row', paddingTop: 7, paddingBottom: 4 },
  tr: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 0.75, borderBottomColor: C.line },
  cConcept: { flex: 1 },
  cQty: { width: 42, textAlign: 'right' },
  cUnit: { width: 88, textAlign: 'right' },
  cTotal: { width: 88, textAlign: 'right' },

  sumRow: { flexDirection: 'row', marginTop: 11 },
  sumLeft: { flex: 1, paddingRight: 20 },
  words: { fontWeight: 500, fontSize: 10, marginTop: 1, lineHeight: 1.3 },
  split: { flexDirection: 'row', marginTop: 9 },
  splitBox: { marginRight: 18 },
  splitValue: { fontWeight: 600, fontSize: 10.5 },
  panel: { width: 206, backgroundColor: C.steel, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 10 },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  panelLabel: { color: C.onDark },
  panelValue: { color: '#ffffff' },
  panelTotal: { marginTop: 5, paddingTop: 6, borderTopWidth: 1.2, borderTopColor: C.cyan, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  panelBig: { fontFamily: 'BarlowCondensed', fontWeight: 700, fontSize: 24, color: '#ffffff', lineHeight: 1 },
  panelDep: { marginTop: 6, paddingTop: 5, borderTopWidth: 0.75, borderTopColor: '#3b4d5c' },
  panelGrand: { marginTop: 7, marginHorizontal: -12, marginBottom: -10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: C.cyan, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },

  termsTitle: { fontFamily: 'BarlowCondensed', fontWeight: 600, fontSize: 11, letterSpacing: 0.4, color: C.cyan, marginBottom: 3 },
  termsCols: { flexDirection: 'row' },
  termsCol: { flex: 1, paddingRight: 14 },
  term: { flexDirection: 'row', marginBottom: 2.5, fontSize: 7.9, color: '#35424e', lineHeight: 1.4 },
  bullet: { width: 9, color: C.cyan },
  docs: { marginTop: 7, padding: 7, backgroundColor: C.mist, fontSize: 7.9, color: '#35424e', lineHeight: 1.4 },

  footer: { position: 'absolute', left: 40, right: 40, bottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 0.75, borderTopColor: C.line, paddingTop: 7, fontSize: 7.8, color: C.muted, lineHeight: 1.4 },
});

/** Franja corrugada: la pared de un contenedor vista de cerca, con una línea cian. */
const Rib: React.FC<{ bottom?: boolean }> = ({ bottom }) => {
  const W = 612;
  const h = bottom ? 8 : 16;
  const ribs = Array.from({ length: Math.ceil(W / 6.75) }, (_, i) => i);
  return (
    <Svg width={W} height={h + 2} fixed={bottom} style={bottom ? { position: 'absolute', bottom: 0, left: 0 } : undefined}>
      <Rect x={0} y={bottom ? 2 : 0} width={W} height={h} fill={C.steel} />
      {ribs.map(i => <Rect key={i} x={i * 6.75 + 3.75} y={bottom ? 2 : 0} width={1.5} height={h} fill={C.steel2} />)}
      <Rect x={0} y={bottom ? 0 : h} width={W} height={2} fill={C.cyan} />
    </Svg>
  );
};

const Spec: React.FC<{ label: string; value: string | null }> = ({ label, value }) =>
  value ? (
    <View style={s.spec}>
      <Text style={s.small}>{label}</Text>
      <Text style={s.specValue}>{value}</Text>
    </View>
  ) : null;

const ContainerBlock: React.FC<{ item: QuoteItem; quote: Quote }> = ({ item, quote }) => {
  const sp = item.specs;
  const rental = quote.quote_type === 'rental';
  const units = item.quantity === 1 ? 'unidad' : 'unidades';
  return (
    <View style={s.unit} wrap={false}>
      {item.photo_url ? (
        <View style={s.photoBox}><Image src={assetUrl(item.photo_url)} style={s.photo} /></View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={s.unitName}>{item.description}</Text>
        {item.detail ? <Text style={s.muted}>{item.detail}</Text> : null}
        {sp ? (
          <View style={s.specs}>
            <Spec label="Largo" value={formatMeasure(sp.length_m, 'm')} />
            <Spec label="Ancho" value={formatMeasure(sp.width_m, 'm')} />
            <Spec label="Alto" value={formatMeasure(sp.height_m, 'm')} />
            <Spec label="Capacidad" value={formatMeasure(sp.capacity_m3, 'm³', 2)} />
            <Spec label="Peso" value={formatMeasure(sp.weight_kg, 'kg', 0)} />
            <Spec label="Peso máximo" value={formatMeasure(sp.max_weight_kg, 'kg', 0)} />
          </View>
        ) : null}
        <View style={s.priceRow}>
          <Text style={s.muted}>
            <Text style={[s.semi, { color: C.text }]}>{item.quantity}</Text> {units} × {formatMoney(item.unit_price)} MXN
            {rental ? ' por mes' : ''}
            {item.unit_price_usd !== null ? ` (USD ${item.unit_price_usd.toLocaleString('en-US')})` : ''}
          </Text>
          <Text style={s.priceAmt}>{formatMoney(item.line_subtotal)}</Text>
        </View>
      </View>
    </View>
  );
};

const Footer: React.FC = () => (
  <View style={s.footer} fixed>
    <View>
      <Text style={[s.semi, { color: C.text }]}>Atención a clientes</Text>
      <Text>{QuoteIssuer.address}</Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text>Tel. {QuoteIssuer.phone}</Text>
      <Text>{QuoteIssuer.hours}</Text>
      <Text>RFC {QuoteIssuer.rfc}</Text>
    </View>
  </View>
);

export const QuoteDocument: React.FC<{ quote: Quote }> = ({ quote }) => {
  const rental = quote.quote_type === 'rental';
  const containers = quote.items.filter(i => i.kind === 'container');
  const services = quote.items.filter(i => i.kind !== 'container');
  const grandTotal = rental && quote.total_with_deposit !== null ? quote.total_with_deposit : quote.total;
  const split = !rental && quote.down_payment_pct ? splitDownPayment(quote.total, quote.down_payment_pct) : null;
  const half = Math.ceil(quote.terms.length / 2);
  const termCols = [quote.terms.slice(0, half), quote.terms.slice(half)];
  const customerLines = [
    quote.customer_company, quote.customer_rfc ? `RFC ${quote.customer_rfc}` : null,
    quote.customer_phone ? `Tel. ${quote.customer_phone}` : null, quote.customer_email,
  ].filter(Boolean) as string[];

  return (
    <Document title={`Cotización ${quote.folio}`} author={QuoteIssuer.companyName} subject={`Cotización de ${rental ? 'renta' : 'venta'}`}>
      <Page size="LETTER" style={s.page}>
        <Rib />
        <View style={s.body}>
          <View style={s.head}>
            <Image src={assetUrl(QuoteIssuer.logoPath)} style={{ width: 122, height: 44, objectFit: 'contain' }} />
            <View style={s.plate}>
              <View style={s.plateCell}>
                <Text style={s.small}>{quote.revision > 1 ? `Folio · Rev. ${quote.revision}` : 'Folio'}</Text>
                <Text style={s.plateValue}>{quote.folio}</Text>
              </View>
              <View style={[s.plateCell, s.plateType]}>
                <Text style={[s.small, { color: '#b9c7d2' }]}>Tipo</Text>
                <Text style={[s.plateValue, { color: '#ffffff', letterSpacing: 0.6 }]}>{rental ? 'Renta' : 'Venta'}</Text>
              </View>
            </View>
          </View>

          <View style={s.titleRow}>
            <Text style={s.h1}>{rental ? 'Cotización de renta' : 'Cotización de venta'}</Text>
            <View style={s.dates}>
              <View style={s.dateBox}><Text style={s.small}>Fecha</Text><Text style={s.dateValue}>{formatIsoDate(quote.issued_on)}</Text></View>
              <View style={s.dateBox}><Text style={s.small}>Vigente hasta</Text><Text style={s.dateValue}>{formatIsoDate(quote.valid_until)}</Text></View>
            </View>
          </View>

          <View style={s.parties}>
            <View style={s.party}>
              <Text style={s.partyTitle}>Cliente</Text>
              <Text style={s.who}>{quote.customer_name}</Text>
              {customerLines.map(l => <Text key={l}>{l}</Text>)}
              {quote.delivery_location ? <Text style={s.muted}>{rental ? 'Entrega y regreso en ' : 'Entrega en '}{quote.delivery_location}</Text> : null}
            </View>
            <View style={s.party}>
              <Text style={s.partyTitle}>Atiende</Text>
              <Text style={s.who}>{quote.seller_name}</Text>
              <Text>
                {[quote.seller_phone && `Tel. ${quote.seller_phone}`, quote.seller_whatsapp && `WhatsApp ${quote.seller_whatsapp}`].filter(Boolean).join('  |  ')}
              </Text>
              {quote.seller_email ? <Text>{quote.seller_email}</Text> : null}
            </View>
          </View>
          {!rental && quote.exchange_rate ? (
            <Text style={[s.small, { textAlign: 'right', marginTop: 4 }]}>
              Tipo de cambio aplicado: <Text style={[s.semi, { color: C.text }]}>1 USD = ${quote.exchange_rate.toFixed(2)} MXN</Text>
            </Text>
          ) : null}

          <View style={{ marginTop: 4 }}>
            {containers.map(item => <ContainerBlock key={item.id ?? item.position} item={item} quote={quote} />)}
          </View>

          {services.length > 0 ? (
            <View>
              <View style={s.th}>
                <Text style={[s.small, s.cConcept]}>Servicios</Text>
                <Text style={[s.small, s.cQty]}>Cant.</Text>
                <Text style={[s.small, s.cUnit]}>Precio unitario</Text>
                <Text style={[s.small, s.cTotal]}>Importe</Text>
              </View>
              {services.map(item => (
                <View key={item.id ?? item.position} style={s.tr} wrap={false}>
                  <View style={s.cConcept}>
                    <Text>{item.description}</Text>
                    {item.detail ? <Text style={s.small}>{item.detail}</Text> : null}
                  </View>
                  <Text style={s.cQty}>{item.quantity}</Text>
                  <Text style={s.cUnit}>{item.unit_price === 0 ? 'Sin costo' : formatMoney(item.unit_price)}</Text>
                  <Text style={[s.cTotal, s.semi]}>{formatMoney(item.line_subtotal)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={s.sumRow} wrap={false}>
            <View style={s.sumLeft}>
              <Text style={s.small}>{rental && quote.security_deposit ? 'Importe con letra (total con depósito)' : 'Importe con letra'}</Text>
              <Text style={s.words}>{amountToSpanishWords(grandTotal)}</Text>
              {split ? (
                <View style={s.split}>
                  <View style={s.splitBox}><Text style={s.small}>Anticipo ({quote.down_payment_pct} %)</Text><Text style={s.splitValue}>{formatMoney(split.down)}</Text></View>
                  <View style={s.splitBox}><Text style={s.small}>Contra entrega ({100 - (quote.down_payment_pct ?? 0)} %)</Text><Text style={s.splitValue}>{formatMoney(split.balance)}</Text></View>
                </View>
              ) : null}
            </View>
            <View style={s.panel}>
              <View style={s.panelRow}><Text style={s.panelLabel}>Subtotal</Text><Text style={s.panelValue}>{formatMoney(quote.subtotal)}</Text></View>
              <View style={s.panelRow}><Text style={s.panelLabel}>IVA {Math.round(quote.tax_rate * 100)} %</Text><Text style={s.panelValue}>{formatMoney(quote.tax_total)}</Text></View>
              <View style={s.panelTotal}><Text style={s.panelLabel}>Total MXN</Text><Text style={s.panelBig}>{formatMoney(quote.total)}</Text></View>
              {rental && quote.security_deposit ? (
                <>
                  <View style={[s.panelRow, s.panelDep]}><Text style={s.panelLabel}>Depósito en garantía</Text><Text style={s.panelValue}>{formatMoney(quote.security_deposit)}</Text></View>
                  <View style={s.panelGrand}>
                    <Text style={[s.semi, { color: '#ffffff' }]}>Total con depósito</Text>
                    <Text style={[s.panelBig, { fontSize: 22 }]}>{formatMoney(grandTotal)}</Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>

          <View style={{ marginTop: 13 }} wrap={false}>
            <Text style={s.termsTitle}>Términos y condiciones de {rental ? 'renta' : 'venta'}</Text>
            <View style={s.termsCols}>
              {termCols.map((col, ci) => (
                <View key={ci} style={s.termsCol}>
                  {col.map((t, i) => <View key={i} style={s.term}><Text style={s.bullet}>•</Text><Text style={{ flex: 1 }}>{t}</Text></View>)}
                </View>
              ))}
            </View>
            {rental && quote.required_documents ? (
              <Text style={s.docs}><Text style={[s.semi, { color: C.text }]}>Documentación para la renta. </Text>{quote.required_documents}</Text>
            ) : null}
            {quote.notes ? <Text style={[s.docs, { marginTop: 5 }]}><Text style={[s.semi, { color: C.text }]}>Notas. </Text>{quote.notes}</Text> : null}
          </View>
        </View>
        <Footer />
        <Rib bottom />
      </Page>
    </Document>
  );
};
