import React, { useState } from 'react';
import { X, Upload, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';

interface NewLeadFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export const NewLeadForm: React.FC<NewLeadFormProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    project_name: '',
    lead_name: '',
    email: '',
    phone: '',
    budget: '',
    category: 'Proyecto' as 'Compra Contenedor' | 'Proyecto' | '10 ft Modificado' | 'Renta Contenedor' | 'Renta Oficina 20 ft',
    main_image_url: null as File | null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEmailDuplicity = async (email: string) => {
    const { data, error } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking duplicity:', error);
      return false;
    }
    return !!data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.project_name || !formData.lead_name || !formData.phone) return;

    setIsSubmitting(true);

    try {
      if (formData.email) {
        const isDuplicate = await checkEmailDuplicity(formData.email);
        if (isDuplicate) {
          setError('Ya existe un lead registrado con este correo electrónico.');
          setIsSubmitting(false);
          return;
        }
      }

      // Simulación de guardado
      await new Promise(resolve => setTimeout(resolve, 800));
      
      onSubmit({
        ...formData,
        budget: formData.budget || 0,
        main_image_url: '' // Forzamos cadena vacía desde el origen
      });
      
      onClose();
      setFormData({ project_name: '', lead_name: '', email: '', phone: '', budget: '', category: 'Proyecto', main_image_url: null });
    } catch (err: any) {
      setError(err.message);
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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-20">
                <h2 className="text-xl font-bold text-zinc-900">Nuevo Lead</h2>
                <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3"
                    >
                      <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                      <p className="text-xs text-rose-700 leading-tight font-medium">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                    Nombre del Proyecto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: Residencia Lomas"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                      placeholder="Juan Pérez"
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
                      placeholder="juan@ejemplo.com"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                      placeholder="+52 55..."
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
                        placeholder="0.00"
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

                {/* Oculto temporalmente para simplificar el MVP */}
                {/* 
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Asset Inicial (Opcional)</label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={e => setFormData({ ...formData, main_image_url: e.target.files?.[0] || null })}
                    />
                    <div className="border-2 border-dashed border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 group-hover:border-indigo-500 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 transition-colors">
                        <Upload size={24} />
                      </div>
                      <p className="text-sm text-zinc-500">
                        {formData.main_image_url ? formData.main_image_url.name : 'Subir render o foto'}
                      </p>
                    </div>
                  </div>
                </div>
                */}

                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Crear Lead'
                  )}
                </button>
              </form>
            </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
