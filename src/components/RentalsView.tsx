import React, { useState, useMemo, useEffect } from 'react';
import { useRentals, RentalWithItems } from '../hooks/useRentals';
import { 
  Building2, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  Search,
  MoreVertical,
  CheckCircle2,
  MapPin,
  Phone,
  MessageCircle,
  FileText,
  CreditCard,
  ChevronRight,
  Filter,
  Eye,
  Edit2,
  CalendarDays,
  ShieldCheck,
  History,
  ArrowRight,
  Package,
  Activity
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format, differenceInDays, isBefore, startOfDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const RentalsView: React.FC = () => {
  const { rentals, loading, fetchRentals } = useRentals();
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const [attentionTab, setAttentionTab] = useState<'todas' | 'criticas' | 'proximas'>('todas');

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const { 
    activeCount, 
    expiring30DaysCount, 
    expiredCount, 
    pendingPaymentsCount,
    noActionCount,
    totalMonthlyWithVAT 
  } = useMemo(() => {
    const today = startOfDay(new Date());
    let active = 0;
    let expiring30Days = 0;
    let expired = 0;
    let pendingPayments = 0;
    let noAction = 0;
    let totalVAT = 0;

    rentals.forEach(rental => {
      if (rental.status === 'active') {
        active++;
        
        const rentalTotal = rental.items?.reduce((sum, item) => sum + (item.monthly_total || 0), 0) || 0;
        totalVAT += rentalTotal;

        if (rental.contractual_end_date) {
          const endDate = startOfDay(new Date(rental.contractual_end_date));
          const diffDays = differenceInDays(endDate, today);

          if (isBefore(endDate, today)) {
            expired++;
          } else if (diffDays <= 30) {
            expiring30Days++;
          }
        }

        if (rental.payment_status === 'pending_confirmation') {
          pendingPayments++;
        }
        
        // Simulación: 20% de las rentas activas no tienen próxima acción
        if (Math.random() > 0.8) {
          noAction++;
        }
      }
    });

    return { 
      activeCount: active, 
      expiring30DaysCount: expiring30Days, 
      expiredCount: expired, 
      pendingPaymentsCount: pendingPayments,
      noActionCount: noAction,
      totalMonthlyWithVAT: totalVAT 
    };
  }, [rentals]);

  const selectedRental = useMemo(() => {
    return rentals.find(r => r.id === selectedRentalId) || rentals[0];
  }, [rentals, selectedRentalId]);

  useEffect(() => {
    if (rentals.length > 0 && !selectedRentalId) {
      setSelectedRentalId(rentals[0].id);
    }
  }, [rentals, selectedRentalId]);

  const calculateTotal = (items: RentalWithItems['items']) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.monthly_total || 0), 0);
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

  // Datos simulados para paneles de atención y vencimientos
  const mockAttentionRequired = [
    { id: '1', client: 'Constructora Alfa', reason: 'Vence en 7 días', date: '20/10/2026', updated: 'Hoy, 09:30 AM', action: 'Revisar renovación' },
    { id: '2', client: 'Grupo Constructor Sur', reason: 'Falta contrato firmado', date: 'Inmediato', updated: 'Ayer, 16:45', action: 'Solicitar doc' },
    { id: '3', client: 'Desarrollos Inmobiliarios', reason: 'Pago atrasado', date: 'Vencido', updated: 'Hace 2 días', action: 'Recordatorio' },
  ];

  const mockUpcomingExpirations = [
    { id: '1', client: 'Constructora Alfa', amount: 45000, date: addDays(new Date(), 7), days: 7, urgency: 'red' },
    { id: '2', client: 'Edificaciones Modernas', amount: 28500, date: addDays(new Date(), 12), days: 12, urgency: 'orange' },
    { id: '3', client: 'Ingeniería Civil SA', amount: 62000, date: addDays(new Date(), 15), days: 15, urgency: 'orange' },
    { id: '4', client: 'Proyectos Urbanos', amount: 15000, date: addDays(new Date(), 21), days: 21, urgency: 'yellow' },
  ];

  const mockRecentActivity = [
    { id: 1, action: 'Llamada de seguimiento', date: 'Hoy, 10:30 AM', user: 'Ana López' },
    { id: 2, action: 'Factura enviada', date: 'Ayer, 14:15', user: 'Sistema' },
    { id: 3, action: 'Contrato actualizado', date: 'Hace 3 días', user: 'Carlos Ruiz' }
  ];

  return (
    <div className="flex-1 overflow-auto bg-gray-50 min-h-screen font-sans text-gray-900">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        
        {/* Header and KPIs */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">Dashboard de Rentas</h1>
              <p className="text-xs text-gray-500 mt-0.5">Gestión operativa, seguimiento de contratos y estado financiero</p>
            </div>
          </div>

          {/* Top KPI Bar - Muy compactas */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard title="Rentas activas" value={activeCount.toString()} icon={<Building2 className="w-3.5 h-3.5 text-blue-600" />} color="blue" />
            <KpiCard title="Vencen en 30 días" value={expiring30DaysCount.toString()} icon={<Calendar className="w-3.5 h-3.5 text-orange-600" />} color="orange" />
            <KpiCard title="Rentas vencidas" value={expiredCount.toString()} icon={<AlertTriangle className="w-3.5 h-3.5 text-red-600" />} color="red" />
            <KpiCard title="Pagos por confirmar" value={pendingPaymentsCount.toString()} icon={<CreditCard className="w-3.5 h-3.5 text-amber-600" />} color="amber" />
            <KpiCard title="Sin próxima acción" value={noActionCount.toString()} icon={<Clock className="w-3.5 h-3.5 text-gray-600" />} color="gray" />
            <KpiCard title="Valor contractual (Mes)" value={formatCurrency(totalMonthlyWithVAT)} icon={<DollarSign className="w-3.5 h-3.5 text-green-600" />} color="green" />
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between bg-green-50/50 text-green-800 px-4 py-2 rounded-lg border border-green-100 text-[11px]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span className="font-medium">Información revisada hoy.</span>
              <span className="opacity-80 text-gray-600">12 de 12 rentas actualizadas correctamente. Última actualización hace 5 min.</span>
            </div>
            <button className="text-green-700 font-medium hover:text-green-900 flex items-center gap-1 transition-colors">
              Ver historial general <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
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
                  <button onClick={() => setAttentionTab('todas')} className={`text-[11px] font-medium pb-2 border-b-2 transition-colors ${attentionTab === 'todas' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Todas (5)</button>
                  <button onClick={() => setAttentionTab('criticas')} className={`text-[11px] font-medium pb-2 border-b-2 transition-colors ${attentionTab === 'criticas' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Críticas (2)</button>
                  <button onClick={() => setAttentionTab('proximas')} className={`text-[11px] font-medium pb-2 border-b-2 transition-colors ${attentionTab === 'proximas' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Próximas (3)</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50/50 text-gray-500">
                    <tr>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Cliente / Renta</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Motivo</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Fecha límite</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Última actualización</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mockAttentionRequired.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{item.client}</td>
                        <td className="px-4 py-2.5 text-orange-600 font-medium text-[11px] flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" /> {item.reason}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-[11px]">{item.date}</td>
                        <td className="px-4 py-2.5 text-gray-500 text-[11px]">{item.updated}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button className="text-[10px] font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                            {item.action}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sección 2: Rentas Activas (Tabla Principal) */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-gray-900">Rentas Activas</h2>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Buscar cliente, proyecto..."
                      className="pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-64 transition-all bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                    <Filter className="w-3 h-3" /> Filtros
                  </button>
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
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Próxima acción</th>
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
                          <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-20"></div></td>
                          <td className="px-4 py-3"><div className="h-3 bg-gray-200 rounded w-16"></div></td>
                          <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded-md w-12"></div></td>
                        </tr>
                      ))
                    ) : rentals.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-gray-500">No hay rentas registradas.</td>
                      </tr>
                    ) : (
                      rentals.map((rental) => (
                        <tr 
                          key={rental.id} 
                          onClick={() => setSelectedRentalId(rental.id)}
                          className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${selectedRentalId === rental.id ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-500/20' : ''}`}
                        >
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-gray-900 text-xs">{rental.customer_name}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[160px]">
                              {rental.project_name || rental.location || 'Sin proyecto'}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                              <Package className="w-3 h-3" />
                              {rental.items?.length ? `${rental.items.length} equipos` : 'Sin equipos'}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600 text-[11px]">
                            {rental.effective_start_date ? format(new Date(rental.effective_start_date), "dd/MM/yy") : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-[11px]">
                            {rental.contractual_end_date ? (
                              <span className="text-gray-900 font-medium">
                                {format(new Date(rental.contractual_end_date), "dd/MM/yy")}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">N/A</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-900 text-[11px]">
                            {formatCurrency(calculateTotal(rental.items))}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ring-1 ring-inset ${getPaymentStatusColor(rental.payment_status)}`}>
                              {rental.payment_status === 'current' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                              {getPaymentStatusLabel(rental.payment_status)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-gray-600 flex items-center gap-1.5 text-[10px]">
                              {Math.random() > 0.5 ? (
                                <><CalendarDays className="w-3 h-3 text-blue-500" /> Llamar para renovar</>
                              ) : (
                                <><FileText className="w-3 h-3 text-orange-500" /> Enviar factura</>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-[10px]">
                            {Math.random() > 0.5 ? 'Hace 2 horas' : 'Ayer'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(rental.status)}`}>
                              {getStatusLabel(rental.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px] text-gray-500">
                <span>Mostrando {rentals.length} resultados</span>
                <div className="flex gap-1">
                  <button className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors" disabled>Anterior</button>
                  <button className="px-2 py-1 border border-gray-200 rounded hover:bg-gray-100 bg-white transition-colors">Siguiente</button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (1/3) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Próximos Vencimientos */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Próximos vencimientos</h2>
                <button className="text-[10px] text-blue-600 font-medium hover:underline">Ver todos</button>
              </div>
              <div className="space-y-4">
                {mockUpcomingExpirations.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
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
                ))}
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
                      <MapPin className="w-3 h-3" /> {selectedRental.location || 'Sin ubicación'}
                    </p>
                  </div>

                  <div className="p-4 flex-1 overflow-y-auto space-y-5 text-sm">
                    
                    {/* Equipos */}
                    <div>
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Equipos asignados</p>
                      {selectedRental.items && selectedRental.items.length > 0 ? (
                        <div className="space-y-2">
                          {selectedRental.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded border border-gray-100">
                              <span className="text-xs font-medium text-gray-700 truncate">{item.equipment?.name || 'Equipo'}</span>
                              <span className="text-[10px] text-gray-500 bg-white px-1.5 rounded border border-gray-200">Cant: {item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No hay equipos asignados</p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="border-t border-gray-100 pt-4">
                      <div className="space-y-2">
                        <button className="w-full py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[11px] font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                          <MessageCircle className="w-3.5 h-3.5" /> Contactar por WhatsApp
                        </button>
                        <button className="w-full py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[11px] font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                          <History className="w-3.5 h-3.5" /> Registrar seguimiento
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button className="py-1.5 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 text-[11px] font-medium rounded-md transition-colors">
                          Renovar
                        </button>
                        <button className="py-1.5 bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 text-[11px] font-medium rounded-md transition-colors">
                          Finalizar
                        </button>
                      </div>
                    </div>

                    {/* Referencias & Calidad */}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Referencias</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors group">
                          <div className="flex items-center gap-2 text-[11px] text-gray-600">
                            <FileText className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" /> Contrato firmado
                          </div>
                          <Eye className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
                        </div>
                        <div className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors group">
                          <div className="flex items-center gap-2 text-[11px] text-gray-600">
                            <ShieldCheck className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" /> Calidad de información
                          </div>
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">95%</span>
                        </div>
                      </div>
                    </div>

                    {/* Actividad Reciente */}
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Actividad Reciente</p>
                      <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[9px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                        {mockRecentActivity.map((activity, idx) => (
                          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-blue-100 text-blue-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                              <Activity className="w-2.5 h-2.5" />
                            </div>
                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] pl-2 md:group-odd:pr-2 md:group-even:pl-2">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-medium text-gray-900">{activity.action}</span>
                                <span className="text-[9px] text-gray-500">{activity.date} • {activity.user}</span>
                              </div>
                            </div>
                          </div>
                        ))}
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

// Componente KpiCard Refactorizado (Más compacto)
const KpiCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: 'blue' | 'orange' | 'red' | 'amber' | 'gray' | 'green' }) => {
  const colorMap = {
    blue: 'bg-white border-gray-200 hover:border-blue-200',
    orange: 'bg-white border-gray-200 hover:border-orange-200',
    red: 'bg-white border-gray-200 hover:border-red-200',
    amber: 'bg-white border-gray-200 hover:border-amber-200',
    gray: 'bg-white border-gray-200 hover:border-gray-300',
    green: 'bg-white border-gray-200 hover:border-green-200',
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
    <div className={`p-2.5 rounded-lg border shadow-sm flex items-center gap-2.5 transition-colors cursor-pointer group ${colorMap[color]}`}>
      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${iconBgMap[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 font-medium leading-tight truncate">{title}</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
};
