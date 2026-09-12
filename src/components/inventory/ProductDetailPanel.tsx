import React, { useState, useEffect } from 'react';
import { X, Edit3, MapPin, Calendar, Clock, Package, CheckCircle2, ArrowRight, Save, Undo2, Loader2, History as HistoryIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, ProductType, ProductCondition, ProductLocation, ProductOperationalStatus } from '../../types';
import { formatLocalDate, cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface ProductDetailPanelProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: Product) => void; // Cambiado a opcional ya que manejamos la edición internamente
  onUpdate?: (updatedProduct: Product) => void;
  onOpenRental?: (rentalId: string) => void;
}

export const ProductDetailPanel: React.FC<ProductDetailPanelProps> = ({
  product,
  isOpen,
  onClose,
  onUpdate,
  onOpenRental
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFiltersData] = useState<Partial<Product>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingActivities] = useState(false);

  useEffect(() => {
    if (product) {
      setFiltersData(product);
      setIsEditing(false);
      setShowHistory(false);
    }
  }, [product]);

  const fetchHistory = async () => {
    if (!product) return;
    setIsLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('inventory_activities')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching inventory history:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      fetchHistory();
    }
  }, [showHistory, product?.id]);

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
      case 'Vendido':
        return { bg: 'bg-zinc-900/10', text: 'text-zinc-900', border: 'border-zinc-300', label: 'Vendido' };
      case 'Mantenimiento':
        return { bg: 'bg-purple-500/10', text: 'text-purple-700', border: 'border-purple-200', label: 'Mantenimiento' };
      case 'Fuera de servicio':
        return { bg: 'bg-rose-500/10', text: 'text-rose-700', border: 'border-rose-200', label: 'Fuera de servicio' };
      case 'En retorno':
        return { bg: 'bg-indigo-500/10', text: 'text-indigo-700', border: 'border-indigo-200', label: 'En retorno' };
      case 'Inspección':
        return { bg: 'bg-orange-500/10', text: 'text-orange-700', border: 'border-orange-200', label: 'Inspección' };
      default:
        return { bg: 'bg-zinc-500/10', text: 'text-zinc-700', border: 'border-zinc-200', label: status };
    }
  };

  const handleUpdateStatus = async (newStatus: ProductOperationalStatus, newLocation?: ProductLocation) => {
    if (!product || isSaving) return;
    setIsSaving(true);
    try {
      const updates: any = {
        operational_status: newStatus,
        updated_at: new Date().toISOString()
      };
      if (newLocation) updates.location = newLocation;

      const { data, error } = await supabase
        .from('inventory_products')
        .update(updates)
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;

      // Si el nuevo estado es Disponible, liberar cualquier asignación activa
      if (newStatus === 'Disponible') {
        await supabase
          .from('rental_inventory_assignments')
          .update({ released_at: new Date().toISOString() })
          .eq('inventory_product_id', product.id)
          .is('released_at', null);
      }

      // Registrar actividad
      await supabase.from('inventory_activities').insert([{
        product_id: product.id,
        activity_type: 'status_change',
        description: `Estado cambiado de ${product.operational_status} a ${newStatus}${newLocation ? ` (Ubicación: ${newLocation})` : ''}`,
        created_by: user?.id
      }]);

      onUpdate?.(data);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado del producto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!product || isSaving) return;

    // Regla de integridad: No cambiar de Rentado a Disponible si hay asignación activa
    if (product.operational_status === 'Rentada' && formData.operational_status === 'Disponible') {
      alert(`Este producto está asociado a la renta ${product.active_assignment?.rental_id || 'activa'}.\nFinaliza o cancela la renta para cambiar su disponibilidad.`);
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('inventory_products')
        .update(updates)
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;

      // Registrar en historial (Esto debería hacerlo un trigger, pero lo hacemos manual por ahora para visibilidad inmediata)
      // En un sistema real, compararíamos formData con product para registrar solo lo que cambió
      
      onUpdate?.(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error al actualizar el producto. Intenta de nuevo.');
    } finally {
      setIsSaving(true); // Se queda en true hasta que el componente reaccione al cambio de product prop
      setIsSaving(false);
    }
  };

  const statusConfig = getStatusConfig(product.operational_status);

  const InfoRow = ({ label, value, icon: Icon }: { label: string; value: string | React.ReactNode; icon?: any }) => (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </span>
      <div className="text-sm font-semibold text-zinc-900">{value || 'Sin registrar'}</div>
    </div>
  );

  const productTypes: ProductType[] = ['Oficina', '20 DC', '40 DC', '40 HC'];
  const conditions: ProductCondition[] = ['Nuevo', 'Excelente', 'Bueno', 'Regular', 'Requiere reparación'];
  const locations: ProductLocation[] = ['Patio principal', 'Taller', 'Cliente', 'En traslado', 'Proveedor', 'Otra ubicación'];
  const operationalStatuses: ProductOperationalStatus[] = ['Disponible', 'Reservada', 'Rentada', 'Vendido', 'Mantenimiento', 'Fuera de servicio', 'En retorno', 'Inspección'];

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
            {/* Header Desktop */}
            <div className="hidden lg:flex p-6 border-b border-zinc-100 items-center justify-between bg-white shrink-0">
              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {isEditing ? 'EDITAR PRODUCTO' : product.internal_id}
                </h2>
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {product.product_type}
                    </span>
                    <span className="text-zinc-300">•</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      statusConfig.text
                    )}>
                      {statusConfig.label}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Header Mobile */}
            <div className="lg:hidden p-4 border-b border-zinc-100 flex flex-col bg-white shrink-0 safe-top space-y-4">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors self-start py-2"
              >
                <Undo2 size={20} />
                <span className="text-sm font-black uppercase tracking-widest">Inventario</span>
              </button>
              
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {isEditing ? 'EDITAR PRODUCTO' : product.internal_id}
                  </h2>
                  {!isEditing && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {product.product_type}
                      </span>
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <span className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                    statusConfig.bg,
                    statusConfig.text,
                    statusConfig.border
                  )}>
                    {statusConfig.label}
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-10 scrollbar-hide pb-32 lg:pb-6">
              {isEditing ? (
                /* MODO EDICIÓN */
                <div className="space-y-8 max-w-2xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Tipo</label>
                      <select
                        value={formData.product_type}
                        onChange={e => setFiltersData({ ...formData, product_type: e.target.value as ProductType })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                      >
                        {productTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Estado</label>
                      <select
                        value={formData.operational_status}
                        onChange={e => setFiltersData({ ...formData, operational_status: e.target.value as ProductOperationalStatus })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                      >
                        {operationalStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-zinc-100 pb-3">
                      Información General
                    </h3>
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Número físico</label>
                        <input
                          type="text"
                          value={formData.physical_number || ''}
                          onChange={e => setFiltersData({ ...formData, physical_number: e.target.value })}
                          placeholder="ABCU1234567"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Condición</label>
                          <select
                            value={formData.condition}
                            onChange={e => setFiltersData({ ...formData, condition: e.target.value as ProductCondition })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                          >
                            {conditions.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Ubicación</label>
                          <select
                            value={formData.location}
                            onChange={e => setFiltersData({ ...formData, location: e.target.value as ProductLocation })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                          >
                            {locations.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Detalle de ubicación</label>
                        <input
                          type="text"
                          value={formData.location_detail || ''}
                          onChange={e => setFiltersData({ ...formData, location_detail: e.target.value })}
                          placeholder="Zona B / posición 04"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-base font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-zinc-100 pb-3">
                      Alternativas Comerciales
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {[
                        { id: 'sale', label: 'Venta', active: formData.available_for_sale, field: 'available_for_sale' },
                        { id: 'rent', label: 'Renta', active: formData.available_for_rent, field: 'available_for_rent' },
                        { id: 'mod', label: 'Modificación', active: formData.available_for_modification, field: 'available_for_modification' }
                      ].map(alt => (
                        <button
                          key={alt.id}
                          onClick={() => setFiltersData({ ...formData, [alt.field as keyof Product]: !alt.active })}
                          className={cn(
                            "flex items-center justify-between px-6 py-5 rounded-3xl border transition-all active:scale-[0.98]",
                            alt.active ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-100 text-zinc-400 shadow-sm"
                          )}
                        >
                          <span className="text-xs font-black uppercase tracking-wider">{alt.label}</span>
                          <div className={cn(
                            "w-12 h-7 rounded-full relative transition-colors",
                            alt.active ? "bg-white/20" : "bg-zinc-200"
                          )}>
                            <div className={cn(
                              "absolute top-1 w-5 h-5 rounded-full shadow-sm transition-all",
                              alt.active ? "right-1 bg-white" : "left-1 bg-white"
                            )} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6 pb-20">
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] border-b border-zinc-100 pb-3">
                      Notas
                    </h3>
                    <textarea
                      value={formData.notes || ''}
                      onChange={e => setFiltersData({ ...formData, notes: e.target.value })}
                      placeholder="Agrega notas sobre el estado o características..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-5 text-base font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none min-h-[150px] resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* MODO CONSULTA */
                <div className="space-y-12 max-w-2xl mx-auto">
                  {/* Información General */}
                  <div className="space-y-6">
                    <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 pb-3">
                      Información General
                    </h3>
                    <div className="grid grid-cols-1 gap-8">
                      <div className="grid grid-cols-2 gap-6">
                        <InfoRow label="Número físico" value={product.physical_number} />
                        <InfoRow label="Condición" value={product.condition} />
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <InfoRow label="Ubicación" value={product.location} />
                        <InfoRow label="Detalle de ubicación" value={product.location_detail} />
                      </div>
                      <div className="grid grid-cols-2 gap-6 pt-2">
                        <InfoRow label="Registro" value={product.created_at ? formatLocalDate(product.created_at) : '-'} />
                        <InfoRow label="Actualización" value={product.updated_at ? formatLocalDate(product.updated_at) : '-'} />
                      </div>
                    </div>
                  </div>

                  {/* Alternativas Comerciales */}
                  <div className="space-y-6">
                    <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 pb-3">
                      Alternativas Comerciales
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { id: 'sale', label: 'Venta', active: product.available_for_sale },
                        { id: 'rent', label: 'Renta', active: product.available_for_rent },
                        { id: 'modification', label: 'Modificación', active: product.available_for_modification }
                      ].map(alt => (
                        <div
                          key={alt.id}
                          className={cn(
                            "px-5 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm",
                            alt.active
                              ? "bg-zinc-900 border-zinc-900 text-white"
                              : "bg-zinc-50 border-zinc-100 text-zinc-300"
                          )}
                        >
                          {alt.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Asignación Actual */}
                  {(product.operational_status === 'Rentada' || product.operational_status === 'Rentado') && (
                    <div className="space-y-6">
                      <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 pb-3">
                        Asignación Actual
                      </h3>
                      <div className="p-6 bg-zinc-50 rounded-3xl space-y-6 border border-zinc-100">
                        <div className="grid grid-cols-1 gap-6">
                          <InfoRow label="Cliente" value={product.active_assignment?.rental?.customer_name} />
                          <InfoRow label="Proyecto" value={product.active_assignment?.rental?.project_name} />
                          <InfoRow label="Asignada desde" value={product.active_assignment?.assigned_at ? formatLocalDate(product.active_assignment.assigned_at) : '-'} />
                        </div>
                        {product.active_assignment?.rental_id && (
                          <button
                            onClick={() => onOpenRental?.(product.active_assignment!.rental_id)}
                            className="w-full py-4 bg-white border border-zinc-200 text-zinc-900 text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
                          >
                            Ver contrato de renta
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gestión Operativa */}
                  {(product.operational_status === 'En retorno' || product.operational_status === 'Inspección') && (
                    <div className="space-y-6">
                      <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] border-b border-rose-100 pb-3">
                        Gestión Operativa
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        {product.operational_status === 'En retorno' && (
                          <button
                            onClick={() => handleUpdateStatus('Inspección', 'Taller')}
                            className="flex items-center justify-between px-6 py-5 rounded-3xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all group active:scale-[0.98] shadow-xl shadow-zinc-900/10"
                          >
                            <div className="flex flex-col items-start">
                              <span className="text-xs font-black uppercase tracking-wider">Recibir para inspección</span>
                              <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Mover a Taller</span>
                            </div>
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                          </button>
                        )}
                        {product.operational_status === 'Inspección' && (
                          <button
                            onClick={() => handleUpdateStatus('Disponible', 'Patio principal')}
                            className="flex items-center justify-between px-6 py-5 rounded-3xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all group active:scale-[0.98] shadow-xl shadow-emerald-600/10"
                          >
                            <div className="flex flex-col items-start">
                              <span className="text-xs font-black uppercase tracking-wider">Liberar a Disponible</span>
                              <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Mover a Patio principal</span>
                            </div>
                            <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notas */}
                  <div className="space-y-6">
                    <h3 className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-100 pb-3">
                      Notas
                    </h3>
                    <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 min-h-[100px]">
                      <p className={cn(
                        "text-sm font-bold leading-relaxed",
                        product.notes ? "text-zinc-900" : "text-zinc-300 italic"
                      )}>
                        {product.notes || 'Sin notas registradas'}
                      </p>
                    </div>
                  </div>

                  {/* Historial */}
                  <div className="space-y-6 pb-20">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex items-center gap-2 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] hover:text-zinc-900 transition-colors py-2"
                    >
                      <HistoryIcon size={14} />
                      Bitácora de movimientos {history.length > 0 && `(${history.length})`}
                    </button>
                    
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-6 overflow-hidden"
                        >
                          {isLoadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 size={20} className="animate-spin text-zinc-300" />
                            </div>
                          ) : history.length > 0 ? (
                            <div className="space-y-6 pl-4 border-l-2 border-zinc-100 ml-1">
                              {history.map((h, i) => (
                                <div key={i} className="relative">
                                  <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-zinc-200" />
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                      {formatLocalDate(h.created_at)} • {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-xs font-bold text-zinc-900 tracking-tight leading-snug">{h.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-300 italic pl-2">No hay bitácora disponible.</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 left-0 right-0 p-6 border-t border-zinc-100 bg-white/90 backdrop-blur-xl shrink-0 z-50 safe-bottom">
              {isEditing ? (
                <div className="flex gap-4 max-w-2xl mx-auto">
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="flex-1 py-5 bg-white border border-zinc-200 text-zinc-900 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || JSON.stringify(formData) === JSON.stringify(product)}
                    className="flex-[2] py-5 bg-zinc-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-900/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Guardar Cambios
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full max-w-2xl mx-auto py-5 bg-zinc-900 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-2xl shadow-zinc-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Edit3 size={18} />
                  Editar producto
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
