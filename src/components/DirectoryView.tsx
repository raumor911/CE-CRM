import React, { useState } from 'react';
import { Lead } from '../types';
import { Search, Filter, MoreVertical, ExternalLink, Mail, Phone } from 'lucide-react';
import { cn } from '../lib/utils';

interface DirectoryViewProps {
  leads: Lead[];
}

export const DirectoryView: React.FC<DirectoryViewProps> = ({ leads }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = leads.filter(lead => 
    lead.lead_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.project_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Directorio de Leads</h1>
          <p className="text-zinc-500 text-sm">Gestión masiva y búsqueda detallada de prospectos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Buscar lead o proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-64"
            />
          </div>
          <button className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-bottom border-zinc-800 bg-zinc-900/80">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Lead / Proyecto</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Etapa</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Presupuesto</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sentimiento</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">{lead.lead_name}</span>
                      <span className="text-xs text-zinc-500">{lead.project_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      lead.stage === 'Ingreso' ? "bg-blue-500/10 text-blue-500" :
                      lead.stage === 'Briefing' ? "bg-amber-500/10 text-amber-500" :
                      lead.stage === 'Propuesta' ? "bg-indigo-500/10 text-indigo-500" :
                      lead.stage === 'Negociación' ? "bg-purple-500/10 text-purple-500" :
                      "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-white">
                      ${lead.budget?.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-xs",
                      lead.sentiment_label === 'Entusiasta' ? "text-emerald-500" :
                      lead.sentiment_label === 'Dudoso' ? "text-amber-500" :
                      "text-rose-500"
                    )}>
                      {lead.sentiment_label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Mail size={12} className="shrink-0" />
                        <span className="text-xs truncate max-w-[150px]">{lead.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Phone size={12} className="shrink-0" />
                        <span className="text-xs">{lead.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={`mailto:${lead.email}`}
                        className="p-1.5 bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                        title="Enviar Email"
                      >
                        <Mail size={14} />
                      </a>
                      <a 
                        href={`tel:${lead.phone}`}
                        className="p-1.5 bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                        title="Llamar"
                      >
                        <Phone size={14} />
                      </a>
                      <button className="p-1.5 text-zinc-500 hover:text-white transition-colors">
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
