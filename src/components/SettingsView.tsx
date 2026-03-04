import React, { useState } from 'react';
import { Settings, DollarSign, Clock, Bell, Shield, Save, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SettingsView: React.FC = () => {
  const [costPerHour, setCostPerHour] = useState(50);
  const [showSaved, setShowSaved] = useState(false);

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
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <DollarSign className="text-indigo-500" size={24} />
              <h3 className="text-lg font-bold text-white">Configuración de Cost of Wait</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Valor por Hora de Inactividad (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="number"
                    value={costPerHour}
                    onChange={(e) => setCostPerHour(Number(e.target.value))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Este valor se utiliza para calcular la pérdida económica acumulada por cada hora que un lead permanece sin actividad en el pipeline.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Clock size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Umbral de Alerta</span>
                  </div>
                  <p className="text-xl font-black text-white">24 Horas</p>
                  <p className="text-[10px] text-zinc-500">Tiempo antes de marcar como crítico.</p>
                </div>
                <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-500">
                    <Bell size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Priorización Auto</span>
                  </div>
                  <p className="text-xl font-black text-white">Activado</p>
                  <p className="text-[10px] text-zinc-500">Mueve leads estancados al inicio.</p>
                </div>
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
