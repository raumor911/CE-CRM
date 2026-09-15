import React from 'react';
import { CalendarRange } from 'lucide-react';
import { formatCurrency } from '../../../lib/utils';
import { useFinanceSummary } from '../../hooks/useFinanceSummary';
import { UseFinanceModuleResult } from '../../hooks/useFinanceModule';
import { EmptyState, FinanceCard, FinancialMetricCard, StatusBadge } from '../shared';

export const FinanceSummaryTab: React.FC<{
  finance: UseFinanceModuleResult;
  periodLabel: string;
  onSuccess: (message: string) => void;
}> = ({ finance, periodLabel, onSuccess }) => {
  const summaryData = useFinanceSummary(finance);

  if (!finance.summary) return null;

  return (
    <div className="space-y-6">
      <FinanceCard title={periodLabel} subtitle="Centro directivo del periodo.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FinancialMetricCard label="Ingresos" value={formatCurrency(finance.summary.totalIncome)} tone="positive" />
          <FinancialMetricCard label="Egresos" value={formatCurrency(finance.summary.totalExpenses)} />
          <FinancialMetricCard label="Saldo final" value={formatCurrency(finance.summary.closingBalance)} />
        </div>
      </FinanceCard>

      {/* Ocultado por peticion de MVP temporalmente
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <FinanceCard title="Egresos por origen" subtitle="Distribucion de salidas pagadas.">
          <div className="space-y-3">
            {[
              ['Nomina', summaryData.sourceBreakdown.get('PAYROLL') || 0],
              ['Recurrentes', summaryData.sourceBreakdown.get('RECURRING') || 0],
              ['Compra de containers', summaryData.sourceBreakdown.get('INVENTORY_PURCHASE') || 0],
              ['Modificaciones', summaryData.sourceBreakdown.get('MODIFICATION') || 0],
              ['Otros egresos', summaryData.sourceBreakdown.get('MANUAL') || 0],
            ].map(([label, amount]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <span className="text-sm font-black text-slate-900">{formatCurrency(Number(amount))}</span>
              </div>
            ))}
          </div>
        </FinanceCard>

        <FinanceCard title="Obligaciones pendientes" subtitle="Egresos comprometidos aun no pagados.">
          <div className="space-y-3">
            {[
              ['Nomina pendiente', summaryData.pendingPayrollAmount],
              ['Recurrentes pendientes', summaryData.pendingRecurringAmount],
              ['Egresos pendientes', summaryData.pendingExpenseAmount],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <span className="text-sm font-black text-slate-900">{formatCurrency(Number(value))}</span>
              </div>
            ))}
          </div>
        </FinanceCard>
      </div>
      */}

      <FinanceCard title="Cierre operativo" subtitle="Congela el mes y propaga el saldo.">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Estado del periodo</span>
                <StatusBadge status={finance.summary.period.status} />
              </div>
            </div>
            <button
              type="button"
              disabled={finance.summary.period.status === 'CLOSED' || finance.saving}
              onClick={() => finance.closeMonth().then(() => onSuccess('Periodo cerrado.')).catch(() => undefined)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white disabled:bg-slate-300"
            >
              <CalendarRange size={16} />
              Cerrar periodo
            </button>
          </div>

          {finance.summary.dataGapNotes.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-700">
                <p className="text-xs font-black uppercase tracking-[0.18em]">Notas de trazabilidad</p>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-amber-800">
                {finance.summary.dataGapNotes.map((note: string) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState message="Sin alertas de trazabilidad para este periodo." />
          )}
        </div>
      </FinanceCard>
    </div>
  );
};
