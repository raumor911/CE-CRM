import React, { useState, useEffect } from 'react';
import { Plus, Package, Search, Filter, Loader2, Info, BarChart2, Clock, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductRegistrationForm } from './modals/ProductRegistrationForm';
import { ProductDetailPanel } from './inventory/ProductDetailPanel';
import { useInventory } from '../hooks/useInventory';
import { 
  Product,
  ProductType, 
  ProductCondition, 
  ProductLocation, 
  ProductOperationalStatus 
} from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

type CommercialAlternative = 'all' | 'sale' | 'rent' | 'modification';

interface InventoryFilters {
  productType: ProductType | 'all';
  condition: ProductCondition | 'all';
  location: ProductLocation | 'all';
  status: ProductOperationalStatus | 'all';
  commercialAlternative: CommercialAlternative;
}

const DEFAULT_FILTERS: InventoryFilters = {
  productType: 'all',
  condition: 'all',
  location: 'all',
  status: 'all',
  commercialAlternative: 'all'
};

interface FilterSelectProps {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  value,
  options,
  onChange
}) => (
  <label className="block space-y-1.5">
    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {label}
    </span>
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
    >
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  </label>
);

const InventoryStats = ({ products }: { products: Product[] }) => {
  const stats = React.useMemo(() => {
    const total = products.length;
    const counts: {
      Disponible: { total: number; breakdown: Record<string, number> };
      Rentados: { total: number; breakdown: Record<string, number> };
      Reservados: number;
      Modificacion: number;
      Mantenimiento: number;
    } = {
       Disponible: {
         total: products.filter(p => p.operational_status === 'Disponible').length,
         breakdown: {
           'Oficina': products.filter(p => p.operational_status === 'Disponible' && p.product_type === 'Oficina').length,
           '20 DC': products.filter(p => p.operational_status === 'Disponible' && p.product_type === '20 DC').length,
           '40 DC': products.filter(p => p.operational_status === 'Disponible' && p.product_type === '40 DC').length,
           '40 HC': products.filter(p => p.operational_status === 'Disponible' && p.product_type === '40 HC').length,
         }
       },
       Rentados: {
         total: products.filter(p => p.operational_status === 'Rentada').length,
         breakdown: {
           'Oficina': products.filter(p => p.operational_status === 'Rentada' && p.product_type === 'Oficina').length,
           'Containers': products.filter(p => p.operational_status === 'Rentada' && p.product_type !== 'Oficina').length,
         }
       },
       Reservados: products.filter(p => p.operational_status === 'Reservada').length,
       Modificacion: products.filter(p => (p.operational_status === 'En retorno' || p.operational_status === 'Inspección') && p.product_type !== 'Oficina').length,
       Mantenimiento: products.filter(p => p.operational_status === 'Mantenimiento').length,
     };

    const alternatives = {
      Venta: products.filter(p => p.available_for_sale).length,
      Renta: products.filter(p => p.available_for_rent).length,
      Modificacion: products.filter(p => p.available_for_modification).length,
    };

    const availability = total > 0 ? Math.round((counts.Disponible.total / total) * 100) : 0;
    const ninetyDaysAgo = subDays(new Date(), 90);
    const staleCount = products.filter(p => new Date(p.updated_at) < ninetyDaysAgo).length;

    return {
      total,
      counts,
      alternatives,
      availability,
      staleCount,
      activeMaintenance: counts.Mantenimiento
    };
  }, [products]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Indicadores Principales */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 40 }}
        className="bg-white border border-slate-200 p-5 md:p-6 rounded-2xl shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="bg-slate-50 p-2.5 rounded-xl">
            <Package size={20} className="text-slate-600" />
          </div>
          <div className="text-right">
            <span className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{stats.total}</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activos Totales</p>
          </div>
        </div>
        
        <div className="space-y-4 pt-2 border-t border-slate-50">
          {/* Disponible */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Disponible</span>
              </div>
              <span className="text-slate-900">{stats.counts.Disponible.total}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-3.5">
              {(Object.entries(stats.counts.Disponible.breakdown) as [string, number][]).map(([type, count]) => (
                count > 0 && (
                  <div key={type} className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    <span>{type}</span>
                    <span className="text-slate-600">{count}</span>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Rentados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-slate-500">Rentados</span>
              </div>
              <span className="text-slate-900">{stats.counts.Rentados.total}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-3.5">
              {(Object.entries(stats.counts.Rentados.breakdown) as [string, number][]).map(([type, count]) => (
                count > 0 && (
                  <div key={type} className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    <span>{type}</span>
                    <span className="text-slate-600">{count}</span>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* Otros Estados */}
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider pt-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-slate-500">Reservados</span>
            </div>
            <span className="text-slate-900">{stats.counts.Reservados}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-slate-500">Modificación</span>
            </div>
            <span className="text-slate-900">{stats.counts.Modificacion}</span>
          </div>
        </div>
      </motion.div>

      {/* Disponibilidad */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 40, delay: 0.1 }}
        className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between"
      >
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilidad</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-slate-900">{stats.availability}%</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${stats.availability}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
      </motion.div>

      {/* Alternativa Comercial */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 40, delay: 0.2 }}
        className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4"
      >
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Por alternativa comercial</span>
        <div className="space-y-3">
          {[
            { label: 'Venta', count: stats.alternatives.Venta },
            { label: 'Renta', count: stats.alternatives.Renta },
            { label: 'Modificación', count: stats.alternatives.Modificacion }
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">{item.label}</span>
              <span className="text-xs font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{item.count}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Métricas de Acción */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 40, delay: 0.3 }}
        className="bg-slate-900 p-6 rounded-2xl shadow-lg shadow-slate-900/10 space-y-4"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-400">
              <Clock size={14} />
              <span className="text-[10px] font-black uppercase tracking-tight">Sin movimiento +90 días</span>
            </div>
            <span className="text-xs font-black text-white">{stats.staleCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={14} />
              <span className="text-[10px] font-black uppercase tracking-tight">Reservas por vencer</span>
            </div>
            <span className="text-xs font-black text-white">2</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <BarChart2 size={14} />
              <span className="text-[10px] font-black uppercase tracking-tight">Mantenimiento activo</span>
            </div>
            <span className="text-xs font-black text-white">{stats.activeMaintenance}</span>
          </div>
        </div>
        <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
          Ver acciones pendientes
          <ArrowRight size={12} />
        </button>
      </motion.div>
    </div>
  );
};

export const InventoryView: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { products, loading, fetchProducts, registerProduct } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectedProduct = React.useMemo(
    () => products.find(p => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase('es-MX');

  const filteredProducts = products.filter(product => {
    const matchesSearch =
      normalizedSearch === '' ||
      product.internal_id.toLocaleLowerCase('es-MX').includes(normalizedSearch) ||
      product.physical_number?.toLocaleLowerCase('es-MX').includes(normalizedSearch);

    const matchesProduct =
      filters.productType === 'all' ||
      product.product_type === filters.productType;

    const matchesCondition =
      filters.condition === 'all' ||
      product.condition === filters.condition;

    const matchesLocation =
      filters.location === 'all' ||
      product.location === filters.location;

    const matchesStatus =
      filters.status === 'all' ||
      product.operational_status === filters.status;

    const matchesCommercialAlternative =
      filters.commercialAlternative === 'all' ||
      (filters.commercialAlternative === 'sale' && product.available_for_sale) ||
      (filters.commercialAlternative === 'rent' && product.available_for_rent) ||
      (filters.commercialAlternative === 'modification' && product.available_for_modification);

    return (
      matchesSearch &&
      matchesProduct &&
      matchesCondition &&
      matchesLocation &&
      matchesStatus &&
      matchesCommercialAlternative
    );
  });

  const activeFilterCount = Object.values(filters).filter(value => value !== 'all').length;
  const hasActiveCriteria = normalizedSearch !== '' || activeFilterCount > 0;

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery('');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Disponible': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Reservada': 
      case 'Reservado': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Rentada':
      case 'Rentado': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Vendido': return 'bg-zinc-900 text-white border-zinc-800';
      case 'Mantenimiento': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Fuera de servicio': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'En retorno': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'Inspección': return 'bg-orange-50 text-orange-700 border-orange-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 min-h-screen font-sans text-gray-900 relative">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        
        <div className="flex justify-end items-center">
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> REGISTRO
          </button>
        </div>

        {/* Dashboard de Inventario */}
        <InventoryStats products={products} />

        {/* Filters and Search */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por ID o número físico..."
                className="w-full pl-9 pr-4 py-3 md:py-2 text-base md:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            
            <div className="relative">
              <button 
                type="button"
                onClick={() => setFiltersOpen(open => !open)}
                aria-expanded={filtersOpen}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all h-11 min-w-[44px]',
                  activeFilterCount > 0 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-500/10' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-tight">Filtros</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-black text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {filtersOpen && (
                  <>
                    {/* Backdrop for mobile */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setFiltersOpen(false)}
                      className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none"
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.95 }}
                      className={cn(
                        "fixed inset-x-0 bottom-0 z-50 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2 w-full md:w-80",
                        "bg-white border-t md:border border-slate-200 rounded-t-3xl md:rounded-2xl shadow-2xl p-6 md:p-4 overflow-hidden"
                      )}
                    >
                      <div className="space-y-6 md:space-y-4 max-h-[80vh] overflow-y-auto scrollbar-hide pb-6 md:pb-0">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-4 md:border-none md:pb-0">
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Filtrar inventario</h3>
                          {activeFilterCount > 0 && (
                            <button 
                              type="button" 
                              onClick={clearFilters}
                              className="text-xs font-black text-rose-500 uppercase tracking-widest"
                            >
                              Limpiar
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:gap-4">
                          <FilterSelect 
                            label="Tipo de producto" 
                            value={filters.productType} 
                            onChange={value => setFilters(current => ({ ...current, productType: value as InventoryFilters['productType'] }))}
                            options={[
                              ['all', 'Todos'],
                              ['Oficina', 'Oficina'],
                              ['20 DC', '20 DC'],
                              ['40 DC', '40 DC'],
                              ['40 HC', '40 HC']
                            ]}
                          />

                          <FilterSelect 
                            label="Condición" 
                            value={filters.condition} 
                            onChange={value => setFilters(current => ({ ...current, condition: value as InventoryFilters['condition'] }))}
                            options={[
                              ['all', 'Todas'],
                              ['Nuevo', 'Nuevo'],
                              ['Excelente', 'Excelente'],
                              ['Bueno', 'Bueno'],
                              ['Regular', 'Regular'],
                              ['Requiere reparación', 'Requiere reparación']
                            ]}
                          />

                          <FilterSelect 
                            label="Ubicación" 
                            value={filters.location} 
                            onChange={value => setFilters(current => ({ ...current, location: value as InventoryFilters['location'] }))}
                            options={[
                              ['all', 'Todas'],
                              ['Patio principal', 'Patio principal'],
                              ['Taller', 'Taller'],
                              ['Cliente', 'Cliente'],
                              ['En traslado', 'En traslado'],
                              ['Proveedor', 'Proveedor'],
                              ['Otra ubicación', 'Otra ubicación']
                            ]}
                          />

                          <FilterSelect 
                            label="Estado operativo" 
                            value={filters.status} 
                            onChange={value => setFilters(current => ({ ...current, status: value as InventoryFilters['status'] }))}
                            options={[
                              ['all', 'Todos'],
                              ['Disponible', 'Disponible'],
                              ['Reservada', 'Reservada'],
                              ['Rentada', 'Rentada'],
                              ['Vendido', 'Vendido'],
                              ['Mantenimiento', 'Mantenimiento'],
                              ['Fuera de servicio', 'Fuera de servicio'],
                              ['En retorno', 'En retorno'],
                              ['Inspección', 'Inspección']
                            ]}
                          />

                          <FilterSelect 
                            label="Alternativa comercial" 
                            value={filters.commercialAlternative} 
                            onChange={value => setFilters(current => ({ ...current, commercialAlternative: value as CommercialAlternative }))}
                            options={[
                              ['all', 'Todas'],
                              ['sale', 'Venta'],
                              ['rent', 'Renta'],
                              ['modification', 'Modificación']
                            ]}
                          />
                        </div>

                        <button 
                          type="button"
                          onClick={() => setFiltersOpen(false)}
                          className="w-full rounded-2xl bg-zinc-900 px-4 py-4 md:py-2 text-xs font-black text-white uppercase tracking-[0.2em] shadow-xl shadow-zinc-900/10 active:scale-95 transition-all mt-4"
                        >
                          Ver {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="hidden md:block text-[11px] font-black text-slate-400 uppercase tracking-widest">
            {filteredProducts.length} Activos en total
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm text-zinc-500 font-medium tracking-widest uppercase">Consultando Stock...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <Info className="text-slate-400" size={32} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Sin coincidencias</p>
                <p className="text-xs text-slate-500 font-medium">Prueba con otros criterios de búsqueda.</p>
              </div>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View: Cards */}
              <div className="md:hidden grid grid-cols-1 gap-4 pb-10">
                {filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedProductId(product.id)}
                    className={cn(
                      "bg-white rounded-2xl border border-slate-200 p-5 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden",
                      selectedProductId === product.id ? "ring-2 ring-indigo-500/20 border-indigo-500" : ""
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-base font-black text-slate-900 uppercase tracking-tight">
                          {product.internal_id}
                        </span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {product.product_type}
                        </span>
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                        getStatusBadgeColor(product.operational_status)
                      )}>
                        {product.operational_status}
                      </span>
                    </div>

                    <div className="space-y-4 mb-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Condición</span>
                        <div className="text-sm font-bold text-slate-700">{product.condition}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación</span>
                        <div className="text-sm font-bold text-slate-700">{product.location}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex gap-2">
                        {product.available_for_sale && (
                          <span className="text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-tighter">Venta</span>
                        )}
                        {product.available_for_rent && (
                          <span className="text-[10px] font-black text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded uppercase tracking-tighter">Renta</span>
                        )}
                      </div>
                      <button className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 min-h-[44px] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-zinc-900/10 active:scale-95 transition-all">
                        Ver producto
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificador</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Condición</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ubicación</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Uso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredProducts.map((product) => (
                      <motion.tr 
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => setSelectedProductId(product.id)}
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors group cursor-pointer",
                          selectedProductId === product.id ? "bg-indigo-50/50" : ""
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {product.internal_id}
                            </span>
                            {product.physical_number && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                #{product.physical_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600">{product.product_type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm",
                            getStatusBadgeColor(product.operational_status)
                          )}>
                            {product.operational_status === 'Mantenimiento' ? 'Mantto.' : product.operational_status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter border",
                            product.condition === 'Nuevo' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                          )}>
                            {product.condition}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-600">{product.location}</span>
                            {product.active_assignment?.rental?.customer_name ? (
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight mt-0.5">
                                {product.active_assignment.rental.customer_name}
                              </span>
                            ) : product.location_detail && (
                              <span className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">
                                {product.location_detail}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 items-center">
                            {product.available_for_sale && (
                              <span className="text-[9px] font-black text-slate-400 uppercase">Venta</span>
                            )}
                            {product.available_for_sale && product.available_for_rent && (
                              <span className="text-[9px] text-slate-300">·</span>
                            )}
                            {product.available_for_rent && (
                              <span className="text-[9px] font-black text-slate-400 uppercase">Renta</span>
                            )}
                            {!product.available_for_sale && !product.available_for_rent && (
                              <span className="text-[9px] font-bold text-slate-300 uppercase italic">Ninguno</span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <ProductRegistrationForm 
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onRegister={registerProduct}
          />
        )}
      </AnimatePresence>

      {/* Detail Panel */}
      <ProductDetailPanel
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProductId(null)}
        onUpdate={() => fetchProducts()}
        onOpenRental={(rentalId) => {
          console.log('Open rental:', rentalId);
        }}
      />
    </div>
  );
};
