import React from 'react';
import { AlertCircle, TrendingDown } from 'lucide-react';
import { Lead } from '../types';
import { differenceInHours, parseISO } from 'date-fns';
import { formatCurrency } from '../lib/utils';

interface CostOfWaitDashboardProps {
  leads: Lead[];
}

export const CostOfWaitDashboard: React.FC<CostOfWaitDashboardProps> = ({ leads }) => {
  const delayedLeads = leads.filter(l => differenceInHours(new Date(), parseISO(l.last_activity)) > 48);
  const totalPotentialLoss = delayedLeads.reduce((acc, l) => acc + (l.budget || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <AlertCircle size={24} />
        </div>
        <div>
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wider">Leads Críticos (+48h)</p>
          <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">{delayedLeads.length}</p>
        </div>
      </div>

      <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
          <TrendingDown size={24} />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Costo de Espera Est.</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">${(totalPotentialLoss * 0.05).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-zinc-900 dark:bg-white p-4 rounded-2xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-zinc-800 dark:bg-zinc-100 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
          <TrendingDown size={24} className="rotate-180" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Pipeline Total</p>
          <p className="text-2xl font-bold text-white dark:text-zinc-900">{formatCurrency(leads.reduce((acc, l) => acc + (l.budget || 0), 0))}</p>
        </div>
      </div>
    </div>
  );
};
