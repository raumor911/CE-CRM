import React, { useState } from 'react';
import { X, Send, Phone, MessageSquare, Calendar, Palette, FileText, StickyNote, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LeadActivity } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ActivityModalProps {
  leadId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTIVITY_TYPES = [
  { id: 'Llamada', label: 'Llamada', icon: Phone, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'WhatsApp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'Cita', label: 'Cita', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'Diseño', label: 'Diseño', icon: Palette, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { id: 'Presupuesto', label: 'Presupuesto', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'Nota', label: 'Nota', icon: StickyNote, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
] as const;

export const ActivityModal: React.FC<ActivityModalProps> = ({ leadId, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [type, setType] = useState<LeadActivity['type']>('Nota');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('lead_activities')
        .insert([{
          lead_id: leadId,
          user_id: user.id,
          type,
          description: description.trim()
        }]);

      if (error) throw error;
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error logging activity:', error);
      alert('Error al registrar la actividad. Asegúrate de haber ejecutado el SQL necesario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        className="relative w-full max-w-md bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <h3 className="text-lg font-black text-zinc-900 tracking-tight uppercase">Nueva Actividad</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tipo de Actividad</label>
            <div className="grid grid-cols-3 gap-2">
              {ACTIVITY_TYPES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setType(item.id as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${
                    type === item.id 
                      ? 'bg-zinc-50 border-indigo-500 text-zinc-900 shadow-sm' 
                      : 'bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200'
                  }`}
                >
                  <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                    <item.icon size={18} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Descripción / Notas</label>
            <textarea
              required
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿Qué sucedió en esta interacción?"
              className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[120px] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Send size={18} />
                <span>Registrar Actividad</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};
