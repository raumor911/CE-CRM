import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, DollarSign, MessageSquare, ExternalLink, CheckCircle2, History, CreditCard, Send, User, Loader2, Sparkles } from 'lucide-react';
import { Lead } from '../types';
import { cn } from '../lib/utils';
import { differenceInHours, parseISO } from 'date-fns';
import { useLeadAutomation } from '../hooks/useLeadAutomation';

interface LeadCardProps {
  lead: Lead;
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onUpdateLead }) => {
  const { copyProposalLink, scheduleBriefing, formatWhatsAppMessage } = useLeadAutomation();
  const hoursSinceActivity = differenceInHours(new Date(), parseISO(lead.last_activity));
  const isDelayed = hoursSinceActivity > 48;
  const [showTimeline, setShowTimeline] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'entusiasta': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'dudoso': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'preocupado': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const handleShare = () => {
    const template = copyProposalLink(lead);
    navigator.clipboard.writeText(template);
    alert(`Link copiado al portapapeles:\n\n${template}`);
  };

  const handleWhatsApp = () => {
    const url = formatWhatsAppMessage(lead);
    const count = (lead.whatsapp_interaction_count || 0) + 1;
    onUpdateLead(lead.id, { whatsapp_interaction_count: count });
    window.open(url, '_blank');
  };

  const handleAction = async () => {
    if (lead.stage === 'Ingreso') {
      setIsScheduling(true);
      try {
        const result = await scheduleBriefing(lead);
        onUpdateLead(lead.id, { 
          stage: 'Briefing',
          calendar_event_id: result.calendar_event_id,
          ai_suggested_questions: result.ai_suggested_questions,
          stage_entry_timestamp: new Date().toISOString()
        });
        alert(`¡Briefing Agendado!\n\nSe han generado 3 preguntas clave de diseño mediante IA.\nLink de Calendly: ${result.calendly_link}`);
      } catch (error) {
        console.error("Error scheduling briefing:", error);
      } finally {
        setIsScheduling(false);
      }
      return;
    }

    let nextStage: Lead['stage'] | null = null;
    switch (lead.stage) {
      case 'Briefing': nextStage = 'Propuesta'; break;
      case 'Propuesta': nextStage = 'Negociación'; break;
      case 'Negociación': nextStage = 'Cierre'; break;
      case 'Cierre': alert('Proyecto finalizado y liberado'); break;
    }

    if (nextStage) {
      onUpdateLead(lead.id, { stage: nextStage, stage_entry_timestamp: new Date().toISOString() });
    }
  };

  const renderStageContent = () => {
    switch (lead.stage) {
      case 'Ingreso':
        return (
          <div className="space-y-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[10px] text-zinc-700 dark:text-zinc-300 font-medium">
                <User size={10} className="text-zinc-400" />
                <span className="truncate">{lead.lead_name}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <MessageSquare size={10} className="text-zinc-400" />
                <span>{lead.phone}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">NUEVO</span>
              <span className="text-[10px] text-zinc-400 font-medium">{lead.category}</span>
            </div>
          </div>
        );
      case 'Briefing':
        return (
          <div className="space-y-2">
            <div className="space-y-1.5 bg-zinc-50 dark:bg-zinc-800/30 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Necesidades Técnicas</p>
              <div className="grid grid-cols-1 gap-1">
                {[
                  { key: 'm2', label: 'Metraje (m2)' },
                  { key: 'style_defined', label: 'Estilo Definido' },
                  { key: 'deadlines', label: 'Plazos' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-[10px]">
                    <CheckCircle2 size={10} className={lead.checklist_briefing?.[item.key as keyof typeof lead.checklist_briefing] ? "text-emerald-500" : "text-zinc-300"} />
                    <span className={cn(lead.checklist_briefing?.[item.key as keyof typeof lead.checklist_briefing] ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400")}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {lead.ai_suggested_questions && (
              <div className="p-2 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 mb-1.5">
                  <Sparkles size={10} />
                  <span className="text-[9px] font-bold uppercase tracking-tight">IA Briefing Questions</span>
                </div>
                <ul className="space-y-1">
                  {lead.ai_suggested_questions.map((q, i) => (
                    <li key={i} className="text-[9px] text-zinc-600 dark:text-zinc-400 leading-tight list-disc ml-2">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'Negociación':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <History size={10} />
              <span>Historial: {lead.price_history?.length || 0} ajustes</span>
            </div>
            {lead.ai_notes && (
              <div className="relative group">
                <p className="text-[10px] italic text-zinc-500 line-clamp-2 bg-amber-50/50 dark:bg-amber-950/10 p-2 rounded-lg border border-amber-100/50 dark:border-amber-900/20">
                  <span className="font-bold text-amber-600 dark:text-amber-400 mr-1">AI:</span>
                  {lead.ai_notes}
                </p>
              </div>
            )}
          </div>
        );
      case 'Cierre':
        return (
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
              <CreditCard size={12} />
              <span className="text-[10px] font-bold uppercase">Link de Anticipo</span>
            </div>
            <p className="text-[9px] text-emerald-500/70">Generación automática lista</p>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-[10px] text-zinc-400 italic">
            <Clock size={10} />
            <span>Última actividad hace {hoursSinceActivity}h</span>
          </div>
        );
    }
  };

  const getActionButtonLabel = () => {
    if (isScheduling) return 'Procesando Evento...';
    switch (lead.stage) {
      case 'Ingreso': return 'Agendar Briefing';
      case 'Briefing': return 'Subir Requerimientos';
      case 'Propuesta': return 'Enviar Propuesta';
      case 'Negociación': return 'Registrar Feedback';
      case 'Cierre': return 'Liberar Proyecto';
      default: return 'Ver Detalles';
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl border p-3 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative overflow-hidden group",
        isDelayed ? "border-rose-500 ring-1 ring-rose-500/20 animate-pulse-subtle" : "border-zinc-200 dark:border-zinc-800"
      )}
    >
      {/* Priority Indicator */}
      {lead.is_priority && (
        <div className="absolute -left-8 top-2 rotate-[-45deg] bg-amber-400 text-amber-950 text-[8px] font-black py-1 px-8 z-20 shadow-sm uppercase tracking-tighter">
          PRIORIDAD
        </div>
      )}

      <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
        <img 
          src={lead.main_image_url} 
          alt={lead.project_name} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {isDelayed && (
          <div className="absolute top-2 right-2 bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse z-10">
            <Clock size={10} />
            COSTO DE ESPERA
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate max-w-[140px]">
              {lead.project_name}
            </h3>
            <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 mt-0.5">
              <DollarSign size={10} />
              <span className="text-[11px] font-semibold">{lead.budget.toLocaleString()}</span>
            </div>
          </div>
          <span className={cn(
            "text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-tighter",
            getSentimentColor(lead.sentiment_label)
          )}>
            {lead.sentiment_label}
          </span>
        </div>

        {/* Dynamic Content based on Stage */}
        <div className="min-h-[40px]">
          {renderStageContent()}
        </div>

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
          <button 
            disabled={isScheduling}
            onClick={handleAction}
            className="w-full py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-bold hover:bg-white hover:text-black dark:hover:bg-white dark:hover:text-black transition-all flex items-center justify-center gap-2 border border-transparent hover:border-zinc-200 disabled:opacity-50"
          >
            {isScheduling ? <Loader2 size={12} className="animate-spin" /> : (lead.stage === 'Propuesta' && <Send size={12} />)}
            {getActionButtonLabel()}
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setShowTimeline(!showTimeline)}
              className="flex-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center"
              title="Ver Timeline"
            >
              <MessageSquare size={14} />
            </button>
            <button 
              onClick={handleWhatsApp}
              className="flex-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 transition-colors flex items-center justify-center relative group/wa"
              title="Contactar por WhatsApp"
            >
              <div className="relative">
                <MessageSquare size={14} />
                {lead.whatsapp_interaction_count && lead.whatsapp_interaction_count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white dark:border-zinc-900">
                    {lead.whatsapp_interaction_count}
                  </span>
                )}
              </div>
            </button>
            <button 
              onClick={handleShare}
              className="flex-1 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center justify-center"
              title="Copiar Link de Propuesta"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Pulsing Border Effect for Delayed Leads */}
      {isDelayed && (
        <div className="absolute inset-0 pointer-events-none border-2 border-rose-500/30 rounded-2xl animate-ping-slow" />
      )}
    </motion.div>
  );
};
