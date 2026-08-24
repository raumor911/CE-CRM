import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, ProductType, ProductCondition, ProductLocation, ProductOperationalStatus, Rental, ProductRegistrationData } from '../../types';
import { useRentals, RentalWithItems } from '../../hooks/useRentals';
import { cn } from '../../lib/utils';

interface RentalClientGroup {
  key: string;
  customerName: string;
  customerPhone: string | null;
  rentals: RentalWithItems[];
}

interface ProductRegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (data: ProductRegistrationData) => Promise<Product>;
}

export const ProductRegistrationForm: React.FC<ProductRegistrationFormProps> = ({ isOpen, onClose, onRegister }) => {
  const { rentals, loading: rentalsLoading, fetchRentals } = useRentals();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    product_type: '' as ProductType | '',
    physical_number: '',
    condition: 'Nuevo' as ProductCondition,
    location: '' as ProductLocation | '',
    location_detail: '',
    operational_status: 'Disponible' as ProductOperationalStatus,
    available_for_sale: false,
    available_for_rent: false,
    available_for_modification: false,
    notes: ''
  });

  const [selectedClientKey, setSelectedClientKey] = useState<string | null>(null);
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);

  // Normalization helpers
  const normalizePhone = (phone?: string | null) => (phone || '').replace(/\D/g, '');
  const normalizeName = (name: string) =>
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('es-MX');

  // Fetch rentals when status is "Rentada"
  useEffect(() => {
    if (formData.operational_status === 'Rentada' && rentals.length === 0) {
      fetchRentals();
    }

    if (formData.operational_status !== 'Rentada') {
      setSelectedClientKey(null);
      setSelectedRentalId(null);
    }
  }, [formData.operational_status, fetchRentals, rentals.length]);

  // Group rentals by client
  const clientGroups = React.useMemo(() => {
    const activeRentals = rentals.filter(r => r.status === 'active');
    const groups: Map<string, RentalClientGroup> = new Map();

    activeRentals.forEach(rental => {
      const phone = normalizePhone(rental.customer_phone);
      const name = normalizeName(rental.customer_name);
      const key = phone ? `phone:${phone}` : `name:${name}`;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          customerName: rental.customer_name,
          customerPhone: rental.customer_phone,
          rentals: []
        });
      }
      groups.get(key)!.rentals.push(rental);
    });

    return Array.from(groups.values()).sort((a, b) => 
      a.customerName.localeCompare(b.customerName, 'es-MX')
    );
  }, [rentals]);

  // Reset form when product type changes to ensure valid options
  useEffect(() => {
    if (formData.product_type === 'Oficina') {
      if (formData.location === 'Taller' || formData.location === 'Otra ubicación') {
        setFormData(prev => ({ ...prev, location: '' }));
      }
      if (formData.operational_status === 'En modificación') {
        setFormData(prev => ({ ...prev, operational_status: 'Disponible' }));
      }
    }
  }, [formData.product_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!formData.product_type) {
      setError('El tipo de producto es obligatorio');
      return;
    }
    if (!formData.location) {
      setError('La ubicación es obligatoria');
      return;
    }
    if (formData.location === 'Otra ubicación' && !formData.location_detail.trim()) {
      setError('El detalle de ubicación es obligatorio para "Otra ubicación"');
      return;
    }
    if (!formData.available_for_sale && !formData.available_for_rent && !formData.available_for_modification) {
      setError('Debe seleccionar al menos una alternativa comercial (Venta, Renta o Modificación)');
      return;
    }

    if (formData.operational_status === 'Rentada' && !selectedRentalId) {
      setError('Selecciona el cliente y la renta a la que está asignado el producto');
      return;
    }

    try {
      setLoading(true);
      const result = await onRegister({
        ...formData,
        product_type: formData.product_type as ProductType,
        location: formData.location as ProductLocation,
        rental_id: formData.operational_status === 'Rentada' ? selectedRentalId : null
      });

      const customerName = formData.operational_status === 'Rentada' && selectedClientKey 
        ? clientGroups.find(c => c.key === selectedClientKey)?.customerName 
        : null;

      if (customerName) {
        setSuccess(`Producto ${result.internal_id} registrado y asignado a ${customerName}.`);
      } else {
        setSuccess(`Producto ${result.internal_id} registrado correctamente.`);
      }
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al registrar el producto');
    } finally {
      setLoading(false);
    }
  };

  const productTypes: ProductType[] = ['Oficina', '20 DC', '40 DC', '40 HC'];
  const conditions: ProductCondition[] = ['Nuevo', 'Usado'];
  
  const getLocations = (): ProductLocation[] => {
    if (formData.product_type === 'Oficina') {
      return ['Patio principal', 'Instalaciones del cliente'];
    }
    return ['Patio principal', 'Taller', 'Instalaciones del cliente', 'Otra ubicación'];
  };

  const getStatuses = (): ProductOperationalStatus[] => {
    if (formData.product_type === 'Oficina') {
      return ['Disponible', 'Reservada', 'Rentada'];
    }
    return ['Disponible', 'Reservada', 'Rentada', 'En modificación'];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registrar producto</h2>
            <p className="text-xs text-slate-500 font-medium">Alta manual de activos al inventario</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 text-sm font-medium"
            >
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-600 text-sm font-medium"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              {success}
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo de Producto */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Tipo de producto *</label>
              <select
                required
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value as ProductType })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              >
                <option value="" disabled>Seleccionar tipo...</option>
                {productTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Identificador Interno */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Identificador interno</label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value="Se generará al registrar"
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-400 font-medium cursor-not-allowed italic"
                />
                <Info size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
            </div>

            {/* Número Físico */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Número físico</label>
              <input
                type="text"
                value={formData.physical_number}
                onChange={(e) => setFormData({ ...formData, physical_number: e.target.value })}
                placeholder="Número marítimo o placa..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>

            {/* Condición */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Condición *</label>
              <div className="flex gap-2">
                {conditions.map(cond => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setFormData({ ...formData, condition: cond })}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border",
                      formData.condition === cond
                        ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
                        : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Ubicación *</label>
              <select
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value as ProductLocation })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              >
                <option value="" disabled>Seleccionar ubicación...</option>
                {getLocations().map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Estado Operativo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Estado operativo *</label>
              <select
                required
                value={formData.operational_status}
                onChange={(e) => setFormData({ ...formData, operational_status: e.target.value as ProductOperationalStatus })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              >
                {getStatuses().map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Asignación de Cliente (Condicional) */}
          <AnimatePresence>
            {formData.operational_status === 'Rentada' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Asignar a cliente *</label>
                  
                  {rentalsLoading ? (
                    <div className="flex items-center gap-2 py-4 text-slate-400 italic text-sm">
                      <Loader2 size={16} className="animate-spin" />
                      Consultando clientes con rentas activas...
                    </div>
                  ) : clientGroups.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm">
                      No existen clientes con rentas activas. Registra o activa la renta antes de asignar el producto.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {clientGroups.map(client => (
                        <button
                          key={client.key}
                          type="button"
                          onClick={() => {
                            setSelectedClientKey(client.key);
                            if (client.rentals.length === 1) {
                              setSelectedRentalId(client.rentals[0].id);
                            } else {
                              setSelectedRentalId(null);
                            }
                          }}
                          className={cn(
                            "p-3 rounded-xl border text-left transition-all relative group",
                            selectedClientKey === client.key
                              ? "bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-500/10"
                              : "bg-white border-slate-200 hover:border-slate-300"
                          )}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className={cn(
                              "text-sm font-black uppercase tracking-tight",
                              selectedClientKey === client.key ? "text-indigo-700" : "text-slate-700"
                            )}>
                              {client.customerName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {client.customerPhone && `${client.customerPhone} · `}
                              {client.rentals.length} {client.rentals.length === 1 ? 'renta activa' : 'rentas activas'}
                            </span>
                          </div>
                          {selectedClientKey === client.key && (
                            <div className="absolute top-2 right-2 text-indigo-600">
                              <CheckCircle2 size={16} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selección de Renta (si el cliente tiene varias) */}
                <AnimatePresence>
                  {selectedClientKey && (clientGroups.find(c => c.key === selectedClientKey)?.rentals.length || 0) > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-3 pt-2"
                    >
                      <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Seleccionar renta *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {clientGroups.find(c => c.key === selectedClientKey)?.rentals.map(rental => (
                          <button
                            key={rental.id}
                            type="button"
                            onClick={() => setSelectedRentalId(rental.id)}
                            className={cn(
                              "p-3 rounded-xl border text-left transition-all relative",
                              selectedRentalId === rental.id
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600"
                            )}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-black uppercase tracking-tight">
                                Renta {clientGroups.find(c => c.key === selectedClientKey)?.rentals.indexOf(rental)! + 1}
                              </span>
                              <div className={cn(
                                "text-[10px] font-medium flex flex-col",
                                selectedRentalId === rental.id ? "text-indigo-100" : "text-slate-400"
                              )}>
                                <span>Inicio: {rental.start_date}</span>
                                <span>Vencimiento: {rental.contractual_end_date}</span>
                                <span>{rental.items?.length || 0} {rental.items?.length === 1 ? 'producto' : 'productos'}</span>
                              </div>
                            </div>
                            {selectedRentalId === rental.id && (
                              <div className="absolute top-2 right-2 text-white">
                                <CheckCircle2 size={16} />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detalle de Ubicación (Condicional) */}
          <AnimatePresence>
            {(formData.location === 'Otra ubicación' || formData.location === 'Instalaciones del cliente') && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1.5"
              >
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  Detalle de ubicación {formData.location === 'Otra ubicación' ? '*' : '(Opcional)'}
                </label>
                <input
                  type="text"
                  required={formData.location === 'Otra ubicación'}
                  value={formData.location_detail}
                  onChange={(e) => setFormData({ ...formData, location_detail: e.target.value })}
                  placeholder={formData.location === 'Otra ubicación' ? "Especificar ubicación exacta..." : "Ej. Obra León, Guanajuato..."}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Alternativas Comerciales */}
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Alternativas comerciales *</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'available_for_sale', label: 'Venta' },
                { id: 'available_for_rent', label: 'Renta' },
                { id: 'available_for_modification', label: 'Modificación' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, [opt.id]: !formData[opt.id as keyof typeof formData] })}
                  className={cn(
                    "px-4 py-3 rounded-xl border text-[11px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2",
                    formData[opt.id as keyof typeof formData]
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                  )}
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors",
                    formData[opt.id as keyof typeof formData] ? "bg-white border-white text-indigo-600" : "bg-slate-50 border-slate-200"
                  )}>
                    {formData[opt.id as keyof typeof formData] && <CheckCircle2 size={10} strokeWidth={3} />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Notas</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Información complementaria (piso, puertas, limpieza...)"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !!success}
            className={cn(
              "px-8 py-2.5 bg-indigo-600 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2",
              (loading || !!success) ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700 active:scale-95"
            )}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Registrando...
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={16} />
                Registrado
              </>
            ) : (
              <>
                <Save size={16} />
                Registrar producto
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
