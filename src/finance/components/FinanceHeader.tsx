import React from 'react';
import { Loader2, RefreshCcw } from 'lucide-react';

export const FinanceHeader: React.FC<{
  title: string;
  subtitle: string;
  loading: boolean;
  saving: boolean;
  onRefresh: () => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  } | null;
  feedback?: { type: 'success' | 'error'; message: string } | null;
  children?: React.ReactNode;
}> = ({ title, subtitle, loading, saving, onRefresh, primaryAction, feedback, children }) => (
  <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm md:px-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Modulo financiero</p>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {children}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading || saving}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
          Recargar
        </button>
        {primaryAction ? (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white"
          >
            <primaryAction.icon size={16} />
            {primaryAction.label}
          </button>
        ) : null}
      </div>
    </div>
    {feedback ? (
      <div
        className={`mt-5 rounded-2xl border px-4 py-3 text-sm ${
          feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}
      >
        {feedback.message}
      </div>
    ) : null}
  </section>
);
