import React, { useEffect, useState } from 'react';
import {
  BriefcaseBusiness,
  Factory,
  Loader2,
  Lock,
  ReceiptText,
  RefreshCcw,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinanceModule } from '../hooks/useFinanceModule';
import { FinanceHeader } from './FinanceHeader';
import { FinanceNavigation, FinanceTabId } from './FinanceNavigation';
import { FinancePeriodSelector } from './FinancePeriodSelector';
import { monthLabel, EmptyState, FinanceCard } from './shared';
import { FinanceSummaryTab } from './tabs/FinanceSummaryTab';
import { FinanceExpensesTab } from './tabs/FinanceExpensesTab';
import { FinanceRecurringTab } from './tabs/FinanceRecurringTab';
import { FinancePayrollTab } from './tabs/FinancePayrollTab';
import { FinanceContainersTab } from './tabs/FinanceContainersTab';

const tabs: Array<{
  id: FinanceTabId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { id: 'summary', label: 'Resumen', icon: WalletCards },
  { id: 'expenses', label: 'Egresos', icon: ReceiptText },
  { id: 'recurring', label: 'Recurrentes', icon: RefreshCcw },
  { id: 'payroll', label: 'Nomina', icon: BriefcaseBusiness },
  // { id: 'containers', label: 'Containers', icon: Factory }, // Ocultado temporalmente para el MVP
];

type FeedbackState = { type: 'success' | 'error'; message: string } | null;

export const FinanceView: React.FC = () => {
  const { user } = useAuth();
  const finance = useFinanceModule(user?.id || null);
  const [activeTab, setActiveTab] = useState<FinanceTabId>('summary');
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  useEffect(() => {
    if (finance.error) {
      setFeedback({ type: 'error', message: finance.error });
    }
  }, [finance.error]);

  const periodLabel = finance.summary?.period.label || monthLabel(finance.period);
  const setSuccess = (message: string) => setFeedback({ type: 'success', message });

  return (
    <div className="space-y-6 px-0 py-6 md:px-6">
      <FinanceHeader
        title="Operacion financiera por flujo real"
        subtitle="FinanceView ahora orquesta el layout, el periodo y la composicion modular de cada flujo financiero."
        loading={finance.loading}
        saving={finance.saving}
        onRefresh={() => finance.refresh()}
        feedback={feedback}
      >
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem('catalyst_finance_unlocked');
            window.dispatchEvent(new Event('finance:lock'));
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          title="Bloquear Finanzas"
        >
          <Lock size={16} />
          <span className="hidden sm:inline">Bloquear</span>
        </button>
        <FinancePeriodSelector value={finance.period} onChange={finance.setPeriod} />
      </FinanceHeader>

      <FinanceNavigation tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {finance.loading && !finance.summary && activeTab === 'summary' ? (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white">
          <Loader2 size={28} className="animate-spin text-slate-400" />
          <p className="text-sm font-semibold text-slate-500">Cargando informacion financiera...</p>
        </div>
      ) : null}

      {!finance.loading && !finance.summary && activeTab === 'summary' ? (
        <FinanceCard
          title="Sin datos"
          subtitle={finance.resourceErrors.summary || 'No fue posible consolidar el periodo.'}
        >
          <EmptyState message="Revisa el periodo financiero y las vistas fin_ requeridas para este mes." />
        </FinanceCard>
      ) : null}

      {finance.summary && activeTab === 'summary' ? (
        <FinanceSummaryTab finance={finance} periodLabel={periodLabel} onSuccess={setSuccess} />
      ) : null}

      {activeTab === 'expenses' ? (
        <FinanceExpensesTab finance={finance} periodLabel={periodLabel} onSuccess={setSuccess} />
      ) : null}

      {activeTab === 'recurring' ? (
        <FinanceRecurringTab finance={finance} periodLabel={periodLabel} onSuccess={setSuccess} />
      ) : null}

      {activeTab === 'payroll' ? (
        <FinancePayrollTab finance={finance} periodLabel={periodLabel} onSuccess={setSuccess} />
      ) : null}

      {/* Ocultado temporalmente para el MVP
      {activeTab === 'containers' ? (
        <FinanceContainersTab finance={finance} onSuccess={setSuccess} />
      ) : null}
      */}
    </div>
  );
};
