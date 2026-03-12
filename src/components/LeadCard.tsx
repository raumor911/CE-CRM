import React from 'react';
import { motion } from 'motion/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, ExternalLink, TrendingUp, DollarSign } from 'lucide-react';
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
  isOverlay?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, onUpdateLead, onSelectLead, isOverlay }) => {
  const { user } = useAuth();
  const { formatWhatsAppMessage } = useLeadAutomation();
  const hoursSinceActivity = differenceInHours(new Date(), parseISO(lead.last_activity));
  const isDelayed = hoursSinceActivity > 24;
  const costOfWait = hoursSinceActivity * 50;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id, disabled: isOverlay });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isOverlay ? 0.9 : (isDragging ? 0.3 : 1),
    zIndex: isOverlay ? 1000 : (isDragging ? 100 : 1),
  };

  const getCostOfWaitStyles = (cost: number) => {
    if (cost < 10) return "text-slate-500 bg-slate-100";
    if (cost <= 50) return "bg-amber-100 text-amber-700 border border-amber-200";
    return "bg-red-600 text-white shadow-lg shadow-red-500/20";
  };

  const handleMainAction = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (lead.stage === 'Propuesta') {
      const budget = prompt("Define el presupuesto final para este proyecto:", lead.budget?.toString() || "0");
      if (budget !== null) {
        const numBudget = parseFloat(budget.replace(/[^0-9.]/g, ''));
        if (!isNaN(numBudget)) {
          onUpdateLead(lead.id, { budget: numBudget, stage: 'Negociación' });
        }
      }
    } 
    else if (lead.stage === 'Cierre' && !lead.payment_confirmed) {
      const amountStr = window.prompt(
        "Introduce el monto del adelanto de depósito (MXN):",
        lead.budget?.toString() || "0"
      );
      
      if (amountStr === null) return;
      const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));

      if (isNaN(amount) || amount <= 0) {
        alert("Por favor, introduce un monto válido mayor a 0.");
        return;
      }

      // REGLA DE NEGOCIO: Sincronización de columnas financieras
      const updates: Partial<Lead> = {
        payment_confirmed: true,
        monto_anticipo_real: amount,
        signed_at: new Date().toISOString(),
        last_activity: new Date().toISOString()
      };

      try {
        onUpdateLead(lead.id, updates);
        console.log("Hito financiero registrado y sellado con timestamp en signed_at");
      } catch (error) {
        console.error("Error en la transacción financiera:", error);
      }
    }
  };

  const handleWhatsApp = async () => {
    const url = formatWhatsAppMessage(lead);
    const count = (lead.whatsapp_interaction_count || 0) + 1;
    
    onUpdateLead(lead.id, { 
      whatsapp_interaction_count: count,
      last_activity: new Date().toISOString()
    });

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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        rotate: isOverlay ? 3 : 0,
        scale: isOverlay ? 1.05 : 1
      }}
      whileHover={{ y: isOverlay ? 0 : -2, scale: isOverlay ? 1.05 : 1.01 }}
      onClick={() => !isOverlay && onSelectLead(lead)}
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm transition-all relative overflow-hidden group",
        isOverlay ? "shadow-2xl ring-2 ring-indigo-500/30 cursor-grabbing" : "cursor-grab hover:shadow-md",
        isDragging && !isOverlay && "brightness-95",
        isDelayed && costOfWait > 50 ? "border-red-500 ring-1 ring-red-500/10" : "border-slate-200"
      )}
    >
      {/* Badge de Etapa Destino (Solo en Overlay) */}
      {isOverlay && (
        <div className="absolute top-2 right-2 z-30 bg-indigo-600 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg animate-pulse uppercase tracking-tighter">
          Moviendo...
        </div>
      )}
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

        {/* Main Action Button (Propuesta / Cierre) - DESACTIVADO TEMPORALMENTE
        {((lead.stage === 'Propuesta') || (lead.stage === 'Cierre' && !lead.payment_confirmed)) && (
          <button
            onClick={handleMainAction}
            className={cn(
              "w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              lead.stage === 'Propuesta' 
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20"
                : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
            )}
          >
            {lead.stage === 'Propuesta' ? (
              <>
                <TrendingUp size={12} />
                <span>Definir Presupuesto</span>
              </>
            ) : (
              <>
                <DollarSign size={12} />
                <span>Confirmar Adelanto</span>
              </>
            )}
          </button>
        )}
        */}

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
