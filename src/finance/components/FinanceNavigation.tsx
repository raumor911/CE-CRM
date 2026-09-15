import React from 'react';

export type FinanceTabId = 'summary' | 'expenses' | 'recurring' | 'payroll' | 'containers';

export const FinanceNavigation: React.FC<{
  tabs: Array<{
    id: FinanceTabId;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }>;
  activeTab: FinanceTabId;
  onChange: (tab: FinanceTabId) => void;
}> = ({ tabs, activeTab, onChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-1">
    {tabs.map(tab => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={`inline-flex min-w-fit items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-[0.14em] ${
          activeTab === tab.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500'
        }`}
      >
        <tab.icon size={16} />
        {tab.label}
      </button>
    ))}
  </div>
);
