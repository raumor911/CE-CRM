import React, { useMemo, useState } from 'react';
import { QuotesRepoProvider } from '../context/QuotesRepoContext';
import { createMemoryQuotesRepo } from '../lib/quotesRepoMemory';
import { QuotesPanel } from '../components/quotes/QuotesPanel';
import { SettingsView } from '../components/SettingsView';
import type { Lead } from '../types';
import { cn } from '../lib/utils';

const base = { stage: 'Propuesta', last_activity: new Date().toISOString(), sentiment_label: 'Entusiasta', main_image_url: '' } as const;
const LEADS: Record<string, Lead> = {
  sale: { ...base, id: 'lead-venta', project_name: 'Bodega en Hidalgo', lead_name: 'Sergio', phone: '55 3880 3381', category: 'Compra Contenedor' },
  rental: { ...base, id: 'lead-renta', project_name: 'Obra CDMX', lead_name: 'FELD', phone: '55 8048 6200', category: 'Renta Contenedor' },
};

/**
 * Vista previa SOLO de desarrollo (?preview=quotes). Usa datos sintéticos en memoria, no pide login
 * y no toca Supabase. No se incluye en el build de producción.
 */
export const QuotesPreview: React.FC = () => {
  const repo = useMemo(() => createMemoryQuotesRepo(), []);
  const [tab, setTab] = useState<'sale' | 'rental' | 'settings'>('sale');
  const tabs = [['sale', 'Lead de venta'], ['rental', 'Lead de renta'], ['settings', 'Ajustes']] as const;
  return (
    <QuotesRepoProvider repo={repo}>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center gap-4">
          <p className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-100 px-2 py-1 rounded">Vista previa · datos sintéticos</p>
          <nav className="inline-flex rounded-xl bg-zinc-100 p-1" role="tablist">
            {tabs.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={cn('px-4 py-2 rounded-lg text-sm font-bold', tab === id ? 'bg-white text-indigo-600 shadow-sm' : 'text-zinc-500')}>{label}</button>
            ))}
          </nav>
        </header>
        <main className={cn('mx-auto p-6', tab === 'settings' ? 'max-w-6xl' : 'max-w-4xl')}>
          {tab === 'settings' ? <SettingsView /> : (
            <div className="bg-white rounded-3xl border border-slate-200 p-6">
              <h1 className="text-lg font-black text-zinc-900">{LEADS[tab].project_name}</h1>
              <p className="text-xs text-zinc-500 mb-5">{LEADS[tab].lead_name} · {LEADS[tab].category}</p>
              <QuotesPanel key={tab} lead={LEADS[tab]} />
            </div>
          )}
        </main>
      </div>
    </QuotesRepoProvider>
  );
};
