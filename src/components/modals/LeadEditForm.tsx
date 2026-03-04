import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Calendar, Clock, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, Sentiment } from '../../types';

interface LeadEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onUpdate: (updates: Partial<Lead>) => void;
}

export const LeadEditForm: React.FC<LeadEditFormProps> = ({ isOpen, onClose, lead, onUpdate }) => {
  const [formData, setFormData] = useState({
    project_name: lead.project_name,
    lead_name: lead.lead_name,
    email: lead.email || '',
    phone: lead.phone,
    budget: lead.budget.toString(),
    category: lead.category,
    sentiment_label: lead.sentiment_label,
    main_image_url: lead.main_image_url
  });
  const [newImage, setNewImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        project_name: lead.project_name,
        lead_name: lead.lead_name,
        email: lead.email || '',
        phone: lead.phone,
        budget: lead.budget.toString(),
        category: lead.category,
        sentiment_label: lead.sentiment_label,
        main_image_url: lead.main_image_url
      });
      setNewImage(null);
    }
  }, [isOpen, lead]);

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
      sentiment_label: formData.sentiment_label,
      last_activity: new Date().toISOString()
    };

    // Price history logic
    if (Number(formData.budget) !== lead.budget) {
      const historyEntry = {
        date: new Date().toISOString(),
        amount: Number(formData.budget)
      };
      updates.price_history = [...(lead.price_history || []), historyEntry];
    }

    // Image upload simulation
    if (newImage) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      updates.main_image_url = URL.createObjectURL(newImage);
    }

    onUpdate(updates);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-20">
              <div>
                <h2 className="text-xl font-bold">Editar Proyecto</h2>
                <p className="text-xs text-zinc-500 font-medium">{formData.project_name}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Audit Section */}
              <div className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <Calendar size={12} />
                  Creado: {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                </div>
                <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <Clock size={12} />
                  Actividad: {new Date(lead.last_activity).toLocaleDateString()}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                  Nombre del Proyecto <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.project_name}
                  onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Nombre del Lead <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.lead_name}
                    onChange={e => setFormData({ ...formData, lead_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Teléfono <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Presupuesto (USD) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      value={formData.budget}
                      onChange={e => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Categoría</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                >
                  <option value="Compra Contenedor">Compra Contenedor</option>
                  <option value="Proyecto">Proyecto</option>
                  <option value="10 ft Modificado">10 ft Modificado</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Sentimiento (Manual)</label>
                <div className="flex gap-2">
                  {(['Entusiasta', 'Dudoso', 'Preocupado'] as Sentiment[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData({ ...formData, sentiment_label: s })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                        formData.sentiment_label === s
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent'
                          : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Imagen del Proyecto</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 flex-shrink-0">
                    {newImage ? (
                      <img src={URL.createObjectURL(newImage)} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <img src={formData.main_image_url} alt="Current" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 relative group">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={e => setNewImage(e.target.files?.[0] || null)}
                    />
                    <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 group-hover:border-indigo-500 transition-colors">
                      <Upload size={18} className="text-zinc-400 group-hover:text-indigo-500" />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase">Reemplazar Imagen</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
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
      )}
    </AnimatePresence>
  );
};
