import React, { useState } from 'react';
import { 
  X, Edit2, MapPin, Calendar, Clock, Building2, 
  DollarSign, Package, CheckCircle2, ArrowRight, 
  Undo2, Phone, MessageCircle, FileText, 
  History as HistoryIcon, CalendarClock, Link as LinkIcon,
  AlertTriangle, MoreVertical, Plus, Trash2, Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RentalWithItems, RentalActivity, RentalItem } from '../../hooks/useRentals';
import { cn, formatCurrency, formatLocalDate, buildWhatsAppUrl } from '../../lib/utils';
import { differenceInDays, startOfDay } from 'date-fns';
import { parseLocalDate } from '../../lib/utils';

interface RentalDetailPanelProps {
  rental: RentalWithItems | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (rentalId: string) => void;
  onRenew: (rentalId: string) => void;
  onComplete: (rentalId: string) => void;
  onCancel: (rentalId: string) => void;
  onAddActivity: (rentalId: string) => void;
  onManageItems: (rentalId: string) => void;
  onUpdateContract: (rentalId: string) => void;
  activities: RentalActivity[];
  loadingActivities: boolean;
  paymentStatus?: {
    state: 'pending' | 'confirmed' | 'not_applicable';
    label: string;
    color: string;
  };
}

export const RentalDetailPanel: React.FC<RentalDetailPanelProps> = ({
  rental,
  isOpen,
  onClose,
  onEdit,
  onRenew,
  onComplete,
  onCancel,
  onAddActivity,
  onManageItems,
  onUpdateContract,
  activities,
  loadingActivities,
  paymentStatus
}) => {
  const [showHistory, setShowHistory] = useState(false);

  if (!rental) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-zinc-100 text-zinc-800 border-zinc-200';
      case 'cancelled': return 'bg-rose-500/10 text-rose-700 border-rose-200';
      default: return 'bg-zinc-50 text-zinc-800 border-zinc-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'completed': return 'Finalizada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: any }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      <div className="text-sm font-bold text-zinc-900">{value || 'Sin registrar'}</div>
    </div>
  );

  const calculateTotal = (rental: RentalWithItems) => {
    if (rental.monthly_amount_total) return Number(rental.monthly_amount_total);
    if (!rental.items || rental.items.length === 0) return 0;
    return rental.items.reduce((sum, item) => sum + (Number(item.monthly_total) || 0), 0);
  };

  const today = startOfDay(new Date());
  const diffDays = rental.contractual_end_date 
    ? differenceInDays(parseLocalDate(rental.contractual_end_date) || new Date(), today)
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[90] lg:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 100, damping: 40 }}
            className="fixed right-0 top-0 h-full w-full lg:w-[500px] bg-white border-l border-zinc-200 shadow-2xl z-[100] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0 safe-top">
              <div className="flex items-center gap-4">
                <button
                  onClick={onClose}
                  className="lg:hidden p-2 -ml-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-900"
                >
                  <Undo2 size={24} />
                </button>
                <div className="space-y-0.5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    DETALLE DE RENTA
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                      getStatusColor(rental.status)
                    )}>
                      {getStatusLabel(rental.status)}
                    </span>
                    {paymentStatus && (
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                        paymentStatus.color
                      )}>
                        {paymentStatus.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="hidden lg:block p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide pb-32">
              
              {/* Información del Cliente */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Información del Cliente
                  </h3>
                  <div className="flex gap-2">
                    {rental.customer_phone && (
                      <button 
                        onClick={() => window.open(`tel:${rental.customer_phone}`, '_self')}
                        className="p-2 bg-zinc-50 text-zinc-600 rounded-xl hover:bg-zinc-100 transition-all"
                      >
                        <Phone size={16} />
                      </button>
                    )}
                    {rental.customer_phone && (
                      <button 
                        onClick={() => window.open(buildWhatsAppUrl(rental.customer_phone!, `Hola ${rental.customer_name}, te contacto de Creativos Espacios...`), '_blank')}
                        className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                      >
                        <MessageCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-6">
                  <InfoRow label="Cliente" value={rental.customer_name} icon={Building2} />
                  <div className="grid grid-cols-2 gap-6">
                    <InfoRow label="Proyecto" value={rental.project_name} />
                    <InfoRow label="Contacto" value={rental.contact_name} />
                  </div>
                  <InfoRow label="Ubicación" value={rental.location} icon={MapPin} />
                </div>
              </div>

              {/* Fechas e Importes */}
              <div className="space-y-6">
                <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 pb-3">
                  Cronología e Importes
                </h3>
                <div className="grid grid-cols-2 gap-8">
                  <InfoRow label="Fecha Inicio" value={formatLocalDate(rental.start_date)} icon={Calendar} />
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                      <CalendarClock size={12} />
                      Vencimiento
                    </span>
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-sm font-bold",
                        diffDays !== null && diffDays <= 30 ? "text-rose-600" : "text-zinc-900"
                      )}>
                        {rental.contractual_end_date ? formatLocalDate(rental.contractual_end_date) : 'Sin fecha'}
                      </span>
                      {diffDays !== null && (
                        <span className="text-[9px] font-black uppercase text-zinc-400 mt-0.5">
                          {diffDays < 0 ? 'Vencido' : `En ${diffDays} días`}
                        </span>
                      )}
                    </div>
                  </div>
                  <InfoRow label="Monto Mensual" value={formatCurrency(calculateTotal(rental))} icon={DollarSign} />
                  <InfoRow label="Depósito" value={formatCurrency(rental.deposit_amount || 0)} />
                </div>
              </div>

              {/* Equipos Asignados */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Equipos Asignados
                  </h3>
                  {rental.status === 'active' && (
                    <button 
                      onClick={() => onManageItems(rental.id)}
                      className="text-[10px] text-indigo-600 font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} /> Gestionar
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {rental.items && rental.items.length > 0 ? (
                    rental.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                        <div className="min-w-0 pr-4">
                          <p className="text-xs font-black text-zinc-900 uppercase tracking-tight truncate">{item.equipment_description}</p>
                          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                            {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-zinc-900">{formatCurrency(Number(item.monthly_total))}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Sin equipos asignados</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documentación */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                  <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                    Documentación
                  </h3>
                  <button 
                    onClick={() => onUpdateContract(rental.id)}
                    className="text-[10px] text-indigo-600 font-black uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    <Edit3 size={12} /> Editar links
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rental.contract_link ? (
                    <button 
                      onClick={() => window.open(rental.contract_link!, '_blank')}
                      className="flex items-center gap-3 p-4 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 transition-all text-left shadow-sm active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-zinc-900 uppercase tracking-tight">Contrato</p>
                        <p className="text-[8px] text-zinc-400 font-bold uppercase truncate">Ver documento</p>
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 flex items-center gap-3 opacity-60">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-300 shrink-0">
                        <FileText size={20} />
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sin contrato</p>
                    </div>
                  )}
                  {rental.folder_link ? (
                    <button 
                      onClick={() => window.open(rental.folder_link!, '_blank')}
                      className="flex items-center gap-3 p-4 bg-white border border-zinc-200 rounded-2xl hover:bg-zinc-50 transition-all text-left shadow-sm active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <LinkIcon size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-zinc-900 uppercase tracking-tight">Carpeta</p>
                        <p className="text-[8px] text-zinc-400 font-bold uppercase truncate">Google Drive / Dropbox</p>
                      </div>
                    </button>
                  ) : (
                    <div className="p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 flex items-center gap-3 opacity-60">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-300 shrink-0">
                        <LinkIcon size={20} />
                      </div>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Sin carpeta</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones Operativas */}
              {rental.status === 'active' && (
                <div className="space-y-6">
                  <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] border-b border-rose-100 pb-3">
                    Gestión Operativa
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => onRenew(rental.id)}
                      className="flex items-center justify-between px-6 py-5 rounded-3xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all group active:scale-[0.98] shadow-xl shadow-zinc-900/10"
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="text-xs font-black uppercase tracking-wider">Renovar Renta</span>
                        <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Extender contrato</span>
                      </div>
                      <CalendarClock size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => onComplete(rental.id)}
                      className="flex items-center justify-between px-6 py-5 rounded-3xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all group active:scale-[0.98] shadow-xl shadow-emerald-600/10"
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="text-xs font-black uppercase tracking-wider">Finalizar Renta</span>
                        <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Cerrar ciclo</span>
                      </div>
                      <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                      onClick={() => onCancel(rental.id)}
                      className="sm:col-span-2 flex items-center justify-between px-6 py-5 rounded-3xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all group active:scale-[0.98]"
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="text-xs font-black uppercase tracking-wider">Cancelar Renta</span>
                        <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Anulación total</span>
                      </div>
                      <AlertTriangle size={20} className="group-hover:shake transition-transform" />
                    </button>
                  </div>
                </div>
              )}

              {/* Bitácora / Historial */}
              <div className="space-y-6 pb-10">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:text-zinc-900 transition-colors py-2"
                >
                  <HistoryIcon size={14} />
                  Bitácora de seguimiento {activities.length > 0 && `(${activities.length})`}
                </button>
                
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-6 overflow-hidden"
                    >
                      <button 
                        onClick={() => onAddActivity(rental.id)}
                        className="w-full py-3 bg-zinc-50 border border-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Registrar nota de seguimiento
                      </button>

                      {loadingActivities ? (
                        <div className="flex items-center justify-center py-8">
                          <Clock size={20} className="animate-spin text-zinc-300" />
                        </div>
                      ) : activities.length > 0 ? (
                        <div className="space-y-6 pl-4 border-l-2 border-zinc-100 ml-1">
                          {activities.map((act, i) => (
                            <div key={i} className="relative">
                              <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-zinc-200" />
                              <div className="space-y-1">
                                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                  {formatLocalDate(act.created_at)} • {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                                <p className="text-xs font-bold text-zinc-900 tracking-tight leading-snug">{act.notes}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-300 italic pl-2">No hay notas de seguimiento disponibles.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 left-0 right-0 p-6 border-t border-zinc-100 bg-white/90 backdrop-blur-xl shrink-0 z-50 safe-bottom">
              <button
                onClick={() => onEdit(rental.id)}
                className="w-full max-w-2xl mx-auto py-5 bg-zinc-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Edit2 size={18} />
                Editar ficha de renta
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
