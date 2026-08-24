import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Rental, RentalItem } from '../../types';
import { buildExistingCustomers, normalizeCustomerName, cleanCustomerName } from '../../utils/customerIdentity';
import { CustomerSelector } from '../rentals/CustomerSelector';

export interface RentalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rentalData: Partial<Rental>, itemsData: Partial<RentalItem>[]) => Promise<void>;
  existingRentals: Rental[];
  initialData?: Rental | null;
  initialItems?: RentalItem[];
  initialFocus?: string;
}

export const RentalFormModal: React.FC<RentalFormModalProps> = ({ isOpen, onClose, onSubmit, existingRentals, initialData, initialItems, initialFocus }) => {
  // Rental basic info
  const [formData, setFormData] = useState({
    customer_name: initialData?.customer_name || '',
    customer_phone: initialData?.customer_phone || '',
    project_name: initialData?.project_name || '',
    location: initialData?.location || '',
    start_date: initialData?.start_date ? initialData.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
    contractual_end_date: initialData?.contractual_end_date ? initialData.contractual_end_date.split('T')[0] : '',
  });

  // Dynamic items
  const [items, setItems] = useState<Partial<RentalItem>[]>(
    initialItems && initialItems.length > 0 
      ? initialItems 
      : [{
          equipment_description: '',
          quantity: 1,
          subtotal_monthly: 0,
          tax_monthly: 0,
          monthly_total: 0,
        }]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  
  const existingCustomers = useMemo(
    () => buildExistingCustomers(existingRentals),
    [existingRentals]
  );

  useEffect(() => {
    if (isOpen) {
      setFormData({
        customer_name: initialData?.customer_name || '',
        customer_phone: initialData?.customer_phone || '',
        project_name: initialData?.project_name || '',
        location: initialData?.location || '',
        start_date: initialData?.start_date ? initialData.start_date.split('T')[0] : new Date().toISOString().split('T')[0],
        contractual_end_date: initialData?.contractual_end_date ? initialData.contractual_end_date.split('T')[0] : '',
      });
      setItems(
        initialItems && initialItems.length > 0 
          ? initialItems 
          : [{
              equipment_description: '',
              quantity: 1,
              subtotal_monthly: 0,
              tax_monthly: 0,
              monthly_total: 0,
            }]
      );
      setError(null);
      
      if (initialFocus) {
        setTimeout(() => {
          const el = document.getElementById(`field-${initialFocus}`);
          if (el) el.focus();
        }, 100);
      }
    }
  }, [isOpen, initialData, initialItems, initialFocus]);

  const handleItemChange = (index: number, field: keyof RentalItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate total and tax if subtotal or quantity changes
    if (field === 'subtotal_monthly' || field === 'quantity') {
      const subtotal = field === 'subtotal_monthly' ? Number(value) : Number(newItems[index].subtotal_monthly || 0);
      const qty = field === 'quantity' ? Number(value) : Number(newItems[index].quantity || 1);
      
      const totalSub = subtotal * qty;
      const tax = totalSub * 0.16; // Asumiendo IVA 16% (estándar MX)
      
      newItems[index].tax_monthly = Number(tax.toFixed(2));
      newItems[index].monthly_total = Number((totalSub + tax).toFixed(2));
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        equipment_description: '',
        quantity: 1,
        subtotal_monthly: 0,
        tax_monthly: 0,
        monthly_total: 0,
      }
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.customer_name?.trim()) {
      setError('Por favor, ingresa el nombre del cliente.');
      return;
    }

    if (!formData.start_date) {
      setError('Por favor, selecciona la fecha de inicio.');
      return;
    }

    if (!formData.contractual_end_date) {
      setError('Por favor, selecciona el vencimiento contractual.');
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.contractual_end_date);
    if (endDate < startDate) {
      setError('El vencimiento contractual no puede ser anterior a la fecha de inicio.');
      return;
    }

    if (items.length === 0) {
      setError('Debes agregar al menos un equipo a la renta.');
      return;
    }

    const invalidItem = items.find(item => {
      if (!item.equipment_description?.trim()) return true;
      if ((item.quantity ?? 0) <= 0) return true;
      if (!isFinite(Number(item.subtotal_monthly)) || Number(item.subtotal_monthly) <= 0) return true;
      return false;
    });

    if (invalidItem) {
      const idx = items.indexOf(invalidItem) + 1;
      if (!invalidItem.equipment_description?.trim()) {
        setError(`Equipo ${idx}: ingresa una descripción.`);
      } else if ((invalidItem.quantity ?? 0) <= 0) {
        setError(`Equipo ${idx}: la cantidad debe ser mayor a cero.`);
      } else {
        setError(`Equipo ${idx}: el subtotal mensual debe ser mayor a cero.`);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const normalizedName = normalizeCustomerName(formData.customer_name);
      const exactCustomer = existingCustomers.find(
        customer => customer.normalizedName === normalizedName
      );

      const customerNameToSave =
        exactCustomer?.customerName || cleanCustomerName(formData.customer_name);

      await onSubmit({
        ...formData,
        customer_name: customerNameToSave
      }, items);
      
      setFormData({
        customer_name: '',
        customer_phone: '',
        project_name: '',
        location: '',
        start_date: new Date().toISOString().split('T')[0],
        contractual_end_date: '',
      });
      setItems([{ equipment_description: '', quantity: 1, subtotal_monthly: 0, tax_monthly: 0, monthly_total: 0 }]);
      setSelectedCustomerKey(null);
      onClose();
    } catch (err: any) {
      setError(err.message || 'No fue posible crear la renta. Verifica los datos e intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-20 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">
                  {initialData ? 'Editar Renta' : 'Nueva Renta'}
                </h2>
                <p className="text-xs text-zinc-500 font-medium">Registra los datos del contrato y equipos.</p>
              </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500">
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div className="overflow-y-auto flex-1 p-6">
            <form id="rental-form" onSubmit={handleSubmit} className="space-y-8">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3 mb-4"
                  >
                    <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-rose-700 leading-tight font-medium">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* General Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">Información General</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {initialData ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                        Cliente <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="Ej: Constructora ABC"
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        value={formData.customer_name}
                        onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                      />
                    </div>
                  ) : (
                    <CustomerSelector
                      value={formData.customer_name}
                      customers={existingCustomers}
                      selectedCustomerKey={selectedCustomerKey}
                      onChange={value => {
                        setSelectedCustomerKey(null);
                        setFormData(previous => ({
                          ...previous,
                          customer_name: value,
                        }));
                      }}
                      onSelect={customer => {
                        setSelectedCustomerKey(customer.key);
                        setFormData(previous => ({
                          ...previous,
                          customer_name: customer.customerName,
                          customer_phone:
                            previous.customer_phone ||
                            customer.primaryPhone ||
                            '',
                        }));
                      }}
                    />
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      placeholder="+52 55..."
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.customer_phone}
                      onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Nombre del Proyecto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Obra Central"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.project_name}
                      onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      placeholder="Dirección o referencia"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                      Fecha de Inicio <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                      Vencimiento Contractual <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      id="field-contractual_end_date"
                      type="date"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.contractual_end_date}
                      onChange={e => setFormData({ ...formData, contractual_end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h3 className="text-sm font-bold text-zinc-900">Equipos Rentados</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                  >
                    <Plus size={14} /> Agregar Equipo
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-4">
                      <div className="flex gap-4 items-start">
                        <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Descripción <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="Ej: Contenedor 20ft Oficina"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={item.equipment_description}
                            onChange={e => handleItemChange(index, 'equipment_description', e.target.value)}
                          />
                        </div>
                        <div className="w-24 space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Cant. <span className="text-rose-500">*</span>
                          </label>
                          <input
                            required
                            type="number"
                            min="1"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={item.quantity}
                            onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))}
                          />
                        </div>
                        <div className="w-32 space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Subtotal Unitario
                          </label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-full pl-6 pr-2 py-2 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                              value={item.subtotal_monthly}
                              onChange={e => handleItemChange(index, 'subtotal_monthly', Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="mt-7 p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          disabled={items.length === 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex justify-end gap-6 text-xs text-zinc-500">
                        <div>
                          IVA: <span className="font-medium text-zinc-700">${item.tax_monthly?.toFixed(2)}</span>
                        </div>
                        <div>
                          Total Mensual: <span className="font-bold text-zinc-900">${item.monthly_total?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-100 bg-zinc-50 shrink-0">
            <button
              form="rental-form"
              disabled={isSubmitting}
              type="submit"
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-lg shadow-zinc-900/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                initialData ? 'Guardar Cambios' : 'Crear Renta'
              )}
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
