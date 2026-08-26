import React from 'react';
import { X, Edit3, MapPin, Calendar, Clock, Package, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../../types';
import { formatLocalDate, cn } from '../../lib/utils';

interface ProductDetailPanelProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onOpenRental?: (rentalId: string) => void;
}

export const ProductDetailPanel: React.FC<ProductDetailPanelProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onOpenRental
}) => {
  if (!product) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Disponible':
        return { bg: 'bg-emerald-500/10', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Disponible' };
      case 'Reservada':
      case 'Reservado':
        return { bg: 'bg-amber-500/10', text: 'text-amber-700', border: 'border-amber-200', label: 'Reservada' };
      case 'Rentada':
      case 'Rentado':
        return { bg: 'bg-blue-500/10', text: 'text-blue-700', border: 'border-blue-200', label: 'Rentada' };
      case 'En modificación':
        return { bg: 'bg-purple-500/10', text: 'text-purple-700', border: 'border-purple-200', label: 'En modificación' };
      default:
        return { bg: 'bg-zinc-500/10', text: 'text-zinc-700', border: 'border-zinc-200', label: status };
    }
  };

  const statusConfig = getStatusConfig(product.operational_status);

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: any }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      <p className="text-sm font-semibold text-zinc-900">{value || 'Sin registrar'}</p>
    </div>
  );

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
            className="fixed right-0 top-0 h-full w-full lg:w-[450px] bg-white border-l border-zinc-200 shadow-2xl z-[100] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex items-start justify-between bg-white shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">{product.internal_id}</h2>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm",
                    statusConfig.bg,
                    statusConfig.text,
                    statusConfig.border
                  )}>
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-500">{product.product_type}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Información General */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-zinc-100 pb-2">
                  Información General
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <InfoRow label="Número físico" value={product.physical_number} icon={Package} />
                  <InfoRow label="Condición" value={product.condition} />
                  <InfoRow label="Ubicación" value={product.location} icon={MapPin} />
                  <InfoRow label="Detalle de ubicación" value={product.location_detail} />
                  <InfoRow label="Fecha de registro" value={product.created_at ? formatLocalDate(product.created_at) : 'Sin registrar'} icon={Calendar} />
                  <InfoRow label="Última actualización" value={product.updated_at ? formatLocalDate(product.updated_at) : 'Sin registrar'} icon={Clock} />
                </div>
              </div>

              {/* Alternativas Comerciales */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-zinc-100 pb-2">
                  Alternativas Comerciales
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'sale', label: 'Venta', active: product.available_for_sale },
                    { id: 'rent', label: 'Renta', active: product.available_for_rent },
                    { id: 'modification', label: 'Modificación', active: product.available_for_modification }
                  ].map(alt => (
                    <div
                      key={alt.id}
                      className={cn(
                        "px-4 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-tight flex items-center gap-2 transition-all",
                        alt.active
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                          : "bg-zinc-50 border-zinc-100 text-zinc-300"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                        alt.active ? "bg-indigo-600 text-white" : "bg-zinc-200 text-zinc-400"
                      )}>
                        <CheckCircle2 size={10} strokeWidth={3} />
                      </div>
                      {alt.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Asignación Actual (solo si está rentada) */}
              {(product.operational_status === 'Rentada' || product.operational_status === 'Rentado') && (
                <div className="space-y-4">
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-zinc-100 pb-2">
                    Asignación Actual
                  </h3>
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <InfoRow label="Cliente" value={product.active_assignment?.rental?.customer_name} />
                      <InfoRow label="Proyecto" value={product.active_assignment?.rental?.project_name} />
                      <InfoRow label="Asignada desde" value={product.active_assignment?.assigned_at ? formatLocalDate(product.active_assignment.assigned_at) : 'Sin registrar'} />
                    </div>
                    {product.active_assignment?.rental_id && (
                      <button
                        onClick={() => onOpenRental?.(product.active_assignment!.rental_id)}
                        className="w-full py-2.5 bg-white border border-blue-200 text-blue-700 text-xs font-bold rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        Ver renta
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Notas */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest border-b border-zinc-100 pb-2">
                  Notas
                </h3>
                <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-2xl">
                  <p className={cn(
                    "text-sm font-medium",
                    product.notes ? "text-zinc-700" : "text-zinc-400 italic"
                  )}>
                    {product.notes || 'Sin notas registradas'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 shrink-0">
              <button
                onClick={() => onEdit(product)}
                className="w-full py-3 bg-white border border-zinc-200 text-slate-900 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Edit3 size={18} />
                Editar producto
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
