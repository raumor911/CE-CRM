import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ExistingRentalCustomer } from '../../types';
import { normalizeCustomerName } from '../../utils/customerIdentity';
import { Building2, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerSelectorProps {
  value: string;
  customers: ExistingRentalCustomer[];
  selectedCustomerKey: string | null;
  error?: string | null;

  onChange: (value: string) => void;
  onSelect: (customer: ExistingRentalCustomer) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  customers,
  selectedCustomerKey,
  error,
  onChange,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = normalizeCustomerName(value);

  const matches = useMemo(() => {
    if (normalizedQuery.length < 2) {
      return [];
    }

    return customers
      .filter(customer =>
        customer.normalizedName.includes(normalizedQuery)
      )
      .sort((a, b) => {
        const aExact = a.normalizedName === normalizedQuery;
        const bExact = b.normalizedName === normalizedQuery;

        if (aExact !== bExact) {
          return aExact ? -1 : 1;
        }

        const aStarts = a.normalizedName.startsWith(normalizedQuery);
        const bStarts = b.normalizedName.startsWith(normalizedQuery);

        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1;
        }

        return a.customerName.localeCompare(b.customerName, 'es-MX');
      })
      .slice(0, 5);
  }, [customers, normalizedQuery]);

  const hasExactMatch = matches.length > 0 && matches[0].normalizedName === normalizedQuery;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < matches.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < matches.length) {
          onSelect(matches[highlightedIndex]);
          setIsOpen(false);
        } else if (value.trim()) {
          setIsOpen(false);
        }
        break;
      case 'Escape':
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative space-y-2" ref={containerRef}>
      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
        Cliente <span className="text-rose-500">*</span>
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          required
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="rental-customer-options"
          aria-autocomplete="list"
          placeholder="Escribe el nombre del cliente..."
          className={`w-full px-4 py-3 rounded-xl border bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${
            error ? 'border-rose-500' : 'border-zinc-200'
          }`}
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            if (value.length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {selectedCustomerKey && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 bg-emerald-50 p-1 rounded-full">
            <Check size={16} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && value.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden"
            id="rental-customer-options"
            role="listbox"
          >
            {hasExactMatch && !selectedCustomerKey && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                <p className="text-xs text-amber-800 font-medium">Este cliente ya existe.</p>
                <p className="text-[10px] text-amber-700">Selecciona el registro para reutilizar sus datos.</p>
              </div>
            )}

            {matches.length > 0 ? (
              <div className="max-h-60 overflow-y-auto py-2">
                {matches.map((customer, index) => (
                  <button
                    key={customer.key}
                    type="button"
                    role="option"
                    aria-selected={highlightedIndex === index}
                    onClick={() => {
                      onSelect(customer);
                      setIsOpen(false);
                      inputRef.current?.focus();
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                      highlightedIndex === index ? 'bg-indigo-50' : 'hover:bg-zinc-50'
                    } ${selectedCustomerKey === customer.key ? 'bg-emerald-50/50' : ''}`}
                  >
                    <div className={`mt-0.5 ${selectedCustomerKey === customer.key ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      {selectedCustomerKey === customer.key ? <Check size={16} /> : <Building2 size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-900 truncate flex items-center gap-2">
                        {customer.customerName}
                        {selectedCustomerKey === customer.key && (
                          <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Seleccionado</span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5">
                        <span>{customer.rentalCount} {customer.rentalCount === 1 ? 'renta' : 'rentas'}</span>
                        <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                        <span className={customer.activeRentalCount > 0 ? 'text-emerald-600 font-medium' : ''}>
                          {customer.activeRentalCount} {customer.activeRentalCount === 1 ? 'activa' : 'activas'}
                        </span>
                        {customer.primaryPhone && (
                          <>
                            <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                            <span>Tel. {customer.primaryPhone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-zinc-600 mb-4">No se encontraron clientes similares.</p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Plus size={14} /> Continuar con "{value}"
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
