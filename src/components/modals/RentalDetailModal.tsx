import React, { useMemo } from 'react';
import { X, AlertTriangle, PhoneOff, Calendar, MapPin, CreditCard, Box, Edit3, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Rental, RentalItem } from '../../types';

interface RentalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rental: Rental | null;
  items: RentalItem[];
  onFinalizeRental?: (rentalId: string) => void;
  onCancelContract?: (rentalId: string) => void;
  onEdit?: (rentalId: string) => void;
}

export const RentalDetailModal: React.FC<RentalDetailModalProps> = ({
  isOpen,
  onClose,
  rental,
  items,
  onFinalizeRental,
  onCancelContract,
  onEdit
}) => {
  const isExpired = useMemo(() => {
    if (!rental?.contractual_end_date) return false;
    return new Date(rental.contractual_end_date) < new Date();
  }, [rental]);

  const totalMonthly = useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.monthly_total) || 0), 0);
  }, [items]);

  if (!isOpen || !rental) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-700', label: 'Activo' };
      case 'completed':
        return { bg: 'bg-blue-500/10', text: 'text-blue-700', label: 'Finalizado' };
      case 'cancelled':
        return { bg: 'bg-rose-500/10', text: 'text-rose-700', label: 'Cancelado' };
      default:
        return { bg: 'bg-zinc-500/10', text: 'text-zinc-700', label: status };
    }
  };

  const getPaymentConfig = (status: string) => {
    switch (status) {
      case 'current':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-700', label: 'Al corriente' };
      case 'pending_confirmation':
        return { bg: 'bg-amber-500/10', text: 'text-amber-700', label: 'Pago Pendiente' };
      default:
        return { bg: 'bg-zinc-500/10', text: 'text-zinc-700', label: 'Desconocido' };
    }
  };

  const statusConfig = getStatusConfig(rental.status);
  const paymentConfig = getPaymentConfig(rental.payment_status);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between sticky top-0 bg-white z-20 shrink-0">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-zinc-900">{rental.customer_name}</h2>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.label}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">Detalles de renta y equipos</p>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(rental.id)}
                  className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-indigo-600"
                  title="Editar Renta"
                >
                  <Edit3 size={18} />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            
            {/* Alertas */}
            {(!rental.customer_phone || isExpired) && (
              <div className="flex flex-col gap-2">
                {!rental.customer_phone && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                    <PhoneOff className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-amber-700 font-medium">
                      El cliente no tiene teléfono registrado. Es importante para el seguimiento.
                    </p>
                  </div>
                )}
                {isExpired && rental.status === 'active' && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3">
                    <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-rose-700 font-medium">
                      El contrato ha vencido (Vencimiento: {new Date(rental.contractual_end_date!).toLocaleDateString()}).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Calendar size={12} /> Inicio
                </span>
                <p className="text-sm font-semibold text-zinc-900">
                  {new Date(rental.start_date).toLocaleDateString()}
                </p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Calendar size={12} /> Vencimiento
                </span>
                <p className="text-sm font-semibold text-zinc-900">
                  {rental.contractual_end_date ? new Date(rental.contractual_end_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1 col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <MapPin size={12} /> Ubicación
                </span>
                <p className="text-sm font-semibold text-zinc-900 truncate" title={[rental.project_name, rental.location].filter(Boolean).join(' - ') || 'No especificada'}>
                  {[rental.project_name, rental.location].filter(Boolean).join(' - ') || 'No especificada'}
                </p>
              </div>
            </div>

            {/* Estado de Pago */}
            <div className="p-4 bg-white border border-zinc-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${paymentConfig.bg}`}>
                  <CreditCard className={paymentConfig.text} size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Estado de Pago</p>
                  <p className={`text-sm font-bold ${paymentConfig.text}`}>{paymentConfig.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Mensual</p>
                <p className="text-xl font-black text-zinc-900">${totalMonthly.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Equipos */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2 flex items-center gap-2">
                <Box size={16} className="text-zinc-400" /> Equipos Rentados ({items.length})
              </h3>
              
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic py-4 text-center">No hay equipos registrados en esta renta.</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-zinc-100 bg-white hover:border-zinc-200 transition-colors flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-zinc-900">{item.equipment_description}</p>
                        <p className="text-xs text-zinc-500">Cantidad: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-zinc-900">${Number(item.monthly_total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}/mes</p>
                        <p className="text-[10px] text-zinc-400">IVA incl.</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Footer - Actions */}
          {rental.status === 'active' && (
            <div className="p-6 border-t border-zinc-100 bg-zinc-50 shrink-0 flex gap-4">
              <button
                onClick={() => onCancelContract && onCancelContract(rental.id)}
                className="flex-1 py-3 px-4 bg-white border border-rose-200 text-rose-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-50 transition-all"
              >
                <XCircle size={18} />
                Cancelar Contrato
              </button>
              <button
                onClick={() => onFinalizeRental && onFinalizeRental(rental.id)}
                className="flex-1 py-3 px-4 bg-zinc-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-900/20"
              >
                <CheckCircle2 size={18} />
                Finalizar Renta
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
