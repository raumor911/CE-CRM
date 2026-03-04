import React from 'react';
import { LayoutDashboard, Users, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Lead } from '../types';
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
    { label: 'Leads Activos', value: activeLeads.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Valor en Pipeline', value: `$${(totalValue / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Prioridad Alta', value: priorityLeads.length, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Tiempo Promedio', value: '4.2h', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Dashboard Operativo</h1>
          <p className="text-zinc-500 text-sm">Resumen de métricas y rendimiento del pipeline.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4"
          >
            <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-black text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CostOfWaitDashboard leads={leads} />
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertCircle size={20} className="text-rose-500" />
            Leads en Riesgo
          </h3>
          <div className="space-y-4">
            {activeLeads.slice(0, 5).map(lead => (
              <div key={lead.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-white">{lead.lead_name}</span>
                  <span className="text-[10px] text-zinc-500">{lead.project_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-rose-500">+$12.50</span>
                  <p className="text-[10px] text-zinc-500">Cost of Wait</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
