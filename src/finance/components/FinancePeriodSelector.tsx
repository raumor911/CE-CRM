import React from 'react';

export const FinancePeriodSelector: React.FC<{
  value: string;
  onChange: (next: string) => void;
}> = ({ value, onChange }) => (
  <input
    type="month"
    value={value}
    onChange={event => onChange(event.target.value)}
    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none"
  />
);
