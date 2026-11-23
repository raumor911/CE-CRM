import React, { useEffect, useState } from 'react';
import { AlertCircle, Download, Loader2, Mail, MessageCircle, X } from 'lucide-react';
import type { Quote } from '../../types';
import { downloadBlob, generateQuotePdf, quotePdfFileName } from '../../lib/quotePdf';
import {
  buildShareMessage, buildShareSubject, mailtoUrl, normalizeEmail, normalizeWhatsAppPhone, whatsappUrl,
} from '../../lib/quoteShare';

export const QuotePdfPreview: React.FC<{ quote: Quote; onClose: () => void }> = ({ quote, onClose }) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const phone = normalizeWhatsAppPhone(quote.customer_phone);
  const email = normalizeEmail(quote.customer_email);

  // El enlace de WhatsApp o de correo no puede llevar el archivo: se descarga el PDF y se abre el mensaje ya redactado.
  const share = (channel: 'whatsapp' | 'email') => {
    if (!blob) return;
    const fileName = quotePdfFileName(quote);
    downloadBlob(blob, fileName);
    const message = buildShareMessage(quote);
    if (channel === 'whatsapp' && phone) {
      window.open(whatsappUrl(phone, message), '_blank', 'noopener');
      setNotice(`Se descargó ${fileName}. Adjúntalo en la conversación de WhatsApp con +${phone} antes de enviar.`);
    } else if (channel === 'email' && email) {
      window.location.href = mailtoUrl(email, buildShareSubject(quote), message);
      setNotice(`Se descargó ${fileName}. Adjúntalo al correo para ${email} antes de enviar.`);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlob(null); setUrl(null); setError(null); setNotice(null);
    generateQuotePdf(quote)
      .then(b => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      })
      .catch(e => { if (!cancelled) setError(e?.message ?? 'No se pudo generar el PDF.'); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [quote]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 sm:p-4" role="dialog" aria-label={`Vista previa de la cotización ${quote.folio}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl h-full sm:h-[92vh] bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between gap-3 safe-top">
          <div>
            <h2 className="font-black text-zinc-900">Cotización {quote.folio}</h2>
            <p className="text-xs text-zinc-500">{quote.customer_name}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button" disabled={!blob || !phone} onClick={() => share('whatsapp')}
              title={phone ? `Enviar por WhatsApp a +${phone}` : 'El cliente no tiene un teléfono válido en esta cotización'}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MessageCircle size={16} /> WhatsApp
            </button>
            <button
              type="button" disabled={!blob || !email} onClick={() => share('email')}
              title={email ? `Enviar por correo a ${email}` : 'El cliente no tiene un correo válido en esta cotización'}
              className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Mail size={16} /> Correo
            </button>
            <button
              type="button" disabled={!blob} onClick={() => blob && downloadBlob(blob, quotePdfFileName(quote))}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-40"
            >
              <Download size={16} /> Descargar PDF
            </button>
            <button type="button" onClick={onClose} aria-label="Cerrar vista previa" className="w-10 h-10 flex items-center justify-center hover:bg-zinc-100 rounded-full text-zinc-500">
              <X size={20} />
            </button>
          </div>
        </div>
        {notice && (
          <div role="status" className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 text-xs font-medium text-emerald-800 flex items-start justify-between gap-3">
            <p>{notice}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="shrink-0 text-emerald-700 hover:text-emerald-900"><X size={14} /></button>
          </div>
        )}
        <div className="flex-1 bg-zinc-200 relative">
          {!url && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-500">
              <Loader2 className="animate-spin" size={28} />
              <p className="text-sm font-medium">Generando el PDF…</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center" role="alert">
              <AlertCircle className="text-rose-500" size={28} />
              <p className="text-sm font-bold text-zinc-900">No se pudo generar el PDF</p>
              <p className="text-xs text-zinc-500 max-w-md">{error}</p>
            </div>
          )}
          {url && <iframe title={`PDF ${quote.folio}`} src={url} className="w-full h-full border-0" />}
        </div>
      </div>
    </div>
  );
};
