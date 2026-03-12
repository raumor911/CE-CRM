import React, { useState } from 'react';
import { LayoutDashboard, Search, Bell, Menu, Plus, CheckCircle2, LogOut, User as UserIcon } from 'lucide-react';
import { KanbanBoard } from './components/KanbanBoard';
import { DashboardView } from './components/DashboardView';
import { DirectoryView } from './components/DirectoryView';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { NewLeadForm } from './components/modals/NewLeadForm';
import { LeadDetailModal } from './components/LeadDetailModal';
import { motion, AnimatePresence } from 'motion/react';
import { Lead } from './types';
import { useLeadAutomation } from './hooks/useLeadAutomation';
import { useSupabaseLeads } from './hooks/useSupabaseLeads';
import { cn } from './lib/utils';
import { Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { AuthLayout } from './components/auth/AuthLayout';
import { LoginForm } from './components/auth/LoginForm';
import { SignUpForm } from './components/auth/SignUpForm';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { leads, loading, createLead: supabaseCreateLead, updateLead: supabaseUpdateLead } = useSupabaseLeads();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;
  const [currentView, setCurrentView] = useState<'dashboard' | 'pipeline' | 'directory' | 'settings'>('pipeline');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { analyzeSentiment } = useLeadAutomation();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreateLead = async (data: any) => {
    try {
      // 1. CONSTRUCCIÓN LIMPIA DEL OBJETO
      // Convertimos explícitamente el presupuesto a número y eliminamos la imagen
      const newLeadData: Omit<Lead, 'id'> = {
        project_name: data.project_name,
        lead_name: data.lead_name,
        // REGLA DE ORO: Si el email viene vacío, enviamos null para PostgreSQL
        email: data.email?.trim() === "" ? null : data.email,
        phone: data.phone,
        budget: Number(data.budget) || 0, // Aseguramos que sea número
        category: data.category,
        stage: 'Ingreso',
        last_activity: new Date().toISOString(),
        sentiment_label: 'Dudoso',
        main_image_url: '', // Enviamos cadena vacía para evitar errores de tipo
        checklist_briefing: { m2: false, style_defined: false, deadlines: false }
      };

      // 2. INSERCIÓN EN SUPABASE
      const createdLead = await supabaseCreateLead(newLeadData);
      
      if (createdLead) {
        // 3. ANÁLISIS DE SENTIMIENTO (Opcional)
        try {
          const sentiment = await analyzeSentiment("Nuevo lead capturado");
          await supabaseUpdateLead(createdLead.id, { sentiment_label: sentiment });
        } catch (e) {
          console.warn("Fallo análisis de IA, pero el lead se creó.");
        }

        showToast("Lead creado exitosamente", "success");
        setIsModalOpen(false); // Cerrar modal
      }
    } catch (error: any) {
      console.error("Error crítico al crear lead:", error);
      // Si el error es 23505, es por correo duplicado
      const message = error.code === '23505'
        ? "Este correo electrónico ya está registrado"
        : "Error de conexión con la base de datos";
      showToast(message, "error");
    }
  };

  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      await supabaseUpdateLead(id, { ...updates, last_activity: new Date().toISOString() });
      showToast("Lead actualizado", "success");
    } catch (error: any) {
      console.error("Error al actualizar lead:", error);
      // Extraer el mensaje de error de Supabase si existe
      const errorMessage = error.details || error.message || "Error al actualizar el lead";
      showToast(errorMessage, "error");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm text-zinc-500 font-medium tracking-widest uppercase">Verificando Sesión...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthLayout 
        title={authMode === 'login' ? 'Bienvenido de Nuevo' : 'Crear Cuenta'} 
        subtitle={authMode === 'login' ? 'Ingresa tus credenciales para acceder' : 'Regístrate para gestionar tus leads'}
      >
        {authMode === 'login' ? (
          <LoginForm onToggleMode={() => setAuthMode('signup')} />
        ) : (
          <SignUpForm onToggleMode={() => setAuthMode('login')} />
        )}
      </AuthLayout>
    );
  }

  return (
    <div className="min-h-screen bg-bg-main text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 flex">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen flex flex-col",
        isSidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between max-w-[1600px] mx-auto">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-black tracking-tight uppercase text-slate-900">
                {currentView === 'pipeline' ? 'Pipeline Kanban' : 
                 currentView === 'dashboard' ? 'Dashboard' :
                 currentView === 'directory' ? 'Directorio' : 'Ajustes'}
              </h1>
              {currentView === 'pipeline' && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-brand-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Nuevo Lead</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                <Search size={20} />
              </button>
              <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-status-critical rounded-full border-2 border-white"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 max-w-[1600px] mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-sm text-zinc-500 font-medium">Conectando con Supabase...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {currentView === 'pipeline' && (
                  <KanbanBoard 
                    leads={leads} 
                    onUpdateLead={handleUpdateLead}
                    onSelectLead={(lead) => setSelectedLeadId(lead.id)}
                  />
                )}
                {currentView === 'dashboard' && <DashboardView leads={leads} />}
                {currentView === 'directory' && (
                  <DirectoryView 
                    leads={leads} 
                    onUpdateLead={handleUpdateLead}
                  />
                )}
                {currentView === 'settings' && <SettingsView />}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <NewLeadForm 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)} 
            onSubmit={handleCreateLead} 
          />
        )}
        {selectedLead && (
          <LeadDetailModal
            lead={selectedLead}
            onClose={() => setSelectedLeadId(null)}
            onUpdate={handleUpdateLead}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
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
