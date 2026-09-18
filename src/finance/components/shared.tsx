import React from 'react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FinanceExpenseNature, FinancePayrollPeriodicity, FinanceRecurringFrequency } from '../types';

export const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900';

export const mutedInputClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-900';

export const getToday = () => new Date().toISOString().slice(0, 10);

export const numberFromInput = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const monthLabel = (period: string) =>
  format(new Date(`${period}-01T00:00:00`), 'MMMM yyyy', { locale: es });

export const dayLabel = (date: string) =>
  format(new Date(`${date}T00:00:00`), 'dd MMM', { locale: es });

export const frequencyLabel = (value: FinanceRecurringFrequency) =>
  ({
    MONTHLY: 'Mensual',
    BIMONTHLY: 'Bimestral',
    QUARTERLY: 'Trimestral',
    SEMIANNUAL: 'Semestral',
    ANNUAL: 'Anual',
    CUSTOM_DAYS: 'Dias personalizados',
  })[value] || value;

export const periodicityLabel = (value: FinancePayrollPeriodicity) =>
  ({
    MONTHLY: 'Mensual',
    BIWEEKLY: 'Quincenal',
    WEEKLY: 'Semanal',
    CUSTOM: 'Custom',
  })[value] || value;

export const natureLabel = (value: FinanceExpenseNature) =>
  ({
    OPERATING: 'Operacion',
    DIRECT_COST: 'Directo',
    CAPEX: 'Capex',
    TAX: 'Impuesto',
    EXTRAORDINARY: 'Extraordinario',
    PAYROLL: 'Nomina',
  })[value] || value;

export const FinanceCard: React.FC<
  React.PropsWithChildren<{ title: string; subtitle?: string; className?: string }>
> = ({ title, subtitle, className, children }) => (
  <section className={`rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm ${className || ''}`}>
    <div className="mb-4 space-y-1">
      <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">{title}</h3>
      {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
    </div>
    {children}
  </section>
);

export const FinancialMetricCard: React.FC<{
  label: string;
  value: string;
  tone?: 'default' | 'positive' | 'danger';
}> = ({ label, value, tone = 'default' }) => (
  <div
    className={`rounded-2xl border p-4 ${
      tone === 'positive'
        ? 'border-emerald-100 bg-emerald-50'
        : tone === 'danger'
          ? 'border-rose-100 bg-rose-50'
          : 'border-slate-200 bg-slate-50'
    }`}
  >
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{value}</p>
  </div>
);

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'ACTIVO',
  PAUSED: 'PAUSADO',
  CANCELLED: 'CANCELADO',
  PAID: 'PAGADO',
  PENDING: 'PENDIENTE',
  EXPECTED: 'ESPERADO',
  CLOSED: 'CERRADO',
  OPEN: 'ABIERTO',
  PARTIAL: 'PARCIAL',
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => (
  <span
    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
      ['PAID', 'CLOSED', 'ACTIVE'].includes(status)
        ? 'bg-emerald-100 text-emerald-700'
        : ['PENDING', 'EXPECTED', 'OPEN', 'PARTIAL'].includes(status)
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-600'
    }`}
  >
    {STATUS_LABELS[status] || status}
  </span>
);

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
    {message}
  </div>
);

export const Chip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({
  label,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] transition ${
      active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500'
    }`}
  >
    {label}
  </button>
);

export const Field: React.FC<React.PropsWithChildren<{ label: string; helper?: string }>> = ({
  label,
  helper,
  children,
}) => (
  <label className="block space-y-2">
    <div className="space-y-1">
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      {helper ? <p className="text-xs text-slate-400">{helper}</p> : null}
    </div>
    {children}
  </label>
);

export const SlideOverPanel: React.FC<{
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, title, subtitle, onClose, children }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm">
      <div className="flex h-full justify-end">
        <div className="flex h-full w-full flex-col bg-white md:my-4 md:mr-4 md:h-[calc(100vh-2rem)] md:max-w-[34rem] md:rounded-[28px] md:border md:border-slate-200 md:shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5">
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Finanzas</p>
              <h3 className="text-xl font-black tracking-tight text-slate-900">{title}</h3>
              {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
};
