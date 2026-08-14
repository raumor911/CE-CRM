import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Users, TrendingUp, Clock, AlertCircle, 
  Target, Zap, TrendingDown, CalendarDays, Activity,
  DollarSign, ShieldAlert, Flame, CheckCircle2, ArrowRight,
  ChevronDown, Check, Building2
} from 'lucide-react';
import { Lead } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { useRentals } from '../hooks/useRentals';
import { motion, AnimatePresence } from 'motion/react';

const DAYS_TO_STALE = 7;
const STAGE_WEIGHTS: Record<string, number> = {
  'Ingreso': 0.10,
  'Briefing': 0.30,
  'Propuesta': 0.60,
  'Cierre': 1.00
};

interface DashboardViewProps {
  leads: Lead[];
}

const getDaysBetween = (start: string, end: string): number => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const getDaysAgo = (dateStr: string): number => {
  return getDaysBetween(dateStr, new Date().toISOString());
};

type PeriodKey = 'weekly' | 'biweekly' | 'monthly' | 'yearly';
const PERIOD_LABELS: Record<PeriodKey, string> = {
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  yearly: 'Anual'
};
const PERIOD_DESC: Record<PeriodKey, string> = {
  weekly: 'Semana calendario',
  biweekly: 'Quincena (Q1/Q2)',
  monthly: 'Mes calendario',
  yearly: 'Año calendario'
};

const getISOWeekString = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getDefaultPeriodValue = (type: PeriodKey) => {
  const now = new Date();
  switch(type) {
    case 'weekly': return getISOWeekString(now);
    case 'biweekly': return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getDate() <= 15 ? 'Q1' : 'Q2'}`;
    case 'monthly': return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    case 'yearly': return now.getFullYear().toString();
  }
};

const isDateInPeriod = (dateStr: string, periodType: PeriodKey, periodValue: string) => {
  if (!dateStr || !periodValue) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');

  if (periodType === 'yearly') {
    return y.toString() === periodValue;
  }
  if (periodType === 'monthly') {
    return `${y}-${m}` === periodValue;
  }
  if (periodType === 'biweekly') {
    const [py, pm, pq] = periodValue.split('-');
    if (y.toString() !== py || m !== pm) return false;
    const dateNum = d.getDate();
    if (pq === 'Q1') return dateNum <= 15;
    if (pq === 'Q2') return dateNum > 15;
    return false;
  }
  if (periodType === 'weekly') {
    return getISOWeekString(d) === periodValue;
  }
  return false;
};

const PeriodValueInput = ({ 
  type, 
  value, 
  onChange, 
  color 
}: { 
  type: PeriodKey, 
  value: string, 
  onChange: (v: string) => void, 
  color: 'indigo' | 'emerald' 
}) => {
  const baseClasses = cn(
    "h-6 px-2 text-[10px] font-bold rounded-lg border bg-white shadow-sm focus:outline-none transition-colors",
    color === 'indigo' 
      ? "border-indigo-100 text-indigo-700 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300" 
      : "border-emerald-100 text-emerald-700 focus:border-emerald-300 focus:ring-1 focus:ring-emerald-300"
  );
  
  if (type === 'yearly') {
    return (
      <input 
        type="number" 
        min="2000" max="2100" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className={cn(baseClasses, "w-16 text-center")} 
      />
    );
  }
  
  if (type === 'monthly') {
    return (
      <input 
        type="month" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className={cn(baseClasses, "w-[110px]")} 
      />
    );
  }

  if (type === 'weekly') {
    return (
      <input 
        type="week" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className={cn(baseClasses, "w-[130px]")} 
      />
    );
  }

  if (type === 'biweekly') {
    const [y, m, q] = value.split('-');
    const monthVal = y && m ? `${y}-${m}` : '';
    const qVal = q || 'Q1';
    
    return (
      <div className="flex items-center gap-1">
        <input 
          type="month" 
          value={monthVal} 
          onChange={e => {
            const newVal = e.target.value;
            if (newVal) onChange(`${newVal}-${qVal}`);
          }} 
          className={cn(baseClasses, "w-[110px]")} 
        />
        <select 
          value={qVal}
          onChange={e => onChange(`${monthVal}-${e.target.value}`)}
          className={cn(baseClasses, "w-12 px-1 text-center cursor-pointer")}
        >
          <option value="Q1">Q1</option>
          <option value="Q2">Q2</option>
        </select>
      </div>
    );
  }
  
  return null;
};

export const DashboardView: React.FC<DashboardViewProps> = ({ leads }) => {
  const now = new Date().toISOString();
  const [salesPeriodType, setSalesPeriodType] = useState<PeriodKey>('monthly');
  const [salesPeriodValue, setSalesPeriodValue] = useState<string>(getDefaultPeriodValue('monthly'));
  
  const [pipelinePeriodType, setPipelinePeriodType] = useState<PeriodKey>('monthly');
  const [pipelinePeriodValue, setPipelinePeriodValue] = useState<string>(getDefaultPeriodValue('monthly'));
  
  // Estado controlado para los dropdowns de periodo
  const [openDropdown, setOpenDropdown] = useState<'pipeline' | 'sales' | null>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);
  const salesRef = useRef<HTMLDivElement>(null);

  // Efecto para cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        pipelineRef.current && !pipelineRef.current.contains(target) &&
        salesRef.current && !salesRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openDropdown]);

  const { rentals, fetchRentals } = useRentals();

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);
  
  const activeLeads = useMemo(() => 
    leads.filter(l => !l.is_archived && l.stage !== 'Cierre'), 
  [leads]);
  
  const closedLeads = useMemo(() => 
    leads.filter(l => !l.is_archived && l.stage === 'Cierre'), 
  [leads]);
  
  const allNonArchived = useMemo(() => 
    leads.filter(l => !l.is_archived), 
  [leads]);

  // 🔒 VALOR PIPELINE (con periodo calendario)
  const filteredActiveLeadsForPipeline = useMemo(() => {
    return activeLeads.filter(l => {
      const refDate = l.created_at || l.stage_entry_timestamp || l.last_activity;
      return isDateInPeriod(refDate, pipelinePeriodType, pipelinePeriodValue);
    });
  }, [activeLeads, pipelinePeriodType, pipelinePeriodValue]);

  const totalPipelineValue = useMemo(() => 
    filteredActiveLeadsForPipeline.reduce((sum, l) => sum + (l.budget || 0), 0), 
  [filteredActiveLeadsForPipeline]);
  
  // 🔒 VALOR VENTA CERRADA (con periodo calendario)
  const filteredClosedLeads = useMemo(() => {
    return closedLeads.filter(l => {
      const refDate = l.signed_at || l.last_activity;
      return isDateInPeriod(refDate, salesPeriodType, salesPeriodValue);
    });
  }, [closedLeads, salesPeriodType, salesPeriodValue]);

  const closedValue = useMemo(() => 
    filteredClosedLeads.reduce((sum, l) => sum + (l.monto_anticipo_real || l.budget || 0), 0), 
  [filteredClosedLeads]);
  
  const weightedForecast = useMemo(() => 
    // Ajuste lógico: El pronóstico ponderado debe reflejar el MISMO periodo que el Valor Pipeline
    // Para ello, operamos sobre el set de leads ya filtrados por la ventana de tiempo
    filteredActiveLeadsForPipeline.reduce((sum, l) => sum + ((l.budget || 0) * (STAGE_WEIGHTS[l.stage] || 0)), 0), 
  [filteredActiveLeadsForPipeline]);
  
  const priorityLeads = useMemo(() => 
    activeLeads.filter(l => l.is_priority), 
  [activeLeads]);
  
  // ⚠️ LEADS EN RIESGO: >7 días sin actividad
  const staleLeads = useMemo(() => 
    activeLeads.filter(l => getDaysAgo(l.last_activity) >= DAYS_TO_STALE), 
  [activeLeads, now]);
  
  // 🔥 LEADS RECIENTES: actualizados en los últimos 2 días
  const recentlyActive = useMemo(() => 
    activeLeads.filter(l => getDaysAgo(l.last_activity) <= 2), 
  [activeLeads, now]);
  
  // ⏱️ TIEMPO PROMEDIO DE CICLO (solo leads cerrados)
  const avgCycleDays = useMemo(() => {
    if (closedLeads.length === 0) return 0;
    const totalDays = closedLeads.reduce((sum, l) => {
      const start = l.created_at || l.stage_entry_timestamp || l.last_activity;
      const end = l.signed_at || l.last_activity;
      return sum + getDaysBetween(start, end);
    }, 0);
    return Math.round(totalDays / closedLeads.length);
  }, [closedLeads]);
  
  // 📊 DISTRIBUCIÓN POR ETAPA
  const stageBreakdown = useMemo(() => {
    const stages = ['Ingreso', 'Briefing', 'Propuesta', 'Cierre'] as const;
    return stages.map(s => {
      const stageLeads = leads.filter(l => l.stage === s && !l.is_archived);
      return {
        stage: s,
        count: stageLeads.length,
        value: stageLeads.reduce((sum, l) => sum + (l.budget || 0), 0),
        avgDays: stageLeads.length > 0 
          ? Math.round(stageLeads.reduce((s2, l) => s2 + getDaysAgo(l.last_activity), 0) / stageLeads.length)
          : 0
      };
    });
  }, [leads, now]);
  
  // 🏷️ MÉTRICAS POR CATEGORÍA (Top 3)
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; value: number }>();
    activeLeads.forEach(l => {
      const key = l.category || 'Sin categoría';
      const current = map.get(key) || { count: 0, value: 0 };
      map.set(key, {
        count: current.count + 1,
        value: current.value + (l.budget || 0)
      });
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [activeLeads]);
  
  // ✅ CHECKLIST PROMEDIO EN BRIEFING
  const briefingProgress = useMemo(() => {
    const briefingLeads = activeLeads.filter(l => l.stage === 'Briefing');
    if (briefingLeads.length === 0) return 0;
    const total = briefingLeads.reduce((sum, l) => {
      const cl = l.checklist_briefing;
      const done = (cl?.m2 ? 1 : 0) + (cl?.deadlines ? 1 : 0);
      return sum + (done / 2);
    }, 0);
    return Math.round((total / briefingLeads.length) * 100);
  }, [activeLeads]);

  // 🏢 VALOR MENSUAL RENTAS
  const activeRentalsValue = useMemo(() => {
    let totalVAT = 0;
    rentals.forEach(rental => {
      if (rental.status === 'active') {
        const rentalTotal = rental.monthly_amount_total || rental.items?.reduce((sum, item) => sum + (Number(item.monthly_total) || 0), 0) || 0;
        totalVAT += Number(rentalTotal);
      }
    });
    return totalVAT;
  }, [rentals]);

  const stats = [
    { 
      label: 'Leads Activos', 
      value: activeLeads.length.toString(), 
      sub: `+${recentlyActive.length} recientes`,
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Valor Pipeline', 
      value: formatCurrency(totalPipelineValue), 
      sub: `Ponderado: ${formatCurrency(weightedForecast)} • ${filteredActiveLeadsForPipeline.length} leads`,
      periodKey: 'pipeline' as const,
      periodType: pipelinePeriodType,
      periodValue: pipelinePeriodValue,
      setPeriodType: setPipelinePeriodType,
      setPeriodValue: setPipelinePeriodValue,
      icon: TrendingUp, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50' 
    },
    { 
      label: 'Venta Cerrada', 
      value: formatCurrency(closedValue), 
      sub: `${filteredClosedLeads.length} contrato${filteredClosedLeads.length === 1 ? '' : 's'}`,
      periodKey: 'sales' as const,
      periodType: salesPeriodType,
      periodValue: salesPeriodValue,
      setPeriodType: setSalesPeriodType,
      setPeriodValue: setSalesPeriodValue,
      icon: CheckCircle2, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50' 
    },
    { 
      label: 'Valor Mensual Rentas', 
      value: formatCurrency(activeRentalsValue), 
      sub: `${rentals.filter(r => r.status === 'active').length} rentas activas`,
      icon: Building2, 
      color: 'text-cyan-600', 
      bg: 'bg-cyan-50' 
    },
    { 
      label: 'Ciclo Promedio', 
      value: closedLeads.length > 0 ? `${avgCycleDays} días` : 'N/D', 
      sub: closedLeads.length > 0 ? `${briefingProgress}% checklist` : 'Primer cierre pendiente',
      icon: Clock, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50' 
    },
  ];

  return (
    <div className="space-y-8 p-6 bg-bg-main min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Dashboard Operativo</h1>
          <p className="text-slate-500 text-sm font-medium">Resumen de métricas y rendimiento del pipeline.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow relative"
          >
            <div className="flex items-start justify-between">
              <div className={`${stat.bg} ${stat.color} p-2.5 rounded-xl`}>
                <stat.icon size={20} />
              </div>
              <div className="flex flex-col items-end gap-1.5 min-w-0">
                {stat.periodKey && (
                  <div className="flex flex-wrap items-center justify-end gap-1.5 relative z-20">
                    <PeriodValueInput
                      type={stat.periodType}
                      value={stat.periodValue}
                      onChange={stat.setPeriodValue}
                      color={stat.periodKey === 'sales' ? 'indigo' : 'emerald'}
                    />
                    <div ref={stat.periodKey === 'pipeline' ? pipelineRef : salesRef} className="relative">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === stat.periodKey ? null : stat.periodKey)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 h-6 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all duration-200",
                          stat.periodKey === 'pipeline' 
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200 shadow-sm"
                            : "bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 shadow-sm"
                        )}
                      >
                        <CalendarDays size={11} />
                        <span>{PERIOD_LABELS[stat.periodType]}</span>
                        <motion.div
                          animate={{ rotate: openDropdown === stat.periodKey ? 180 : 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                          <ChevronDown size={11} className="shrink-0" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {openDropdown === stat.periodKey && (
                          <>
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-40 -mx-5 -my-5" 
                              onClick={() => setOpenDropdown(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: -8, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -8, scale: 0.96 }}
                              transition={{ type: "spring", stiffness: 400, damping: 35 }}
                              className={cn(
                                "absolute right-0 z-50 mt-2 w-44 bg-white rounded-2xl shadow-2xl shadow-slate-900/10 border border-slate-200 overflow-hidden p-1"
                              )}
                            >
                              {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((key, i) => {
                                const isSelected = stat.periodType === key;
                                
                                return (
                                  <motion.button
                                    key={key}
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    onClick={() => {
                                      stat.setPeriodType(key);
                                      stat.setPeriodValue(getDefaultPeriodValue(key));
                                      setOpenDropdown(null);
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all duration-150 group my-0.5",
                                      isSelected 
                                        ? stat.periodKey === 'pipeline'
                                          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100"
                                          : "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100"
                                        : "text-slate-600 hover:bg-slate-50"
                                    )}
                                  >
                                    <span className="flex flex-col items-start">
                                      <span>{PERIOD_LABELS[key]}</span>
                                      <span className="text-[9px] font-medium opacity-60 uppercase tracking-tight">
                                        {PERIOD_DESC[key]}
                                      </span>
                                    </span>
                                    {isSelected && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 500 }}
                                        className={cn(
                                          "w-5 h-5 rounded-lg flex items-center justify-center",
                                          stat.periodKey === 'pipeline' ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white"
                                        )}
                                      >
                                        <Check size={12} />
                                      </motion.div>
                                    )}
                                  </motion.button>
                                );
                              })}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                <span className="text-[9px] font-bold text-slate-400 uppercase text-right max-w-[180px] leading-tight">
                  {stat.sub}
                </span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ROW 2: STAGE FUNNEL + RISK ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FUNNEL DE ETAPAS (Funcional) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Target size={20} className="text-indigo-500" />
              Pipeline por Etapa
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {allNonArchived.length} total
            </span>
          </div>
          
          <div className="space-y-3">
            {stageBreakdown.map((row, i) => (
              <div key={row.stage}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      row.stage === 'Ingreso' ? 'bg-blue-500' :
                      row.stage === 'Briefing' ? 'bg-amber-500' :
                      row.stage === 'Propuesta' ? 'bg-indigo-500' :
                      'bg-emerald-500'
                    )} />
                    <span className="text-xs font-bold text-slate-700">{row.stage}</span>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      {row.count}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-900">{formatCurrency(row.value)}</span>
                    <span className="text-[9px] font-bold text-slate-400">
                      ⏱ {row.avgDays}d promedio
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${allNonArchived.length > 0 ? (row.count / allNonArchived.length) * 100 : 0}%` }}
                    transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                    className={cn(
                      "h-full rounded-full",
                      row.stage === 'Ingreso' ? 'bg-blue-500' :
                      row.stage === 'Briefing' ? 'bg-amber-500' :
                      row.stage === 'Propuesta' ? 'bg-indigo-500' :
                      'bg-emerald-500'
                    )}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* FORECAST */}
          <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-emerald-50 rounded-xl border border-indigo-100/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-0.5">
                  Pronóstico Ponderado
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Basado en probabilidad de cierre por etapa
                </p>
              </div>
              <p className="text-2xl font-black text-indigo-700">{formatCurrency(weightedForecast)}</p>
            </div>
          </div>
        </motion.div>

        {/* ALERTA DE RIESGO (Funcional) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={cn(
            "border p-6 rounded-2xl shadow-sm",
            staleLeads.length > 0 
              ? "bg-rose-50 border-rose-200" 
              : "bg-emerald-50 border-emerald-200"
          )}
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              {staleLeads.length > 0 ? (
                <ShieldAlert size={20} className="text-rose-500" />
              ) : (
                <Activity size={20} className="text-emerald-500" />
              )}
              Estado de Actividad
            </h3>
            {staleLeads.length > 0 && (
              <span className="bg-rose-500 text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase animate-pulse">
                {staleLeads.length} en riesgo
              </span>
            )}
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between p-2.5 bg-white/70 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Zap size={12} className="text-emerald-500" /> Activos (≤2 días)
              </span>
              <span className="text-sm font-black text-emerald-600">{recentlyActive.length}</span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-white/70 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Clock size={12} className="text-amber-500" /> Normal (3-6 días)
              </span>
              <span className="text-sm font-black text-amber-600">
                {activeLeads.length - recentlyActive.length - staleLeads.length}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 bg-white/70 rounded-xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                <Flame size={12} className="text-rose-500" /> Riesgo (≥{DAYS_TO_STALE} días)
              </span>
              <span className="text-sm font-black text-rose-600">{staleLeads.length}</span>
            </div>
          </div>

          {/* Lista de leads en riesgo */}
          {staleLeads.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">
                Requieren seguimiento:
              </p>
              {staleLeads.slice(0, 5).map(l => (
                <div key={l.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-rose-100">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold text-slate-800 truncate">{l.lead_name}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{l.stage}</span>
                  </div>
                  <span className="text-[9px] font-black text-rose-500 whitespace-nowrap ml-2">
                    {getDaysAgo(l.last_activity)}d inactivo
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {staleLeads.length === 0 && (
            <div className="p-4 bg-white/80 rounded-xl text-center">
              <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-[10px] font-bold text-emerald-700">Todo al día</p>
              <p className="text-[9px] text-emerald-600/70 mt-0.5">Ningún lead estancado</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ROW 3: CATEGORY + SEGUIMIENTO */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* TOP CATEGORÍAS + CHECKLIST PROGRESS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Top Categorías */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm"
          >
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-5">
              <DollarSign size={20} className="text-amber-500" />
              Top Categorías
            </h3>
            
            {categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {categoryBreakdown.map((cat, i) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-700 truncate">{cat.category}</span>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {cat.count}
                        </span>
                        <span className="text-[11px] font-black text-slate-900">
                          {formatCurrency(cat.value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${totalPipelineValue > 0 ? (cat.value / totalPipelineValue) * 100 : 0}%` }}
                        transition={{ delay: 0.7 + i * 0.1 }}
                        className={cn(
                          "h-full rounded-full",
                          i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-indigo-400' : 'bg-blue-400'
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Sin datos aún</p>
              </div>
            )}
          </motion.div>

          {/* Checklist Progreso */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm"
          >
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-5">
              <CalendarDays size={20} className="text-blue-500" />
              Avance Briefing
            </h3>
            
            <div className="flex flex-col items-center justify-center py-3">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" className="fill-none stroke-slate-100" strokeWidth="10" />
                  <motion.circle
                    initial={{ strokeDasharray: '0 264' }}
                    animate={{ strokeDasharray: `${(briefingProgress / 100) * 264} 264` }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    cx="50" cy="50" r="42" 
                    className="fill-none stroke-blue-500" 
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black text-slate-900">{briefingProgress}%</span>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-3 text-center">
                Checklist completado en etapa Briefing
              </p>
              <p className="text-[10px] text-slate-500 mt-1 text-center">
                {stageBreakdown[1]?.count || 0} lead{stageBreakdown[1]?.count === 1 ? '' : 's'} en Briefing
              </p>
            </div>
          </motion.div>

          {/* Cierre rápido + Prioridad */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-br from-emerald-50 via-white to-indigo-50 border border-emerald-200 p-6 rounded-2xl shadow-sm"
          >
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-5">
              <TrendingUp size={20} className="text-emerald-500" />
              Oportunidades Clave
            </h3>
            
            <div className="space-y-3">
              <div className="p-3 bg-white rounded-xl border border-emerald-100 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-emerald-600 uppercase">Prioridad Alta</span>
                    <span className="text-[10px] text-slate-500">Requieren follow-up inmediato</span>
                  </div>
                  <span className="text-xl font-black text-slate-900">{priorityLeads.length}</span>
                </div>
                {/* Lista de leads de prioridad alta */}
                {priorityLeads.length > 0 && (
                  <div className="mt-1 space-y-1.5 border-t border-emerald-50 pt-2 max-h-32 overflow-y-auto pr-1">
                    {priorityLeads.map(l => (
                      <div key={l.id} className="flex justify-between items-center text-[10px] bg-emerald-50/80 p-1.5 rounded-lg">
                        <span className="font-bold text-emerald-900 truncate flex-1">{l.lead_name}</span>
                        <span className="text-emerald-700 font-black ml-2">{formatCurrency(l.budget || 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-white rounded-xl border border-indigo-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-indigo-600 uppercase">Etapa Propuesta</span>
                  <span className="text-[10px] text-slate-500">Cierre potencial cercano</span>
                </div>
                <span className="text-xl font-black text-slate-900">{stageBreakdown[2]?.count || 0}</span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Ticket Promedio</span>
                  <span className="text-[10px] text-slate-400">Por lead activo</span>
                </div>
                <span className="text-xl font-black text-slate-900">
                  {activeLeads.length > 0 
                    ? formatCurrency(Math.round(totalPipelineValue / activeLeads.length))
                    : '$0'
                  }
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* LEADS EN SEGUIMIENTO */}
        <div className="bg-white border border-slate-200 p-8 rounded-2xl space-y-8 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-6">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
              <Users size={24} className="text-indigo-500" />
              Leads en Seguimiento
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                Briefing + Propuesta
              </span>
            </h3>
            <div className="flex items-center gap-2">
              {staleLeads.filter(l => l.stage !== 'Ingreso').length > 0 && (
                <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <AlertCircle size={11} />
                  {staleLeads.filter(l => l.stage !== 'Ingreso').length} estancado{staleLeads.filter(l => l.stage !== 'Ingreso').length === 1 ? '' : 's'}
                </span>
              )}
              <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                {activeLeads.filter(l => l.stage !== 'Ingreso').length} activos
              </span>
            </div>
          </div>

          {activeLeads.filter(l => l.stage !== 'Ingreso').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeLeads
                .filter(l => l.stage !== 'Ingreso')
                .sort((a, b) => getDaysAgo(b.last_activity) - getDaysAgo(a.last_activity))
                .map(lead => {
                  const daysStale = getDaysAgo(lead.last_activity);
                  const isStale = daysStale >= DAYS_TO_STALE;
                  const daysTotal = getDaysBetween(lead.created_at || lead.last_activity, now);
                  
                  return (
                  <div 
                    key={lead.id} 
                    className={cn(
                      "group flex flex-col p-4 rounded-2xl border transition-all hover:shadow-lg relative",
                      isStale 
                        ? "bg-rose-50/50 border-rose-200 hover:bg-rose-50 hover:shadow-rose-500/5" 
                        : "bg-slate-50 hover:bg-white hover:border-indigo-200 border-slate-100 hover:shadow-indigo-500/5"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                          {lead.lead_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-tighter">
                          {lead.project_name}
                        </span>
                      </div>
                      <span className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0 ml-2",
                        lead.stage === 'Briefing' ? "bg-blue-100 text-blue-600" :
                        lead.stage === 'Propuesta' ? "bg-indigo-100 text-indigo-600" :
                        "bg-emerald-100 text-emerald-600"
                      )}>
                        {lead.stage}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 mb-3">
                      {/* Días en sistema */}
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                          <Clock size={9} /> Antigüedad
                        </span>
                        <span className="text-[9px] font-black text-slate-600">{daysTotal} días</span>
                      </div>
                      {/* Última actividad */}
                      <div className={cn(
                        "flex items-center justify-between p-1.5 rounded-lg",
                        isStale ? "bg-rose-100/50" : "bg-slate-100/50"
                      )}>
                        <span className={cn(
                          "text-[9px] font-bold uppercase flex items-center gap-1",
                          isStale ? "text-rose-600" : "text-slate-500"
                        )}>
                          {isStale ? <Flame size={9} /> : <Activity size={9} />}
                          Última actividad
                        </span>
                        <span className={cn(
                          "text-[9px] font-black",
                          isStale ? "text-rose-600" : "text-slate-700"
                        )}>
                          {daysStale}d atrás
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-200/50">
                      <span className="text-xs font-black text-emerald-600">
                        {formatCurrency(lead.budget || 0)}
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

                    {/* Badge de prioridad */}
                    {lead.is_priority && (
                      <div className="absolute -top-2 -right-2">
                        <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-full shadow-lg shadow-rose-500/30 flex items-center gap-1 animate-pulse border-2 border-white">
                          <AlertCircle size={10} />
                          ALTA PRIORIDAD
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <Users size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-500">Sin leads en seguimiento aún</p>
              <p className="text-[11px] text-slate-400 mt-1">Avance los leads desde Ingreso para empezar a ver datos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

