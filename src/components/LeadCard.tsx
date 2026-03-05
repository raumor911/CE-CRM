import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, ExternalLink } from 'lucide-react';
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
  const { formatWhatsAppMessage } = useLeadAutomation();
  const hoursSinceActivity = differenceInHours(new Date(), parseISO(lead.last_activity));
  const isDelayed = hoursSinceActivity > 24;
  const costOfWait = hoursSinceActivity * 50;

  const getCostOfWaitStyles = (cost: number) => {
    if (cost < 10) return "text-slate-500 bg-slate-100";
    if (cost <= 50) return "bg-amber-100 text-amber-700 border border-amber-200";
    return "bg-red-600 text-white shadow-lg shadow-red-500/20";
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.01 }}
      onClick={() => onSelectLead(lead)}
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group",
        isDelayed && costOfWait > 50 ? "border-red-500 ring-1 ring-red-500/10" : "border-slate-200"
      )}
    >
      {/* Priority Indicator */}
      {lead.is_priority && (
        <div className="absolute -left-10 top-3 rotate-[-45deg] bg-amber-400 text-amber-950 text-[9px] font-black py-1 px-10 z-20 shadow-sm uppercase tracking-wider">
          PRIORIDAD
        </div>
      )}

      {/* 1. ELIMINADO: Bloque de Imagen Superior por decisión estratégica de RAUVIA Product Lead */}

      <div className="p-4 space-y-3"> {/* Layout compactado */}
        
        {/* Header Compacto: Nombre Proyecto + Presupuesto en una línea */}
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-zinc-900 truncate">
            {lead.project_name}
          </h4>
          <span className="text-sm font-black text-emerald-600 shrink-0">
            ${lead.budget?.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>

        {/* Info Secundaria Compacta: Lead Name + Sentimiento */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-zinc-500 font-medium truncate">{lead.lead_name}</span>
          <span className={cn(
            "px-2 py-0.5 rounded-full font-bold uppercase tracking-widest text-[9px] border",
            lead.sentiment_label === 'Entusiasta' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 
            lead.sentiment_label === 'Dudoso' ? 'bg-amber-100 text-amber-800 border-amber-200' : 
            'bg-rose-100 text-rose-800 border-rose-200'
          )}>
            {lead.sentiment_label}
          </span>
        </div>

        {/* Sección de acciones (conservamos WhatsApp y Detalle) */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleWhatsApp();
              }}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors group relative"
              title="Contactar por WhatsApp"
            >
              <MessageSquare size={16} className="group-hover:scale-110 transition-transform" />
              {lead.whatsapp_interaction_count && lead.whatsapp_interaction_count > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                  {lead.whatsapp_interaction_count}
                </span>
              )}
            </button>

            {/* Cost of Wait Badge (Small) */}
            {isDelayed && (
              <div className={cn(
                "ml-2 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono",
                getCostOfWaitStyles(costOfWait)
              )}>
                <span>{formatCurrency(costOfWait)}</span>
              </div>
            )}
          </div>
          
          {/* Botón de detalle */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onSelectLead(lead);
            }}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
