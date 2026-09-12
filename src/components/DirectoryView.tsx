import React, { useState } from 'react';
import { Lead } from '../types';
import { Search, Filter, MoreVertical, ExternalLink, Mail, Phone, Archive, History, CheckCircle2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { useSupabaseLeads } from '../hooks/useSupabaseLeads';
import { useEffect } from 'react';

interface DirectoryViewProps {
  leads: Lead[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({ leads: initialLeads, onUpdateLead }) => {
  const { fetchArchivedLeads } = useSupabaseLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [archivedLeads, setArchivedLeads] = useState<Lead[]>([]);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);

  useEffect(() => {
    if (showArchived) {
      setIsLoadingArchived(true);
      fetchArchivedLeads().then(data => {
        setArchivedLeads(data);
        setIsLoadingArchived(false);
      });
    }
  }, [showArchived, fetchArchivedLeads]);

  const handleUnarchive = async (lead: Lead) => {
    try {
      await onUpdateLead(lead.id, { is_archived: false });
      if (showArchived) {
        setArchivedLeads(prev => prev.filter(l => l.id !== lead.id));
      }
    } catch (error) {
      console.error('Error unarchiving lead:', error);
    }
  };

  const currentLeads = showArchived ? archivedLeads : initialLeads;

  const filteredLeads = currentLeads.filter(lead => 
    lead.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.project_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-6 bg-zinc-50 min-h-full pb-32 md:pb-8">
      <div className="flex flex-col gap-6 safe-top">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase">
            {showArchived ? 'Archivo Estratégico' : 'Directorio de Leads'}
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-medium">
            {showArchived 
              ? 'Consulta leads en hibernación para futuras campañas.' 
              : 'Gestión masiva y búsqueda de prospectos activos.'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm shrink-0">
            <button
              onClick={() => setShowArchived(false)}
              className={cn(
                "flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                !showArchived ? "bg-zinc-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
              )}
            >
              Activos
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={cn(
                "flex-1 md:flex-none px-6 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
                showArchived ? "bg-rose-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
              )}
            >
              <Archive size={14} />
              Archivados
            </button>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre o proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-base md:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-zinc-100">
          {isLoadingArchived ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs text-slate-500 font-black uppercase tracking-widest">Cargando...</p>
              </div>
            </div>
          ) : filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="p-6 active:bg-zinc-50 transition-colors relative">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="text-base font-black text-slate-900 tracking-tight truncate uppercase">{lead.lead_name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{lead.project_name || 'Sin proyecto'}</span>
                  </div>
                  <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm shrink-0",
                    lead.stage === 'Ingreso' ? "bg-blue-50 border-blue-200 text-blue-700" :
                    lead.stage === 'Briefing' ? "bg-amber-50 border-amber-200 text-amber-700" :
                    lead.stage === 'Propuesta' ? "bg-indigo-50 border-indigo-200 text-indigo-700" :
                    "bg-emerald-50 border-emerald-200 text-emerald-700"
                  )}>
                    {lead.stage}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Presupuesto</span>
                    <span className="text-sm font-black text-slate-900">
                      {lead.budget ? formatCurrency(lead.budget) : '---'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sentimiento</span>
                    <span className={cn(
                      "text-xs font-black uppercase tracking-tight",
                      lead.sentiment_label === 'Entusiasta' ? "text-emerald-600" :
                      lead.sentiment_label === 'Dudoso' ? "text-amber-600" :
                      "text-rose-600"
                    )}>
                      {lead.sentiment_label || 'Sin datos'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-5 border-t border-zinc-50">
                  <a 
                    href={`tel:${lead.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 text-white h-12 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-zinc-900/10"
                  >
                    <Phone size={14} />
                    Llamar
                  </a>
                  {lead.email && (
                    <a 
                      href={`mailto:${lead.email}`}
                      className="w-12 h-12 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-400 active:bg-zinc-100 active:text-zinc-900 transition-all"
                    >
                      <Mail size={18} />
                    </a>
                  )}
                  {showArchived ? (
                    <button 
                      onClick={() => handleUnarchive(lead)}
                      className="flex-1 bg-emerald-600 text-white h-12 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/10 active:scale-95 transition-all"
                    >
                      Recuperar
                    </button>
                  ) : (
                    <button className="w-12 h-12 flex items-center justify-center bg-zinc-50 border border-zinc-100 rounded-2xl text-zinc-400 active:bg-zinc-100 active:text-zinc-900 transition-all">
                      <ExternalLink size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-16 text-center text-zinc-400">
              <Search size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sin resultados</p>
            </div>
          )}
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lead / Proyecto</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Etapa Final</th>
                {showArchived && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Motivo Archivo</th>}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Presupuesto</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sentimiento</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingArchived ? (
                <tr>
                  <td colSpan={showArchived ? 7 : 6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                      <p className="text-sm text-slate-500 font-medium tracking-widest uppercase">Cargando archivo...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{lead.lead_name}</span>
                        <span className="text-xs text-slate-500">{lead.project_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tight",
                        lead.stage === 'Ingreso' ? "bg-blue-50 text-blue-600" :
                        lead.stage === 'Briefing' ? "bg-amber-50 text-amber-600" :
                        lead.stage === 'Propuesta' ? "bg-indigo-50 text-indigo-600" :
                        "bg-emerald-50 text-emerald-600"
                      )}>
                        {lead.stage}
                      </span>
                    </td>
                    {showArchived && (
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md uppercase tracking-tight">
                          {lead.archive_reason}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        {lead.budget ? formatCurrency(lead.budget) : '---'}
                      </span>
                    </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs font-medium",
                      lead.sentiment_label === 'Entusiasta' ? "text-emerald-600" :
                      lead.sentiment_label === 'Dudoso' ? "text-amber-600" :
                      "text-rose-600"
                    )}>
                      {lead.sentiment_label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {lead.email && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Mail size={12} className="shrink-0 text-slate-400" />
                          <span className="text-xs truncate max-w-[150px]">{lead.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-500">
                        <Phone size={12} className="shrink-0 text-slate-400" />
                        <span className="text-xs">{lead.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {lead.email && (
                        <a 
                          href={`mailto:${lead.email}`}
                          className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-brand-primary transition-colors"
                          title="Enviar Email"
                        >
                          <Mail size={14} />
                        </a>
                      )}
                      <a 
                        href={`tel:${lead.phone}`}
                        className="p-1.5 bg-slate-100 rounded-lg text-slate-500 hover:text-brand-primary transition-colors"
                        title="Llamar"
                      >
                        <Phone size={14} />
                      </a>
                      <button className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors">
                        <ExternalLink size={16} />
                      </button>
                      {showArchived && (
                        <button 
                          onClick={() => handleUnarchive(lead)}
                          className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-1 text-[10px] font-bold px-2"
                          title="Recuperar Lead"
                        >
                          <CheckCircle2 size={14} />
                          Recuperar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showArchived ? 7 : 6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={32} className="opacity-20" />
                      <p className="text-sm">No se encontraron leads que coincidan con la búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Loader2 = ({ className, size }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("animate-spin", className)}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
