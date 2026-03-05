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
  ExternalLink,
  Loader2,
  Trash2,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, LeadDocument, LeadActivity } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { ActivityModal } from './modals/ActivityModal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Lead>) => Promise<any>;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'documents'>('timeline');
  const [newNote, setNewNote] = useState('');
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const fetchActivities = async () => {
    if (!lead.id) return;
    setIsLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const fetchDocuments = async () => {
    if (!lead.id) return;
    setIsLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from('lead_documents')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
    } else if (activeTab === 'timeline') {
      fetchActivities();
    }
  }, [activeTab, lead.id]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !lead.id || !user) return;

    setIsUploading(true);
    try {
      // 1. Subir al Bucket de Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${lead.id}/${Date.now()}_${fileName}`;
      
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // 2. Registrar metadatos en la tabla SQL
      const { error: dbError } = await supabase
        .from('lead_documents')
        .insert([{
          lead_id: lead.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          user_id: user.id
        }]);

      if (dbError) throw dbError;
      
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir el archivo. Asegúrate de que el bucket "client-documents" exista en Supabase.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: LeadDocument) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      // 1. Eliminar de Storage
      const { error: storageError } = await supabase.storage
        .from('client-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // 2. Eliminar de la DB
      const { error: dbError } = await supabase
        .from('lead_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleDownload = async (doc: LeadDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(doc.file_path, 60);
      
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

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
        className="relative w-full max-w-5xl h-full max-h-[850px] bg-white border border-zinc-200 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white font-black text-xl">
              {lead.lead_name[0]}
            </div>
            <div>
              <h2 className="text-xl font-black text-zinc-900 tracking-tight">{lead.lead_name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{lead.project_name}</span>
                <span className="w-1 h-1 bg-zinc-300 rounded-full" />
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
            className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-500 hover:text-zinc-900 transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Panel: Info & Stats */}
          <div className="w-full md:w-80 border-r border-zinc-100 p-6 space-y-8 overflow-y-auto bg-zinc-50/50">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Métricas Clave</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-white border border-zinc-100 rounded-2xl space-y-1 shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <DollarSign size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Presupuesto</span>
                  </div>
                  <p className="text-xl font-black text-zinc-900">{formatCurrency(lead.budget || 0)}</p>
                </div>
                <div className="p-4 bg-white border border-zinc-100 rounded-2xl space-y-1 shadow-sm">
                  <div className="flex items-center gap-2 text-rose-600">
                    <Clock size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Cost of Wait</span>
                  </div>
                  <p className="text-xl font-black text-zinc-900">+$42.50</p>
                  <p className="text-[10px] text-zinc-500">Acumulado en etapa actual</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Información de Contacto</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-zinc-600">
                  <Mail size={16} />
                  <span className="text-sm truncate">{lead.email}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-600">
                  <Phone size={16} />
                  <span className="text-sm">{lead.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-600">
                  <Calendar size={16} />
                  <span className="text-sm">Creado: {new Date(lead.created_at || '').toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-600">
                  <TrendingUp size={16} />
                  <span className="text-sm">Sentimiento: {lead.sentiment_label}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100">
              <button 
                onClick={() => setIsActivityModalOpen(true)}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-zinc-900/10 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                <span>Nueva Actividad</span>
              </button>
            </div>
          </div>

          {/* Right Panel: Tabs & Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="flex items-center gap-8 px-8 border-b border-zinc-100">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 py-4 text-sm font-bold transition-all border-b-2",
                    activeTab === tab.id 
                      ? "text-zinc-900 border-zinc-900" 
                      : "text-zinc-400 border-transparent hover:text-zinc-600"
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
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Historial de Actividad</h4>
                      <button 
                        onClick={() => setIsActivityModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-zinc-900/10"
                      >
                        <Plus size={14} />
                        <span>Nueva Actividad</span>
                      </button>
                    </div>

                    {isLoadingActivities ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
                        <p className="text-sm text-zinc-500">Cargando historial...</p>
                      </div>
                    ) : activities.length > 0 ? (
                      activities.map((activity) => (
                        <div key={activity.id} className="relative pl-8 border-l border-zinc-100 pb-8 last:pb-0">
                          <div className={cn(
                            "absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full shadow-sm",
                            activity.type === 'Llamada' ? "bg-blue-500 shadow-blue-500/20" :
                            activity.type === 'WhatsApp' ? "bg-emerald-500 shadow-emerald-500/20" :
                            activity.type === 'Cita' ? "bg-purple-500 shadow-purple-500/20" :
                            activity.type === 'Diseño' ? "bg-pink-500 shadow-pink-500/20" :
                            activity.type === 'Presupuesto' ? "bg-amber-500 shadow-amber-500/20" :
                            "bg-zinc-500 shadow-zinc-500/20"
                          )} />
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-zinc-900">{activity.type}</span>
                              <span className="text-[10px] text-zinc-400">
                                {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: es })}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-600 leading-relaxed">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl">
                        <History className="mx-auto text-zinc-300 mb-3" size={32} />
                        <p className="text-sm text-zinc-500">No hay actividades registradas aún.</p>
                      </div>
                    )}
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
                    <div className="bg-zinc-50 border border-zinc-100 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2 text-zinc-900">
                        <AlertCircle size={18} className="text-indigo-600" />
                        <h4 className="text-sm font-bold uppercase tracking-wider">Sugerencias de la IA</h4>
                      </div>
                      <p className="text-sm text-zinc-600 leading-relaxed italic">
                        "El cliente muestra un sentimiento entusiasta pero tiene dudas sobre los plazos de entrega. Se recomienda enviar el catálogo de proyectos terminados para generar confianza."
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Notas del Comercial</h4>
                      <div className="bg-zinc-50 border border-zinc-100 p-4 rounded-2xl text-sm text-zinc-600 whitespace-pre-wrap min-h-[150px]">
                        {lead.ai_notes || 'No hay notas registradas para este lead.'}
                      </div>
                    </div>

                    <div className="relative">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Escribe una nota interna..."
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-4 pr-12 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-[100px] resize-none"
                      />
                      <button 
                        onClick={handleAddNote}
                        className="absolute right-4 bottom-4 p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all"
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
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isLoadingDocs ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 gap-4">
                          <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
                          <p className="text-sm text-zinc-500">Cargando documentos...</p>
                        </div>
                      ) : documents.length > 0 ? (
                        documents.map((doc) => (
                          <div key={doc.id} className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group hover:border-zinc-200 transition-all shadow-sm">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 bg-zinc-50 rounded-xl flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 transition-colors shrink-0">
                                <FileText size={20} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-zinc-900 truncate">{doc.file_name}</p>
                                <p className="text-[10px] text-zinc-500">
                                  {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(doc.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleDownload(doc)}
                                className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
                                title="Descargar"
                              >
                                <Download size={16} />
                              </button>
                              <button 
                                onClick={() => handleDeleteDocument(doc)}
                                className="p-2 text-zinc-400 hover:text-rose-600 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full py-12 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl">
                          <FileText className="mx-auto text-zinc-200 mb-3" size={32} />
                          <p className="text-sm text-zinc-500">No hay documentos cargados aún.</p>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor="file-upload"
                        className={cn(
                          "w-full p-8 border-2 border-dashed border-zinc-100 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all cursor-pointer",
                          isUploading ? "opacity-50 cursor-not-allowed" : "hover:text-zinc-900 hover:border-zinc-200 hover:bg-zinc-50"
                        )}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
                            <span className="text-sm font-bold text-zinc-500">Subiendo archivo...</span>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center text-zinc-400">
                              <Plus size={24} />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold text-zinc-600">Haz clic para subir o arrastra un archivo</p>
                              <p className="text-xs text-zinc-400 mt-1">PDF, Imágenes, Planos (Max 50MB)</p>
                            </div>
                          </>
                        )}
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isActivityModalOpen && (
          <ActivityModal
            leadId={lead.id}
            onClose={() => setIsActivityModalOpen(false)}
            onSuccess={() => {
              fetchActivities();
              onUpdate(lead.id, { last_activity: new Date().toISOString() });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
