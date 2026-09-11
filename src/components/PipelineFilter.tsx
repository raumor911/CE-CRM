import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, ChevronDown, X, Clock, AlertCircle, Calendar, User, Briefcase, Tag, Trash2, Save, Star, TrendingUp, DollarSign, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead } from '../types';
import { cn, formatCurrency, getDaysAgo, isToday, isOverdue } from '../lib/utils';

export type PipelineStageFilter = 'all' | 'Ingreso' | 'Briefing' | 'Propuesta' | 'Cierre';

export interface FilterState {
  searchQuery: string;
  stage: PipelineStageFilter;
  quickFilter: string | null;
  responsible: string | null;
  product: string | null;
  operation: string | null; // Venta, Renta
  dateRange: { from: string; to: string } | null;
  budgetRange: { min: number; max: number } | null;
  daysWithoutActivity: number | null;
}

interface PipelineFilterProps {
  leads: Lead[];
  onFilterChange: (filteredLeads: Lead[]) => void;
}

export const PipelineFilter: React.FC<PipelineFilterProps> = ({ leads, onFilterChange }) => {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    stage: 'all',
    quickFilter: null,
    responsible: null,
    product: null,
    operation: null,
    dateRange: null,
    budgetRange: null,
    daysWithoutActivity: null,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);

  // Opciones de Responsables dinámicas
  const responsibles = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.assigned_to) set.add(l.assigned_to);
      if (l.user_id) set.add(l.user_id); // Fallback o similar
    });
    return Array.from(set);
  }, [leads]);

  // Opciones de Productos (Categorías)
  const categories = ['Compra Contenedor', 'Proyecto', '10 ft Modificado', 'Renta Contenedor', 'Renta Oficina 20 ft'];

  // Etapas del pipeline para el selector
  const stageOptions: { id: PipelineStageFilter; label: string; description: string }[] = [
    { id: 'all', label: 'Todo el pipeline', description: 'Visión global de todas las oportunidades' },
    { id: 'Ingreso', label: 'Captura', description: 'Leads nuevos y por revisar' },
    { id: 'Briefing', label: 'Calificación', description: 'Evaluación técnica y requerimientos' },
    { id: 'Propuesta', label: 'Cotización y Seguimiento', description: 'Propuestas enviadas y negociación activa' },
    { id: 'Cierre', label: 'Cerrados', description: 'Ventas ganadas o perdidas' },
  ];

  // Vistas rápidas dinámicas según la etapa
  const getQuickViews = (stage: PipelineStageFilter) => {
    const base = [
      { id: 'all', label: 'Todos', icon: Tag },
      { id: 'today', label: 'Hoy', icon: Calendar },
      { id: 'overdue', label: 'Vencidos', icon: AlertCircle },
      { id: 'stale', label: 'Sin actividad', icon: Clock },
    ];

    if (stage === 'Ingreso') {
      return [
        { id: 'all', label: 'Todos', icon: Tag },
        { id: 'unattended', label: 'Sin atender', icon: AlertCircle },
        { id: 'today', label: 'Nuevos hoy', icon: Calendar },
        { id: 'no_responsible', label: 'Sin responsable', icon: User },
      ];
    }

    if (stage === 'Briefing') {
      return [
        { id: 'all', label: 'Todos', icon: Tag },
        { id: 'pending', label: 'Pendientes', icon: Clock },
        { id: 'qualified', label: 'Calificados', icon: Star },
        { id: 'no_responsible', label: 'Sin responsable', icon: User },
      ];
    }

    if (stage === 'Propuesta') {
      return [
        { id: 'all', label: 'Todas', icon: Tag },
        { id: 'to_prepare', label: 'Por preparar', icon: Clock },
        { id: 'sent', label: 'Enviadas', icon: Send },
        { id: 'no_followup', label: 'Sin seguimiento', icon: AlertCircle },
        { id: 'stale_7', label: '+7 días', icon: Clock },
      ];
    }

    if (stage === 'Cierre') {
      return [
        { id: 'all', label: 'Todos', icon: Tag },
        { id: 'won', label: 'Ganados', icon: Star },
        { id: 'lost', label: 'Perdidos', icon: Trash2 },
        { id: 'this_month', label: 'Este mes', icon: Calendar },
      ];
    }

    return base;
  };

  const activeQuickViews = getQuickViews(filters.stage);

  // Lógica de filtrado centralizada
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // 1. Manejo de Archivo
      // Por defecto no mostramos archivados a menos que estemos en Cierre o buscando Perdidos
      const isLostFilter = filters.quickFilter === 'lost';
      const isCierreStage = filters.stage === 'Cierre';
      
      if (lead.is_archived) {
        if (!isCierreStage && !isLostFilter) return false;
        // Si estamos en Cierre o Perdidos, mostramos archivados si el motivo no es 'Converted' (ganado)
        if (isLostFilter && lead.archive_reason === 'Converted') return false;
      }

      // 2. Etapa
      if (filters.stage !== 'all' && lead.stage !== filters.stage) return false;

      // 3. Búsqueda Global
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matches = 
          lead.lead_name.toLowerCase().includes(query) ||
          lead.project_name.toLowerCase().includes(query) ||
          lead.email?.toLowerCase().includes(query) ||
          lead.phone.includes(query);
        if (!matches) return false;
      }

      // 4. Vistas Rápidas
      if (filters.quickFilter && filters.quickFilter !== 'all') {
        switch (filters.quickFilter) {
          case 'today':
            if (!isToday(lead.created_at || lead.last_activity)) return false;
            break;
          case 'overdue':
            if (!isOverdue(lead.last_activity, 7)) return false;
            break;
          case 'stale':
          case 'stale_7':
            if (getDaysAgo(lead.last_activity) < 7) return false;
            break;
          case 'unattended':
            if ((lead.whatsapp_interaction_count || 0) > 0) return false;
            break;
          case 'no_responsible':
            if (lead.assigned_to) return false;
            break;
          case 'pending':
            if (lead.stage === 'Briefing' && (lead.checklist_briefing?.m2 && lead.checklist_briefing?.deadlines)) return false;
            break;
          case 'qualified':
            if (lead.stage === 'Briefing' && !(lead.checklist_briefing?.m2 && lead.checklist_briefing?.deadlines)) return false;
            break;
          case 'to_prepare':
            if (lead.stage === 'Propuesta' && lead.budget && lead.budget > 0) return false;
            break;
          case 'sent':
            if (lead.stage === 'Propuesta' && (!lead.budget || lead.budget === 0)) return false;
            break;
          case 'won':
            if (lead.stage !== 'Cierre' || lead.is_archived) return false;
            break;
          case 'lost':
            if (!lead.is_archived || lead.archive_reason === 'Converted') return false;
            break;
          case 'this_month':
            const date = new Date(lead.contract_signed_at || lead.last_activity);
            const now = new Date();
            if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
            break;
        }
      }

      // 5. Filtros Avanzados
      if (filters.responsible && lead.assigned_to !== filters.responsible) return false;
      if (filters.product && lead.category !== filters.product) return false;
      if (filters.operation) {
        const isRenta = lead.category?.toLowerCase().includes('renta');
        if (filters.operation === 'Renta' && !isRenta) return false;
        if (filters.operation === 'Venta' && isRenta) return false;
      }
      if (filters.budgetRange) {
        const budget = lead.budget || 0;
        if (budget < filters.budgetRange.min || budget > (filters.budgetRange.max || Infinity)) return false;
      }

      return true;
    });
  }, [leads, filters]);

  useEffect(() => {
    onFilterChange(filteredLeads);
  }, [filteredLeads, onFilterChange]);

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      stage: 'all',
      quickFilter: null,
      responsible: null,
      product: null,
      operation: null,
      dateRange: null,
      budgetRange: null,
      daysWithoutActivity: null,
    });
  };

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'stage' && value === 'all') return false;
    if (key === 'quickFilter' && (!value || value === 'all')) return false;
    if (key === 'searchQuery' && !value) return false;
    return value !== null && value !== '';
  }).length;

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 space-y-4">
      {/* Capa 1 y 2: Jerarquía de búsqueda */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between max-w-[1600px] mx-auto">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative">
            <button
              onClick={() => setIsStageDropdownOpen(!isStageDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all min-w-[200px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-indigo-500" />
                <span>{stageOptions.find(s => s.id === filters.stage)?.label}</span>
              </div>
              <ChevronDown size={14} className={cn("transition-transform", isStageDropdownOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isStageDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsStageDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 w-[280px] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="p-3 bg-slate-50 border-b border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">¿En qué parte del proceso buscas?</p>
                    </div>
                    <div className="p-2">
                      {stageOptions.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => {
                            updateFilter('stage', opt.id);
                            updateFilter('quickFilter', 'all');
                            setIsStageDropdownOpen(false);
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-xl transition-all group",
                            filters.stage === opt.id ? "bg-indigo-50" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-bold", filters.stage === opt.id ? "text-indigo-600" : "text-slate-700")}>{opt.label}</span>
                            <span className="text-[10px] text-slate-400 group-hover:text-slate-500">{opt.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex-1 md:min-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={`Buscar lead, empresa, teléfono... ${filters.stage !== 'all' ? `en ${stageOptions.find(s => s.id === filters.stage)?.label}` : ''}`}
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm group"
          >
            <Filter size={16} className="group-hover:scale-110 transition-transform" />
            <span>+ Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Capa 3: Vistas rápidas dinámicas */}
      <div className="flex items-center gap-2 max-w-[1600px] mx-auto overflow-x-auto scrollbar-hide py-1">
        {activeQuickViews.map((view) => (
          <button
            key={view.id}
            onClick={() => updateFilter('quickFilter', view.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border shrink-0",
              filters.quickFilter === view.id || (!filters.quickFilter && view.id === 'all')
                ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20"
                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
            )}
          >
            <view.icon size={12} />
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {/* Capa 4: Chips de filtros activos */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center flex-wrap gap-2 pt-2 border-t border-slate-100 max-w-[1600px] mx-auto"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Filtros activos:</span>
            
            {filters.stage !== 'all' && (
              <FilterChip label={stageOptions.find(s => s.id === filters.stage)?.label || ''} onClear={() => {
                updateFilter('stage', 'all');
                updateFilter('quickFilter', 'all');
              }} />
            )}
            {filters.quickFilter && filters.quickFilter !== 'all' && (
              <FilterChip label={activeQuickViews.find(v => v.id === filters.quickFilter)?.label || ''} onClear={() => updateFilter('quickFilter', 'all')} />
            )}
            {filters.responsible && (
              <FilterChip label={`Responsable: ${filters.responsible}`} onClear={() => updateFilter('responsible', null)} />
            )}
            {filters.product && (
              <FilterChip label={filters.product} onClear={() => updateFilter('product', null)} />
            )}
            {filters.operation && (
              <FilterChip label={filters.operation} onClear={() => updateFilter('operation', null)} />
            )}

            <button
              onClick={clearFilters}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest ml-auto"
            >
              Limpiar todo
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel lateral de filtros */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-screen w-full max-w-[360px] bg-white shadow-2xl z-[101] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <Filter size={18} />
                  </div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">Filtrar Oportunidades</h3>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Sección Responsable */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={12} /> Responsable
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <select
                      value={filters.responsible || ''}
                      onChange={(e) => updateFilter('responsible', e.target.value || null)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                      <option value="">Todos los responsables</option>
                      {responsibles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sección Producto */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Tag size={12} /> Producto / Categoría
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => updateFilter('product', filters.product === cat ? null : cat)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all border",
                          filters.product === cat ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo de Operación */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={12} /> Tipo de Operación
                  </label>
                  <div className="flex gap-2">
                    {['Venta', 'Renta'].map(op => (
                      <button
                        key={op}
                        onClick={() => updateFilter('operation', filters.operation === op ? null : op)}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border",
                          filters.operation === op ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-100 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rango de Presupuesto */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={12} /> Presupuesto
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-400">Mínimo</span>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                        onChange={(e) => updateFilter('budgetRange', { ...filters.budgetRange, min: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-slate-400">Máximo</span>
                      <input
                        type="number"
                        placeholder="∞"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                        onChange={(e) => updateFilter('budgetRange', { ...filters.budgetRange, max: Number(e.target.value) || 9999999 })}
                      />
                    </div>
                  </div>
                </div>

                {/* Vistas Guardadas (Mock) */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Star size={12} /> Vistas Guardadas
                  </label>
                  <div className="space-y-2">
                    {[
                      { label: 'Mis leads olvidados', count: 6, icon: Clock },
                      { label: 'Cotizaciones abiertas', count: 12, icon: TrendingUp },
                      { label: 'Leads nuevos hoy', count: 4, icon: Calendar },
                    ].map((view, i) => (
                      <button
                        key={i}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <view.icon size={14} className="text-slate-400 group-hover:text-indigo-500" />
                          <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">{view.label}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                          {view.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>Resultados encontrados:</span>
                  <span className="text-indigo-600">{filteredLeads.length}</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-600/20"
                >
                  Aplicar Filtros
                </button>
                <button
                  onClick={clearFilters}
                  className="w-full py-3 bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 font-bold text-xs uppercase tracking-widest rounded-2xl transition-all"
                >
                  Limpiar filtros
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterChip: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
  <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-700 animate-in fade-in slide-in-from-left-2">
    <span>{label}</span>
    <button onClick={onClear} className="hover:text-indigo-900 transition-colors">
      <X size={10} />
    </button>
  </div>
);

const CheckCircle2 = ({ size, className }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);
