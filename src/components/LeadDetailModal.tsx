import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  DollarSign, 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  FileText, 
  History,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Mail,
  Phone,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead } from '../types';
import { cn } from '../lib/utils';

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<any>;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'documents'>('timeline');
  const [newNote, setNewNote] = useState('');

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: History },
    { id: 'notes', label: 'Notas IA', icon: MessageSquare },
    { id: 'documents', label: 'Documentos', icon: FileText },
  ] as const;

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const updatedNotes = lead.ai_notes ? `${lead.ai_notes}\n\n[${new Date().toLocaleDateString()}] ${newNote}` : `[${new Date().toLocaleDateString()}] ${newNote}`;
    await onUpdate(lead.id, { ai_notes: updatedNotes });
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl h-full max-h-[850px] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl">
              {lead.lead_name[0]}
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">{lead.lead_name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{lead.project_name}</span>
                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg",
                  lead.stage === 'Ingreso' ? "bg-blue-500/10 text-blue-500" :
                  lead.stage === 'Briefing' ? "bg-amber-500/10 text-amber-500" :
                  lead.stage === 'Propuesta' ? "bg-indigo-500/10 text-indigo-500" :
                  lead.stage === 'Negociación' ? "bg-purple-500/10 text-purple-500" :
                  "bg-emerald-500/10 text-emerald-500"
                )}>
                  {lead.stage}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Panel: Info & Stats */}
          <div className="w-full md:w-80 border-r border-zinc-800 p-6 space-y-8 overflow-y-auto bg-zinc-900/20">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Métricas Clave</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <DollarSign size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Presupuesto</span>
                  </div>
                  <p className="text-xl font-black text-white">${lead.budget?.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-500">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Cost of Wait</span>
                  </div>
                  <p className="text-xl font-black text-white">+$42.50</p>
                  <p className="text-[10px] text-zinc-500">Acumulado en etapa actual</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Información de Contacto</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-zinc-400">
                  <Mail size={16} />
                  <span className="text-sm truncate">{lead.email}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400">
                  <Phone size={16} />
                  <span className="text-sm">{lead.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400">
                  <Calendar size={16} />
                  <span className="text-sm">Creado: {new Date(lead.created_at || '').toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400">
                  <TrendingUp size={16} />
                  <span className="text-sm">Sentimiento: {lead.sentiment_label}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                <Plus size={18} />
                <span>Nueva Actividad</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Tabs & Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-8 px-8 border-b border-zinc-800">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 py-4 text-sm font-bold transition-all border-b-2",
                    activeTab === tab.id 
                      ? "text-indigo-500 border-indigo-500" 
                      : "text-zinc-500 border-transparent hover:text-zinc-300"
                  )}
                >
                  <tab.icon size={18} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="relative pl-8 border-l border-zinc-800 pb-8 last:pb-0">
                        <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-white">Cambio de Etapa</span>
                            <span className="text-[10px] text-zinc-500">Hace {i + 1} días</span>
                          </div>
                          <p className="text-sm text-zinc-400 leading-relaxed">
                            El lead fue movido de <span className="text-zinc-300 font-bold">Ingreso</span> a <span className="text-indigo-400 font-bold">Briefing</span>.
                          </p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {activeTab === 'notes' && (
                  <motion.div
                    key="notes"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-indigo-400">
                        <AlertCircle size={18} />
                        <h4 className="text-sm font-bold uppercase tracking-wider">Sugerencias de la IA</h4>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed italic">
                        "El cliente muestra un sentimiento entusiasta pero tiene dudas sobre los plazos de entrega. Se recomienda enviar el catálogo de proyectos terminados para generar confianza."
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Notas del Comercial</h4>
                      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-sm text-zinc-400 whitespace-pre-wrap min-h-[150px]">
                        {lead.ai_notes || 'No hay notas registradas para este lead.'}
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Escribe una nota interna..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 pr-12 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] resize-none"
                      />
                      <button 
                        onClick={handleAddNote}
                        className="absolute right-4 bottom-4 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'documents' && (
                  <motion.div
                    key="documents"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {[1, 2].map((_, i) => (
                      <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-between group hover:border-zinc-700 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-indigo-500 transition-colors">
                            <FileText size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Presupuesto_V1.pdf</p>
                            <p className="text-[10px] text-zinc-500">2.4 MB • Hace 2 días</p>
                          </div>
                        </div>
                        <button className="p-2 text-zinc-500 hover:text-white transition-colors">
                          <ExternalLink size={18} />
                        </button>
                      </div>
                    ))}
                    <button className="p-4 border-2 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-all">
                      <Plus size={20} />
                      <span className="text-sm font-bold">Subir Documento</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
