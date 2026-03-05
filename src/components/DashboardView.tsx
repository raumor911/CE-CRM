import React from 'react';
import { LayoutDashboard, Users, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Lead } from '../types';
import { formatCurrency } from '../lib/utils';
import { CostOfWaitDashboard } from './CostOfWaitDashboard';
import { motion } from 'motion/react';

interface DashboardViewProps {
  leads: Lead[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ leads }) => {
  const activeLeads = leads.filter(l => l.stage !== 'Cierre');
  const totalValue = activeLeads.reduce((sum, l) => sum + (l.budget || 0), 0);
  const priorityLeads = activeLeads.filter(l => l.is_priority);

  const stats = [
    { label: 'Leads Activos', value: activeLeads.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Valor en Pipeline', value: formatCurrency(totalValue), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Prioridad Alta', value: priorityLeads.length, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Tiempo Promedio', value: '4.2h', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8 p-6 bg-bg-main min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Dashboard Operativo</h1>
          <p className="text-slate-500 text-sm font-medium">Resumen de métricas y rendimiento del pipeline.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-slate-200 p-6 rounded-xl flex items-center gap-4 shadow-sm"
          >
            <div className={`${stat.bg} ${stat.color} p-3 rounded-lg`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CostOfWaitDashboard leads={leads} />
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-xl space-y-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertCircle size={20} className="text-rose-500" />
            Leads en Riesgo
          </h3>
          <div className="space-y-4">
            {activeLeads.slice(0, 5).map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900">{lead.lead_name}</span>
                  <span className="text-[10px] text-slate-500">{lead.project_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-600 font-mono">+$12.50</span>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Cost of Wait</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
