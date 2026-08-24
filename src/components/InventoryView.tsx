import React, { useState, useEffect } from 'react';
import { Plus, Package, Search, Filter, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductRegistrationForm } from './modals/ProductRegistrationForm';
import { useInventory } from '../hooks/useInventory';
import { 
  ProductType, 
  ProductCondition, 
  ProductLocation, 
  ProductOperationalStatus 
} from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
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

export const InventoryView: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { products, loading, fetchProducts, registerProduct } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);

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
      case 'En modificación': return 'bg-purple-50 text-purple-700 border-purple-100';
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
            <Plus className="w-4 h-4" /> Registrar producto
          </button>
        </div>

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
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            
            <div className="relative">
              <button 
                type="button"
                onClick={() => setFiltersOpen(open => !open)}
                aria-expanded={filtersOpen}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 border rounded-lg',
                  'text-sm transition-all',
                  activeFilterCount > 0 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {filtersOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">Filtrar inventario</h3>
                      {activeFilterCount > 0 && (
                        <button 
                          type="button" 
                          onClick={clearFilters}
                          className="text-xs font-medium text-indigo-600"
                        >
                          Limpiar
                        </button>
                      )}
                    </div>

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
                        ['Usado', 'Usado']
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
                        ['Instalaciones del cliente', 'Instalaciones del cliente'],
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
                        ['En modificación', 'En modificación']
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

                    <button 
                      type="button"
                      onClick={() => setFiltersOpen(false)}
                      className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition-all"
                    >
                      Ver {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {filteredProducts.length} Activos en total
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading && products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm text-zinc-500 font-medium tracking-widest uppercase">Cargando activos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-20">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {hasActiveCriteria ? 'No se encontraron resultados' : 'No hay productos registrados'}
              </h3>
              <p className="text-sm text-slate-500 max-w-xs mt-2">
                {hasActiveCriteria 
                  ? 'No se encontraron productos con los criterios seleccionados.'
                  : 'Comienza registrando tu primer contenedor u oficina móvil para gestionar el inventario.'}
              </p>
              {hasActiveCriteria ? (
                <button 
                  type="button"
                  onClick={clearFilters}
                  className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-all"
                >
                  Limpiar búsqueda y filtros
                </button>
              ) : (
                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-all"
                >
                  Registrar producto
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identificador</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Condición</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ubicación</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Alternativas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProducts.map((product) => (
                    <motion.tr 
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50/50 transition-colors group"
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
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm",
                          getStatusBadgeColor(product.operational_status)
                        )}>
                          {product.operational_status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {product.available_for_sale && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase">Venta</span>
                          )}
                          {product.available_for_rent && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase">Renta</span>
                          )}
                          {product.available_for_modification && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-black uppercase">Mod.</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    </div>
  );
};
