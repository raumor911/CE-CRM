import React, { useState, useMemo, useEffect } from 'react';
import { useRentals, RentalWithItems } from '../hooks/useRentals';
import { 
  Building2, 
  Calendar, 
  AlertTriangle, 
  DollarSign,
  Search,
  MoreVertical,
  CheckCircle2,
  MapPin,
  MessageCircle,
  FileText,
  CreditCard,
  Filter,
  Eye,
  Edit2,
  Package,
  XCircle,
  CalendarClock,
  Clock,
  Phone
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';

// Date utility to avoid timezone shifts
const parseLocalDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  return new Date(year, month - 1, day);
};

const formatLocalDate = (dateStr?: string | null): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return 'Sin registrar';
  return format(date, 'dd/MM/yyyy');
};

const formatShortDate = (dateStr?: string | null): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return '-';
  return format(date, 'dd MMM', { locale: es });
};

export const RentalsView: React.FC = () => {
  const { rentals, loading, fetchRentals } = useRentals();
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [attentionTab, setAttentionTab] = useState<'todas' | 'criticas' | 'proximas'>('todas');
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const { 
    activeCount, 
    expiring15DaysCount,
    immediateExpiringCount,
    expiredCount, 
    pendingPaymentsCount,
    totalMonthlyWithVAT,
    alerts,
    upcomingExpirations
  } = useMemo(() => {
    const today = startOfDay(new Date());
    let active = 0;
    let expiring15 = 0;
    let immediateExpiring = 0;
    let expired = 0;
    let pendingPayments = 0;
    let totalVAT = 0;

    const generatedAlerts: any[] = [];
    const expirations: any[] = [];

    rentals.forEach(rental => {
      const isRentalActive = rental.status === 'active';
      
      if (isRentalActive) {
        active++;
        
        // Calcular total mensual
        const rentalTotal = rental.monthly_amount_total || rental.items?.reduce((sum, item) => sum + (Number(item.monthly_total) || 0), 0) || 0;
        totalVAT += Number(rentalTotal);

        let diffDays = null;
        if (rental.contractual_end_date) {
          const endDate = parseLocalDate(rental.contractual_end_date);
          if (endDate) {
            diffDays = differenceInDays(endDate, today);

            if (diffDays < 0) {
              expired++;
              generatedAlerts.push({
                rentalId: rental.id,
                client: rental.customer_name,
                reason: 'Contrato vencido',
                date: formatLocalDate(rental.contractual_end_date),
                updated: formatLocalDate(rental.updated_at),
                action: 'Actualizar vigencia',
                isCritical: true,
                isUpcoming: false
              });
            } else if (diffDays >= 0 && diffDays <= 7) {
              immediateExpiring++;
              generatedAlerts.push({
                rentalId: rental.id,
                client: rental.customer_name,
                reason: `Vence en ${diffDays} días`,
                date: formatLocalDate(rental.contractual_end_date),
                updated: formatLocalDate(rental.updated_at),
                action: 'Renovar',
                isCritical: true,
                isUpcoming: false
              });
            } else if (diffDays >= 8 && diffDays <= 15) {
              expiring15++;
              generatedAlerts.push({
                rentalId: rental.id,
                client: rental.customer_name,
                reason: `Vence en ${diffDays} días`,
                date: formatLocalDate(rental.contractual_end_date),
                updated: formatLocalDate(rental.updated_at),
                action: 'Renovar',
                isCritical: false,
                isUpcoming: true
              });
            }

            if (diffDays >= 0) {
              expirations.push({
                rentalId: rental.id,
                client: rental.customer_name,
                amount: rentalTotal,
                date: endDate,
                days: diffDays,
                urgency: diffDays <= 7 ? 'red' : diffDays <= 15 ? 'orange' : 'yellow'
              });
            }
          }
        }

        if (rental.payment_status === 'pending_confirmation') {
          pendingPayments++;
          generatedAlerts.push({
            rentalId: rental.id,
            client: rental.customer_name,
            reason: 'Pago por confirmar',
            date: '-',
            updated: formatLocalDate(rental.updated_at),
            action: 'Validar pago',
            isCritical: true,
            isUpcoming: false
          });
        }

        if (rental.historical_missing_end_date) {
          generatedAlerts.push({
            rentalId: rental.id,
            client: rental.customer_name,
            reason: 'Sin fecha contractual',
            date: '-',
            updated: formatLocalDate(rental.updated_at),
            action: 'Agregar fecha',
            isCritical: false,
            isUpcoming: false
          });
        }

        if (!rental.customer_phone) {
          generatedAlerts.push({
            rentalId: rental.id,
            client: rental.customer_name,
            reason: 'Teléfono ausente',
            date: '-',
            updated: formatLocalDate(rental.updated_at),
            action: 'Agregar teléfono',
            isCritical: false,
            isUpcoming: false
          });
        }

        if (!rental.contract_reference_url) {
          generatedAlerts.push({
            rentalId: rental.id,
            client: rental.customer_name,
            reason: 'Contrato sin enlace',
            date: '-',
            updated: formatLocalDate(rental.updated_at),
            action: 'Agregar enlace',
            isCritical: false,
            isUpcoming: false
          });
        }
      }
    });

    // Ordenar expiraciones ascendente
    expirations.sort((a, b) => a.date.getTime() - b.date.getTime());

    return { 
      activeCount: active, 
      expiring15DaysCount: expiring15, 
      immediateExpiringCount: immediateExpiring,
      expiredCount: expired, 
      pendingPaymentsCount: pendingPayments,
      totalMonthlyWithVAT: totalVAT,
      alerts: generatedAlerts,
      upcomingExpirations: expirations.slice(0, 5)
    };
  }, [rentals]);

  // Filtrado de Alertas
  const filteredAlerts = useMemo(() => {
    if (attentionTab === 'criticas') return alerts.filter(a => a.isCritical);
    if (attentionTab === 'proximas') return alerts.filter(a => a.isUpcoming);
    return alerts;
  }, [alerts, attentionTab]);

  const criticalCount = alerts.filter(a => a.isCritical).length;
  const upcomingCount = alerts.filter(a => a.isUpcoming).length;

  // Filtrado de Rentas Principal
  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      if (statusFilter !== 'all' && rental.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && rental.payment_status !== paymentFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          rental.customer_name?.toLowerCase().includes(q) ||
          rental.customer_phone?.toLowerCase().includes(q) ||
          rental.contact_name?.toLowerCase().includes(q) ||
          rental.project_name?.toLowerCase().includes(q) ||
          rental.location?.toLowerCase().includes(q) ||
          rental.items?.some(item => item.equipment_description?.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [rentals, searchQuery, statusFilter, paymentFilter]);

  const selectedRental = useMemo(() => {
    return rentals.find(r => r.id === selectedRentalId) || filteredRentals[0] || null;
  }, [rentals, selectedRentalId, filteredRentals]);

  useEffect(() => {
    if (filteredRentals.length > 0 && !selectedRentalId) {
      setSelectedRentalId(filteredRentals[0].id);
    }
  }, [filteredRentals, selectedRentalId]);

  const calculateTotal = (rental: RentalWithItems) => {
    if (rental.monthly_amount_total) return Number(rental.monthly_amount_total);
    if (!rental.items || rental.items.length === 0) return 0;
    return rental.items.reduce((sum, item) => sum + (Number(item.monthly_total) || 0), 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Activa';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'text-green-700 bg-green-50 ring-green-600/20';
      case 'pending_confirmation': return 'text-amber-700 bg-amber-50 ring-amber-600/20';
      default: return 'text-gray-700 bg-gray-50 ring-gray-600/20';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'current': return 'Al corriente';
      case 'pending_confirmation': return 'Pendiente';
      default: return status;
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 min-h-screen font-sans text-gray-900">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        
        {/* Top KPI Bar - Grid 5 columnas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard title="Rentas activas" value={activeCount.toString()} icon={<Building2 className="w-3.5 h-3.5 text-blue-600" />} color="blue" />
          <KpiCard title="Vencen en 15 días" value={expiring15DaysCount.toString()} icon={<Calendar className="w-3.5 h-3.5 text-orange-600" />} color="orange" />
          <KpiCard title="Rentas vencidas" value={expiredCount.toString()} icon={<AlertTriangle className="w-3.5 h-3.5 text-red-600" />} color="red" />
          <KpiCard title="Pagos por confirmar" value={pendingPaymentsCount.toString()} icon={<CreditCard className="w-3.5 h-3.5 text-amber-600" />} color="amber" />
          <KpiCard title="Valor mensual activo" value={formatCurrency(totalMonthlyWithVAT)} icon={<DollarSign className="w-3.5 h-3.5 text-green-600" />} color="green" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (2/3) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Sección 1: Atención requerida */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-gray-100 px-4 pt-3">
                <h2 className="text-sm font-semibold text-gray-900">Atención requerida</h2>
                <div className="flex gap-4 mt-3">
                  <button onClick={() => setAttentionTab('todas')} className={`text-[11px] font-medium pb-2 border-b-2 transition-colors ${attentionTab === 'todas' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Todas ({alerts.length})</button>
                  <button onClick={() => setAttentionTab('criticas')} className={`text-[11px] font-medium pb-2 border-b-2 transition-colors ${attentionTab === 'criticas' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Críticas ({criticalCount})</button>
                  <button onClick={() => setAttentionTab('proximas')} className={`text-[11px] font-medium pb-2 border-b-2 transition-colors ${attentionTab === 'proximas' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Próximas ({upcomingCount})</button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50/50 text-gray-500 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Cliente / Renta</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Motivo</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Fecha límite</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAlerts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-xs">No hay alertas para mostrar en esta categoría.</td>
                      </tr>
                    ) : (
                      filteredAlerts.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedRentalId(item.rentalId)}>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{item.client}</td>
                          <td className={`px-4 py-2.5 font-medium text-[11px] flex items-center gap-1.5 ${item.isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                            {item.isCritical ? <AlertTriangle className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />} {item.reason}
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 text-[11px]">{item.date}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button className="text-[10px] font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                              {item.action}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sección 2: Directorio de Rentas (Tabla Principal) */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-gray-900">Directorio de Rentas</h2>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Buscar cliente, proyecto, equipo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-64 transition-all bg-gray-50 focus:bg-white"
                    />
                  </div>
                  
                  {/* Selectores de Filtro simples en lugar de botón modal complejo para no sobrerepresentar la UI */}
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="py-1.5 pl-2 pr-6 text-[11px] border border-gray-200 rounded-md focus:outline-none bg-white text-gray-700"
                  >
                    <option value="all">Estado: Todos</option>
                    <option value="active">Activas</option>
                    <option value="completed">Completadas</option>
                    <option value="cancelled">Canceladas</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Cliente / Proyecto</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Equipo y cantidad</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Inicio</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Vencimiento</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider text-right">Importe</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Pago</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Última act.</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div><div className="h-2 bg-gray-100 rounded w-1/2"></div></td>
                          <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-16"></div></td>
                          <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-16"></div></td>
                          <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-16"></div></td>
                          <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded-full w-16"></div></td>
                          <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-16"></div></td>
                          <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded-md w-12"></div></td>
                        </tr>
                      ))
                    ) : filteredRentals.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-gray-500">No se encontraron rentas.</td>
                      </tr>
                    ) : (
                      filteredRentals.map((rental) => {
                        const equipmentCount = rental.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
                        return (
                          <tr 
                            key={rental.id} 
                            onClick={() => setSelectedRentalId(rental.id)}
                            className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${selectedRentalId === rental.id ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-500/20' : ''}`}
                          >
                            <td className="px-4 py-2.5">
                              <div className="font-medium text-gray-900 text-xs">{rental.customer_name}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[160px]">
                                {[rental.project_name, rental.location].filter(Boolean).join(' - ') || 'Sin ubicación'}
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                                <Package className="w-3 h-3" />
                                {equipmentCount > 0 ? `${equipmentCount} equipos` : 'Sin equipos'}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 text-[11px]">
                              {formatLocalDate(rental.start_date)}
                            </td>
                            <td className="px-4 py-2.5 text-[11px]">
                              <span className="text-gray-900 font-medium">
                                {formatLocalDate(rental.contractual_end_date)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-gray-900 text-[11px]">
                              {formatCurrency(calculateTotal(rental))}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ring-1 ring-inset ${getPaymentStatusColor(rental.payment_status)}`}>
                                {rental.payment_status === 'current' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                {getPaymentStatusLabel(rental.payment_status)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 text-[10px]">
                              {formatShortDate(rental.updated_at)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(rental.status)}`}>
                                {getStatusLabel(rental.status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px] text-gray-500">
                <span>Mostrando {filteredRentals.length} resultados</span>
              </div>
            </div>

          </div>

          {/* Right Column (1/3) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Próximos Vencimientos */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Próximos vencimientos</h2>
              </div>
              <div className="space-y-4">
                {upcomingExpirations.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No hay vencimientos próximos.</p>
                ) : (
                  upcomingExpirations.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1 -m-1 rounded transition-colors" onClick={() => setSelectedRentalId(item.rentalId)}>
                      <div className="text-right w-12 shrink-0">
                        <p className="text-xs font-semibold text-gray-900">{format(item.date, "dd")}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{format(item.date, "MMM", { locale: es })}</p>
                      </div>
                      <div className="w-[2px] h-8 bg-gray-100 rounded-full relative">
                        <div className={`absolute inset-0 rounded-full opacity-50 ${item.urgency === 'red' ? 'bg-red-500' : item.urgency === 'orange' ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.client}</p>
                        <p className="text-[10px] text-gray-500">{formatCurrency(item.amount)}</p>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border shrink-0 ${
                        item.urgency === 'red' ? 'bg-red-50 text-red-700 border-red-100' :
                        item.urgency === 'orange' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                        'bg-yellow-50 text-yellow-700 border-yellow-100'
                      }`}>
                        {item.days} días
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Panel de Detalle Avanzado */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              {selectedRental ? (
                <>
                  <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(selectedRental.status)}`}>
                        {getStatusLabel(selectedRental.status)}
                      </span>
                      <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h2 className="text-sm font-semibold text-gray-900 leading-tight">{selectedRental.customer_name}</h2>
                    <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> {[selectedRental.project_name, selectedRental.location].filter(Boolean).join(' - ') || 'Sin ubicación'}
                    </p>
                    {selectedRental.customer_phone && (
                      <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {selectedRental.customer_phone}
                      </p>
                    )}
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto space-y-5 text-sm">
                    
                    {/* Detalles Operativos */}
                    <div className="grid grid-cols-2 gap-y-3 text-[11px]">
                      <div>
                        <p className="text-gray-500">Inicio</p>
                        <p className="font-medium text-gray-900">{formatLocalDate(selectedRental.start_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Vencimiento</p>
                        <p className="font-medium text-gray-900">{formatLocalDate(selectedRental.contractual_end_date)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Importe</p>
                        <p className="font-medium text-gray-900">{formatCurrency(calculateTotal(selectedRental))}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Pago</p>
                        <p className="font-medium text-gray-900">{getPaymentStatusLabel(selectedRental.payment_status)}</p>
                      </div>
                    </div>

                    {/* Equipos */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Equipos asignados</p>
                      {selectedRental.items && selectedRental.items.length > 0 ? (
                        <div className="space-y-2">
                          {selectedRental.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded border border-gray-100">
                              <span className="text-xs font-medium text-gray-700 truncate">{item.equipment_description || 'Equipo'}</span>
                              <span className="text-[10px] text-gray-500 bg-white px-1.5 rounded border border-gray-200">Cant: {item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No hay equipos asignados</p>
                      )}
                    </div>

                    {/* Acciones (Renderizadas condicionalmente si hay teléfono/activa) */}
                    <div className="border-t border-gray-100 pt-4">
                      {selectedRental.customer_phone && (
                        <div className="space-y-2 mb-2">
                          <button className="w-full py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                            <MessageCircle className="w-3.5 h-3.5" /> Abrir WhatsApp
                          </button>
                        </div>
                      )}
                      
                      {selectedRental.status === 'active' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button className="py-1.5 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 text-[11px] font-medium rounded-md transition-colors">
                            Renovar
                          </button>
                          <button className="py-1.5 bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 text-[11px] font-medium rounded-md transition-colors">
                            <XCircle className="w-3.5 h-3.5 inline mr-1" /> Finalizar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Referencias Externas */}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Referencias externas</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors group">
                          <div className="flex items-center gap-2 text-[11px] text-gray-600">
                            <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" /> Contrato
                          </div>
                          {selectedRental.contract_reference_url ? (
                            <a href={selectedRental.contract_reference_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                              Abrir documento
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No enlazado</span>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </>
              ) : (
                <div className="p-6 text-center flex-1 flex flex-col items-center justify-center text-gray-500">
                  <Building2 className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-xs">Selecciona una renta</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Componente KpiCard Refactorizado
const KpiCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: 'blue' | 'orange' | 'red' | 'amber' | 'gray' | 'green' }) => {
  const colorMap = {
    blue: 'bg-white border-gray-200',
    orange: 'bg-white border-gray-200',
    red: 'bg-white border-gray-200',
    amber: 'bg-white border-gray-200',
    gray: 'bg-white border-gray-200',
    green: 'bg-white border-gray-200',
  };

  const iconBgMap = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className={`p-2.5 rounded-lg border shadow-sm flex items-center gap-2.5 transition-colors ${colorMap[color]}`}>
      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${iconBgMap[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-medium leading-tight truncate">{title}</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
};
