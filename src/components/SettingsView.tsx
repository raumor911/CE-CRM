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
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Configuración del Sistema</h1>
          <p className="text-zinc-500 text-sm">Ajusta los parámetros globales y preferencias de usuario.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
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
            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-xl flex items-center gap-3"
          >
            <CheckCircle2 size={18} />
            <span className="text-sm font-bold">Configuración guardada exitosamente.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-1">
          {sections.map(section => (
            <button
              key={section.id}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <section.icon size={18} />
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        <div className="md:col-span-3 space-y-8">
          {/* Configuración de Cost of Wait - EN HOLD */}
          {/* 
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <DollarSign className="text-indigo-500" size={24} />
              <h3 className="text-lg font-bold text-white">Configuración de Cost of Wait</h3>
            </div>
            ...
          </div>
          */}

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <UserIcon className="text-indigo-500" size={24} />
              <h3 className="text-lg font-bold text-white">Provisionamiento de Usuarios</h3>
            </div>
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {provisioningError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-xs font-bold"
                  >
                    Error: {provisioningError}
                  </motion.div>
                )}
                {provisioningSuccess && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-xl text-xs font-bold"
                  >
                    ¡Usuario provisionado con éxito!
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">Andrea Andrade</p>
                  <p className="text-xs text-zinc-500">andy.creativos.espacios@gmail.com</p>
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
                      if (err.message.includes('rate limit')) {
                        setProvisioningError('Límite de correos excedido por Supabase. Por favor, espera unos minutos o desactiva "Confirm Email" en tu consola de Supabase Auth.');
                      } else {
                        setProvisioningError(err.message);
                      }
                    } finally {
                      setProvisioning(false);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
              <p className="text-[10px] text-zinc-500 italic">
                * El password temporal para Andrea es: <code className="bg-zinc-800 px-1 rounded">Andrea_Creativos_2026_#</code>
              </p>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <Save className="text-indigo-500" size={24} />
              <h3 className="text-lg font-bold text-white">Importación Masiva (Google Sheets)</h3>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-zinc-500">
                Pega aquí los datos exportados de Google Sheets (formato CSV o valores separados por comas) para cargarlos al directorio.
              </p>
              <textarea
                id="csv-import-area"
                placeholder="Oportunidad_ID,Fecha_entrada,Nombre..."
                className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={async () => {
                    const textarea = document.getElementById('csv-import-area') as HTMLTextAreaElement;
                    const csvData = textarea.value;
                    if (!csvData) return alert('Por favor pega los datos primero.');
                    
                    const result = await importLeadsFromCSV(csvData, 'Ingreso');
                    if (result.success) {
                      alert(`¡Éxito! Se han importado ${result.count} leads en etapa de Ingreso.`);
                      textarea.value = '';
                    } else {
                      alert('Error en la importación: ' + result.message);
                    }
                  }}
                  className="py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-all border border-zinc-700"
                >
                  Cargar como Prospectos (Ingreso)
                </button>
                <button
                  onClick={async () => {
                    const textarea = document.getElementById('csv-import-area') as HTMLTextAreaElement;
                    const csvData = textarea.value;
                    if (!csvData) return alert('Por favor pega los datos primero.');
                    
                    const result = await importLeadsFromCSV(csvData, 'Cierre');
                    if (result.success) {
                      alert(`¡Éxito! Se han importado ${result.count} leads en etapa de Cierre (Agenda).`);
                      textarea.value = '';
                    } else {
                      alert('Error en la importación: ' + result.message);
                    }
                  }}
                  className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  Cargar como Clientes (Cierre)
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <Shield className="text-indigo-500" size={24} />
              <h3 className="text-lg font-bold text-white">Roles y Permisos</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <div>
                  <p className="text-sm font-bold text-white">Rol Actual</p>
                  <p className="text-xs text-zinc-500">Comercial / Sales Representative</p>
                </div>
                <span className="px-3 py-1 bg-indigo-500/10 text-indigo-500 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                  Nivel 1
                </span>
              </div>
              <p className="text-xs text-zinc-500 italic">
                * Los permisos de administrador son necesarios para modificar el valor hora global.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
