import React from 'react';
import { Lead } from '../types';
import { LeadCard } from './LeadCard';
import { STAGES } from '../constants';
import { cn } from '../lib/utils';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
  onSelectLead: (lead: Lead) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onUpdateLead, onSelectLead }) => {
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'Ingreso': return 'bg-blue-500';
      case 'Briefing': return 'bg-amber-500';
      case 'Propuesta': return 'bg-brand-primary';
      case 'Negociación': return 'bg-purple-500';
      case 'Cierre': return 'bg-emerald-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide px-6 py-4">
      {STAGES.map((stage) => (
        <div key={stage} className="flex-shrink-0 w-80">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full", getStageColor(stage))}></span>
              {stage}
              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                {leads.filter(l => l.stage === stage).length}
              </span>
            </h3>
          </div>
          
          <div className="space-y-3 min-h-[calc(100vh-200px)] rounded-xl bg-slate-100/50 p-3 border border-slate-200/60">
            {leads
              .filter((lead) => lead.stage === stage)
              .map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  onUpdateLead={onUpdateLead} 
                  onSelectLead={onSelectLead}
                />
              ))}
            
            {leads.filter(l => l.stage === stage).length === 0 && (
              <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs text-center px-4 gap-2">
                <p>Tu pipeline está despejado.</p>
                <p className="text-[10px] opacity-70 italic">Es buen momento para prospectar.</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
