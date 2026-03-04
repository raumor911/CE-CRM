import React, { useState } from 'react';
import { LayoutDashboard, Search, Bell, Menu, Plus, CheckCircle2 } from 'lucide-react';
import { KanbanBoard } from './components/KanbanBoard';
import { CostOfWaitDashboard } from './components/CostOfWaitDashboard';
import { NewLeadForm } from './components/modals/NewLeadForm';
import { motion, AnimatePresence } from 'motion/react';
import { Lead } from './types';
import { useLeadAutomation } from './hooks/useLeadAutomation';
import { useSupabaseLeads } from './hooks/useSupabaseLeads';
import { cn } from './lib/utils';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { leads, loading, createLead: supabaseCreateLead, updateLead: supabaseUpdateLead } = useSupabaseLeads();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { analyzeSentiment } = useLeadAutomation();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      await supabaseUpdateLead(id, { ...updates, last_activity: new Date().toISOString() });
      if (updates.stage && updates.stage === 'Briefing') {
        showToast("¡Briefing Agendado con éxito!", "success");
      }
    } catch (error) {
      showToast("Error al actualizar el lead", "error");
    }
  };

  const handleCreateLead = async (data: any) => {
    try {
      const newLeadData: Omit<Lead, 'id'> = {
        project_name: data.project_name,
        lead_name: data.lead_name,
        phone: data.phone,
        budget: data.budget,
        category: data.category,
        stage: 'Ingreso',
        last_activity: new Date().toISOString(),
        sentiment_label: 'Dudoso',
        main_image_url: data.main_image_url,
        checklist_briefing: { m2: false, style_defined: false, deadlines: false }
      };

      const createdLead = await supabaseCreateLead(newLeadData);
      
      if (createdLead) {
        // Trigger IA Sentiment Analysis
        const sentiment = await analyzeSentiment("Nuevo lead capturado desde el formulario");
        await supabaseUpdateLead(createdLead.id, { sentiment_label: sentiment });
      }
    } catch (error) {
      showToast("Error al crear el lead", "error");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-bottom border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Sales Cockpit</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Architecture & Design</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
              <Search size={20} />
            </button>
            <button className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-black"></span>
            </button>
            <button className="md:hidden p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-sm text-zinc-500 font-medium">Conectando con Supabase...</p>
          </div>
        ) : (
          <>
            {/* Top Stats */}
            <CostOfWaitDashboard leads={leads} />

            {/* Content Area */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Pipeline Comercial</h2>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Plus size={18} />
                  Nuevo Lead
                </button>
              </div>
              <KanbanBoard leads={leads} onUpdateLead={updateLead} />
            </div>
          </>
        )}
      </main>

      {/* Mobile Floating Action Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-50"
      >
        <Plus size={28} />
      </button>

      <NewLeadForm 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSubmit={handleCreateLead} 
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={cn(
              "fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md",
              toast.type === 'success' 
                ? "bg-emerald-500/90 text-white border-emerald-400/20" 
                : "bg-rose-500/90 text-white border-rose-400/20"
            )}
          >
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle2 size={14} />
            </div>
            <span className="text-sm font-bold tracking-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
