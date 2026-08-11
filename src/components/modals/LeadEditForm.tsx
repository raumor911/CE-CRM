import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead } from '../../types';

interface LeadEditFormProps {
  onClose: () => void;
  lead: Lead;
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<any>;
}

export const LeadEditForm: React.FC<LeadEditFormProps> = ({ onClose, lead, onUpdate }) => {
  const [formData, setFormData] = useState({
    project_name: lead.project_name || '',
    lead_name: lead.lead_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    budget: lead.budget?.toString() || '0',
    category: lead.category
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      project_name: lead.project_name || '',
      lead_name: lead.lead_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      budget: lead.budget?.toString() || '0',
      category: lead.category
    });
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const updates: Partial<Lead> = {
      project_name: formData.project_name,
      lead_name: formData.lead_name,
      email: formData.email,
      phone: formData.phone,
      budget: Number(formData.budget),
      category: formData.category,
      last_activity: new Date().toISOString()
    };

    try {
      await onUpdate(lead.id, updates);
      onClose();
    } catch (error) {
      console.error("Error updating lead:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-20">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Editar Proyecto</h2>
                <p className="text-xs text-zinc-500 font-medium">{formData.project_name}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Audit Section */}
              <div className="flex items-center gap-4 p-3 bg-zinc-50 rounded-2xl border border-zinc-100">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <Calendar size={12} />
                  Creado: {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                </div>
                <div className="w-1 h-1 rounded-full bg-zinc-300" />
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <Clock size={12} />
                  Actividad: {new Date(lead.last_activity).toLocaleDateString()}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.project_name}
                  onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Nombre del Lead
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.lead_name}
                    onChange={e => setFormData({ ...formData, lead_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Presupuesto (MXN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.budget}
                      onChange={e => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Categoría</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                >
                  <option value="Compra Contenedor">Compra Contenedor</option>
                  <option value="Proyecto">Proyecto</option>
                  <option value="10 ft Modificado">10 ft Modificado</option>
                  <option value="Renta Contenedor">Renta Contenedor</option>
                  <option value="Renta Oficina 20 ft">Renta Oficina 20 ft</option>
                </select>
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  };
