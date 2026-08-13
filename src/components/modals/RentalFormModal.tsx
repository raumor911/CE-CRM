import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Rental, RentalItem } from '../../types';

interface RentalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rentalData: Partial<Rental>, itemsData: Partial<RentalItem>[]) => Promise<void>;
}

export const RentalFormModal: React.FC<RentalFormModalProps> = ({ isOpen, onClose, onSubmit }) => {
  // Rental basic info
  const [formData, setFormData] = useState({
    client_name: '',
    phone: '',
    project_location: '',
    start_date: new Date().toISOString().split('T')[0],
    contractual_end_date: '',
  });

  // Dynamic items
  const [items, setItems] = useState<Partial<RentalItem>[]>([
    {
      equipment_description: '',
      quantity: 1,
      subtotal_monthly: 0,
      tax_monthly: 0,
      monthly_total: 0,
    }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    // Validation
    if (!formData.client_name || !formData.start_date) {
      setError('Por favor, completa los campos obligatorios del cliente.');
      return;
    }

    const invalidItems = items.some(item => !item.equipment_description || (item.quantity ?? 0) <= 0);
    if (invalidItems) {
      setError('Asegúrate de que todos los equipos tengan descripción y cantidad válida.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData, items);
      
      // Reset form
      setFormData({
        client_name: '',
        phone: '',
        project_location: '',
        start_date: new Date().toISOString().split('T')[0],
        contractual_end_date: '',
      });
      setItems([{ equipment_description: '', quantity: 1, subtotal_monthly: 0, tax_monthly: 0, monthly_total: 0 }]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la renta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
              <h2 className="text-xl font-bold text-zinc-900">Nueva Renta</h2>
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
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                      Cliente <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      placeholder="Ej: Constructora ABC"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.client_name}
                      onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      placeholder="+52 55..."
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Ubicación del Proyecto
                  </label>
                  <input
                    type="text"
                    placeholder="Dirección o referencia"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.project_location}
                    onChange={e => setFormData({ ...formData, project_location: e.target.value })}
                  />
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
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Vencimiento Contractual
                    </label>
                    <input
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
                'Crear Renta'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
