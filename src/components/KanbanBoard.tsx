import React from 'react';
import { Lead } from '../types';
import { LeadCard } from './LeadCard';
import { STAGES } from '../constants';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
  onSelectLead: (lead: Lead) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onUpdateLead, onSelectLead }) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
      {STAGES.map((stage) => (
        <div key={stage} className="flex-shrink-0 w-72">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              {stage}
              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 rounded-full">
                {leads.filter(l => l.stage === stage).length}
              </span>
            </h3>
          </div>
          
          <div className="space-y-3 min-h-[500px] rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 p-2 border border-zinc-100 dark:border-zinc-800/50">
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
              <div className="h-24 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 text-xs text-center px-4">
                Sin leads en esta etapa
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
