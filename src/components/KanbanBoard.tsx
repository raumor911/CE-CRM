import React, { useState } from 'react';
import { 
  DndContext, 
  DragEndEvent,
  DragStartEvent,
  PointerSensor, 
  useSensor, 
  useSensors, 
  closestCorners,
  closestCenter,
  DragOverlay,
  TouchSensor,
  KeyboardSensor
} from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy,
  sortableKeyboardCoordinates
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Lead } from '../types';
import { LeadCard } from './LeadCard';
import { STAGES } from '../constants';
import { cn } from '../lib/utils';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
  onSelectLead: (lead: Lead) => void;
}

const VALID_STAGES = ['Ingreso', 'Briefing', 'Propuesta', 'Negociación', 'Cierre'];

const KanbanColumn: React.FC<{
  id: string;
  title: string;
  leads: Lead[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
  onSelectLead: (lead: Lead) => void;
}> = ({ id, title, leads, onUpdateLead, onSelectLead }) => {
  const { setNodeRef, isOver } = useDroppable({ id });

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
    <div ref={setNodeRef} className="flex-shrink-0 w-80 flex flex-col min-h-[500px]">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="font-black uppercase text-xs text-zinc-400 flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", getStageColor(title))}></span>
          {title}
          <span className={cn(
            "bg-white border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded-full shadow-sm transition-all duration-300",
            isOver && "animate-pulse ring-2 ring-indigo-400 border-indigo-400 text-indigo-600 scale-110"
          )}>
            {leads.length}
          </span>
        </h3>
      </div>
      
      <div className={cn(
        "flex-1 space-y-3 rounded-xl p-3 border transition-all duration-300",
        isOver 
          ? "bg-indigo-50/50 border-2 border-dashed border-indigo-400 shadow-inner scale-[1.02]" 
          : "bg-slate-100/50 border-slate-200/60"
      )}>
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3 min-h-[200px]">
            {leads.map((lead) => (
              <LeadCard 
                key={lead.id} 
                lead={lead} 
                onUpdateLead={onUpdateLead} 
                onSelectLead={onSelectLead}
              />
            ))}
          </div>
        </SortableContext>
        
        {leads.length === 0 && !isOver && (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs text-center px-4 gap-2">
            <p>Tu pipeline está despejado.</p>
            <p className="text-[10px] opacity-70 italic">Es buen momento para prospectar.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onUpdateLead, onSelectLead }) => {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('DragEnd - Detalle:', { activeId: active.id, overId: over?.id });
    setActiveLead(null);
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Determinar la etapa de destino
    let newStage: string | undefined;

    if (VALID_STAGES.includes(overId)) {
      newStage = overId;
    } else {
      const targetLead = leads.find(l => l.id === overId);
      newStage = targetLead?.stage;
    }

    if (newStage && STAGES.includes(newStage as any)) {
      const lead = leads.find(l => l.id === activeId);
      if (lead && lead.stage !== newStage) {
        if (newStage === 'Cierre') {
          const isChecklistComplete = 
            lead.checklist_briefing?.m2 && 
            lead.checklist_briefing?.style_defined && 
            lead.checklist_briefing?.deadlines;
          
          // VALIDACIÓN FLEXIBLE PARA CIERRE (Vantage Shield 2.0)
          // Eliminamos el requisito de Email obligatorio para cerrar
          if (!isChecklistComplete || lead.sentiment_label !== 'Entusiasta' || (lead.budget || 0) <= 0) {
            const missing = [];
            if (!isChecklistComplete) missing.push("Checklist de Briefing completo (3/3)");
            if (lead.sentiment_label !== 'Entusiasta') missing.push("Sentimiento 'Entusiasta' (indispensable para cierre)");
            if ((lead.budget || 0) <= 0) missing.push("Presupuesto definido (mayor a 0)");

            alert(`Asegúrate de cumplir con los requisitos comerciales antes de cerrar:\n\n- ${missing.join('\n- ')}`);
            
            if (missing.length > 0) return;
          }
        }
        onUpdateLead(activeId, { stage: newStage as Lead['stage'] });
      }
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide px-6 py-4">
        {STAGES.map((stage) => (
          <KanbanColumn 
            key={stage}
            id={stage}
            title={stage}
            leads={leads.filter(l => l.stage === stage)}
            onUpdateLead={onUpdateLead}
            onSelectLead={onSelectLead}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <LeadCard 
            lead={activeLead} 
            onUpdateLead={() => {}} 
            onSelectLead={() => {}} 
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
