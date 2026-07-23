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

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white border border-slate-200 p-8 rounded-xl space-y-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <TrendingUp size={24} className="text-indigo-500" />
              Leads en Seguimiento (Briefing en adelante)
            </h3>
            <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
              {activeLeads.filter(l => l.stage !== 'Ingreso').length} Leads Activos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeLeads
              .filter(l => l.stage !== 'Ingreso')
              .map(lead => (
              <div key={lead.id} className="group flex flex-col p-4 bg-slate-50 hover:bg-white hover:border-indigo-200 rounded-2xl border border-slate-100 transition-all hover:shadow-xl hover:shadow-indigo-500/5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{lead.lead_name}</span>
                    <span className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-tighter">{lead.project_name}</span>
                  </div>
                  <span className={cn(
                    "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0 ml-2",
                    lead.stage === 'Briefing' ? "bg-blue-100 text-blue-600" :
                    lead.stage === 'Propuesta' ? "bg-indigo-100 text-indigo-600" :
                    lead.stage === 'Negociación' ? "bg-amber-100 text-amber-600" :
                    "bg-emerald-100 text-emerald-600"
                  )}>
                    {lead.stage}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200/50">
                  <span className="text-xs font-black text-emerald-600">
                    ${lead.budget?.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full animate-pulse",
                      lead.sentiment_label === 'Entusiasta' ? "bg-emerald-500" :
                      lead.sentiment_label === 'Dudoso' ? "bg-amber-500" : "bg-rose-500"
                    )} />
                    <span className="text-[9px] font-bold text-slate-500 uppercase">{lead.sentiment_label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
