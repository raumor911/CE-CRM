import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Clock, DollarSign, MessageSquare, ExternalLink, CheckCircle2, History, CreditCard, Send, User, Loader2, Sparkles, Phone, Mail } from 'lucide-react';
import { Lead } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { differenceInHours, parseISO } from 'date-fns';
import { useLeadAutomation } from '../hooks/useLeadAutomation';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface LeadCardProps {
  lead: Lead;
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
  onSelectLead: (lead: Lead) => void;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onUpdateLead, onSelectLead }) => {
  const { user } = useAuth();
  const { copyProposalLink, scheduleBriefing, formatWhatsAppMessage } = useLeadAutomation();
  const hoursSinceActivity = differenceInHours(new Date(), parseISO(lead.last_activity));
  const isDelayed = hoursSinceActivity > 24;
  const costOfWait = hoursSinceActivity * 50;
  const [showTimeline, setShowTimeline] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'entusiasta': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'dudoso': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'preocupado': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getCostOfWaitStyles = (cost: number) => {
    if (cost < 10) return "text-slate-500 bg-slate-100";
    if (cost <= 50) return "bg-amber-100 text-amber-700 border border-amber-200";
    return "bg-red-600 text-white shadow-lg shadow-red-500/20";
  };

  const handleShare = () => {
    const template = copyProposalLink(lead);
    navigator.clipboard.writeText(template);
    alert(`Link copiado al portapapeles:\n\n${template}`);
  };

  const handleWhatsApp = async () => {
    const url = formatWhatsAppMessage(lead);
    const count = (lead.whatsapp_interaction_count || 0) + 1;
    
    // 1. Update lead interaction count and last activity
    onUpdateLead(lead.id, { 
      whatsapp_interaction_count: count,
      last_activity: new Date().toISOString()
    });

    // 2. Register activity in Supabase
    if (user) {
      try {
        await supabase.from('lead_activities').insert([{
          lead_id: lead.id,
          type: 'WhatsApp',
          description: `Contacto iniciado vía WhatsApp (Interacción #${count})`,
          user_id: user.id
        }]);
      } catch (error) {
        console.error("Error registering WhatsApp activity:", error);
      }
    }

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
              <div className="flex items-center gap-2 text-[10px] text-slate-700 font-medium">
                <User size={10} className="text-slate-400" />
                <span className="truncate">{lead.lead_name}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <MessageSquare size={10} className="text-slate-400" />
                <span>{lead.phone}</span>
              </div>
            </div>
          </div>
        );
      case 'Briefing':
        return (
          <div className="space-y-2">
            <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div className="grid grid-cols-1 gap-1">
                {[
                  { key: 'm2', label: 'Metraje (m2)' },
                  { key: 'style_defined', label: 'Estilo Definido' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-2 text-[10px]">
                    <CheckCircle2 size={10} className={lead.checklist_briefing?.[item.key as keyof typeof lead.checklist_briefing] ? "text-emerald-500" : "text-slate-300"} />
                    <span className={cn(lead.checklist_briefing?.[item.key as keyof typeof lead.checklist_briefing] ? "text-slate-700" : "text-slate-400")}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'Negociación':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <History size={10} />
              <span>Historial: {lead.price_history?.length || 0} ajustes</span>
            </div>
          </div>
        );
      case 'Cierre':
        return (
          <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <CreditCard size={12} />
              <span className="text-[10px] font-bold uppercase">Agenda Lista</span>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-[10px] text-slate-400 italic">
            <Clock size={10} />
            <span>Actividad hace {hoursSinceActivity}h</span>
          </div>
        );
    }
  };

  const getActionButtonLabel = () => {
    if (isScheduling) return 'Procesando...';
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
      whileHover={{ y: -4 }}
      onClick={() => onSelectLead(lead)}
      className={cn(
        "bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group",
        isDelayed && costOfWait > 50 ? "border-red-500 ring-1 ring-red-500/10" : "border-slate-200"
      )}
    >
      {/* Priority Indicator */}
      {lead.is_priority && (
        <div className="absolute -left-10 top-3 rotate-[-45deg] bg-amber-400 text-amber-950 text-[9px] font-black py-1 px-10 z-20 shadow-sm uppercase tracking-wider">
          PRIORIDAD
        </div>
      )}

      <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
        <img 
          src={lead.main_image_url} 
          alt={lead.project_name} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors" />
        
        {isDelayed && (
          <div className={cn(
            "absolute top-2 right-2 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10 transition-all font-mono",
            getCostOfWaitStyles(costOfWait)
          )}>
            {costOfWait > 50 && <span className="animate-pulse">⌛</span>}
            <span>{formatCurrency(costOfWait)}</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm truncate leading-tight">
              {lead.project_name}
            </h3>
            <div className="flex items-center gap-1.5 text-slate-500 mt-1">
              <DollarSign size={12} className="text-slate-400" />
              <span className="text-xs font-medium">
                {lead.budget ? formatCurrency(lead.budget) : 'Por definir'}
              </span>
            </div>
          </div>
          <span className={cn(
            "text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-tight shrink-0",
            getSentimentColor(lead.sentiment_label)
          )}>
            {lead.sentiment_label}
          </span>
        </div>

        <div className="min-h-[48px] py-1">
          {renderStageContent()}
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
          <button 
            disabled={isScheduling}
            onClick={(e) => {
              e.stopPropagation();
              handleAction();
            }}
            className="w-full py-2.5 rounded-lg bg-brand-primary hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isScheduling ? <Loader2 size={14} className="animate-spin" /> : (lead.stage === 'Propuesta' && <Send size={14} />)}
            {getActionButtonLabel()}
          </button>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {/* CONSERVAMOS SOLO WHATSAPP - RAUVIA Product Lead Strategy */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleWhatsApp();
                }}
                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative"
                title="Contactar por WhatsApp"
              >
                <MessageSquare size={18} className="group-hover:scale-110 transition-transform" />
                {lead.whatsapp_interaction_count && lead.whatsapp_interaction_count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                    {lead.whatsapp_interaction_count}
                  </span>
                )}
              </button>

              {/* OCULTAMOS LOS DEMÁS (Phone/Mail) para reducir carga cognitiva */}
            </div>

            {/* Botón de expansión/detalle */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSelectLead(lead);
              }}
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
              title="Ver detalles"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
