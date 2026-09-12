import React, { useState } from 'react';
import { Settings, DollarSign, Clock, Bell, Shield, Save, CheckCircle2, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { importLeadsFromCSV } from '../lib/importLeads';

export const SettingsView: React.FC = () => {
  const [costPerHour, setCostPerHour] = useState(50);
  const [showSaved, setShowSaved] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisioningError, setProvisioningError] = useState<string | null>(null);
  const [provisioningSuccess, setProvisioningSuccess] = useState(false);

  const handleSave = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 3000);
  };

  const sections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'pricing', label: 'Costos y Tarifas', icon: DollarSign },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto pb-32 md:pb-8 bg-zinc-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 safe-top">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">Configuración</h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium">Ajusta los parámetros globales y preferencias.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-3 bg-zinc-900 text-white font-black text-[10px] md:text-xs uppercase tracking-[0.2em] h-14 md:h-12 px-8 rounded-2xl transition-all shadow-xl shadow-zinc-900/10 active:scale-95 w-full md:w-auto"
        >
          <Save size={18} />
          <span>Guardar Cambios</span>
        </button>
      </div>

      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-5 py-4 rounded-2xl flex items-center gap-3 shadow-sm"
          >
            <CheckCircle2 size={18} />
            <span className="text-xs md:text-sm font-bold">Configuración guardada exitosamente.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-8">
        <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 gap-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {sections.map(section => (
            <button
              key={section.id}
              className="flex-shrink-0 md:w-full flex items-center gap-3 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-100 shadow-sm md:shadow-none bg-white md:bg-transparent"
            >
              <section.icon size={16} />
              <span className="whitespace-nowrap">{section.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-10">
          <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white">
                <UserIcon size={20} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Provisionamiento</h3>
            </div>
            
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {provisioningError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Error: {provisioningError}
                  </motion.div>
                )}
                {provisioningSuccess && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    ¡Usuario provisionado con éxito!
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Andrea Andrade</p>
                  <p className="text-xs text-slate-500 font-medium">andy.creativos.espacios@gmail.com</p>
                </div>
                <button
                  disabled={provisioning || provisioningSuccess}
                  onClick={async () => {
                    setProvisioning(true);
                    setProvisioningError(null);
                    setProvisioningSuccess(false);
                    try {
                      const { error } = await supabase.auth.signUp({
                        email: 'andy.creativos.espacios@gmail.com',
                        password: 'Andrea_Creativos_2026_#',
                        options: {
                          data: {
                            full_name: 'Andrea Andrade',
                          }
                        }
                      });
                      if (error) throw error;
                      setProvisioningSuccess(true);
                      setTimeout(() => setProvisioningSuccess(false), 5000);
                    } catch (err: any) {
                      setProvisioningError(err.message);
                    } finally {
                      setProvisioning(false);
                    }
                  }}
                  className="px-6 py-3 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/10 active:scale-95"
                >
                  {provisioning ? (
                    <>
                      <Clock className="animate-spin" size={14} />
                      <span>Procesando...</span>
                    </>
                  ) : provisioningSuccess ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Completado</span>
                    </>
                  ) : (
                    'Provisionar Acceso'
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-8 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
              <Save className="text-zinc-900" size={24} />
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Importación Masiva</h3>
            </div>
            
            <div className="space-y-6">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Pega aquí los datos exportados de Google Sheets (formato CSV) para cargarlos al directorio comercial.
              </p>
              
              <textarea
                id="csv-import-area"
                placeholder="Oportunidad_ID,Fecha_entrada,Nombre..."
                className="w-full h-40 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-base md:text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none"
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={async () => {
                    const textarea = document.getElementById('csv-import-area') as HTMLTextAreaElement;
                    const csvData = textarea.value;
                    if (!csvData) return alert('Por favor pega los datos primero.');
                    const result = await importLeadsFromCSV(csvData, 'Ingreso');
                    if (result.success) {
                      alert(`¡Éxito! Se han importado ${result.count} leads.`);
                      textarea.value = '';
                    } else alert('Error: ' + result.message);
                  }}
                  className="py-4 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all hover:bg-slate-50 active:scale-95"
                >
                  Cargar Prospectos
                </button>
                <button
                  onClick={async () => {
                    const textarea = document.getElementById('csv-import-area') as HTMLTextAreaElement;
                    const csvData = textarea.value;
                    if (!csvData) return alert('Por favor pega los datos primero.');
                    const result = await importLeadsFromCSV(csvData, 'Cierre');
                    if (result.success) {
                      alert(`¡Éxito! Se han importado ${result.count} clientes.`);
                      textarea.value = '';
                    } else alert('Error: ' + result.message);
                  }}
                  className="py-4 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-zinc-900/10 active:scale-95"
                >
                  Cargar Clientes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
