import React, { useMemo } from 'react';
import { useRentals, RentalWithItems } from '../hooks/useRentals';
import { 
  Building2, 
  CalendarClock, 
  AlertTriangle, 
  AlertCircle, 
  DollarSign,
  Plus,
  Search,
  MoreVertical,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'motion/react';

export const RentalsView: React.FC = () => {
  const { rentals, loading, error } = useRentals();

  // Mapear rentas activas y calcular métricas
  const { 
    activeCount, 
    expiringSoonCount, 
    immediateExpiringCount, 
    expiredCount, 
    totalMonthlyWithVAT 
  } = useMemo(() => {
    const today = startOfDay(new Date());
    let active = 0;
    let expiringSoon = 0;
    let immediateExpiring = 0;
    let expired = 0;
    let totalVAT = 0;

    rentals.forEach(rental => {
      if (rental.status === 'active') {
        active++;
        
        // Sumar totales mensuales (ya incluye IVA si es monthly_total)
        const rentalTotal = rental.items?.reduce((sum, item) => sum + (item.monthly_total || 0), 0) || 0;
        totalVAT += rentalTotal;

        if (rental.contractual_end_date) {
          const endDate = startOfDay(new Date(rental.contractual_end_date));
          const diffDays = differenceInDays(endDate, today);

          if (isBefore(endDate, today)) {
            expired++;
          } else if (diffDays <= 3) {
            immediateExpiring++;
          } else if (diffDays <= 15) {
            expiringSoon++;
          }
        }
      }
    });

    return { 
      activeCount: active, 
      expiringSoonCount: expiringSoon, 
      immediateExpiringCount: immediateExpiring, 
      expiredCount: expired, 
      totalMonthlyWithVAT: totalVAT 
    };
  }, [rentals]);

  // Utils para UI
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200';
      case 'completed': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
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
      case 'current': return 'text-green-600 bg-green-50 ring-green-500/20';
      case 'pending_confirmation': return 'text-amber-600 bg-amber-50 ring-amber-500/20';
      default: return 'text-gray-600 bg-gray-50 ring-gray-500/20';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'current': return 'Al corriente';
      case 'pending_confirmation': return 'Pago Pendiente';
      default: return status;
    }
  };

  const calculateTotal = (items: RentalWithItems['items']) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.monthly_total || 0), 0);
  };

  const calculateEquipments = (items: RentalWithItems['items']) => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-500 bg-red-50 rounded-2xl mx-8 my-8">
        <AlertCircle className="w-8 h-8 mx-auto mb-3" />
        <h2 className="text-lg font-medium">Error al cargar rentas</h2>
        <p className="text-sm opacity-80">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#FAFAFA] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Módulo de Rentas</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión integral de equipos y contratos activos</p>
          </div>
          <button className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors shadow-sm gap-2">
            <Plus className="w-4 h-4" />
            Registrar Nueva Renta
          </button>
        </header>

        {/* Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard 
            title="Rentas Activas" 
            value={activeCount.toString()} 
            icon={<Building2 className="w-5 h-5 text-blue-600" />}
            bgColor="bg-blue-50"
          />
          <StatCard 
            title="Próximas a Vencer" 
            value={expiringSoonCount.toString()} 
            subtitle="Próximos 15 días"
            icon={<CalendarClock className="w-5 h-5 text-amber-600" />}
            bgColor="bg-amber-50"
          />
          <StatCard 
            title="Vencimiento Inmediato" 
            value={immediateExpiringCount.toString()} 
            subtitle="Menos de 3 días"
            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
            bgColor="bg-orange-50"
          />
          <StatCard 
            title="Contratos Vencidos" 
            value={expiredCount.toString()} 
            icon={<AlertCircle className="w-5 h-5 text-red-600" />}
            bgColor="bg-red-50"
          />
          <StatCard 
            title="Total Mensual (IVA inc.)" 
            value={formatCurrency(totalMonthlyWithVAT)} 
            icon={<DollarSign className="w-5 h-5 text-green-600" />}
            bgColor="bg-green-50"
          />
        </div>

        {/* Main List / Table Section */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Listado de Rentas</h2>
            
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Buscar cliente, ubicación..."
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 w-64 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Cliente / Ubicación</th>
                  <th className="px-6 py-4 text-center">Equipos</th>
                  <th className="px-6 py-4">Vencimiento</th>
                  <th className="px-6 py-4 text-right">Total (Mes)</th>
                  <th className="px-6 py-4">Estado Pago</th>
                  <th className="px-6 py-4">Estado Renta</th>
                  <th className="px-6 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                      </td>
                      <td className="px-6 py-4 text-center"><div className="h-4 bg-gray-100 rounded w-8 mx-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                      <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-100 rounded w-20 ml-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-full w-24"></div></td>
                      <td className="px-6 py-4"><div className="h-6 bg-gray-100 rounded-md w-20"></div></td>
                      <td className="px-6 py-4"></td>
                    </tr>
                  ))
                ) : rentals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <Building2 className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-base font-medium text-gray-900 mb-1">No hay rentas registradas</p>
                        <p className="text-sm">Comienza agregando una nueva renta al sistema.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rentals.map((rental, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.05 }}
                      key={rental.id} 
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{rental.customer_name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[200px]" title={[rental.project_name, rental.location].filter(Boolean).join(' - ') || ''}>
                          {[rental.project_name, rental.location].filter(Boolean).join(' - ') || 'Sin ubicación'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600 font-medium">
                        {calculateEquipments(rental.items)}
                      </td>
                      <td className="px-6 py-4">
                        {rental.contractual_end_date ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <CalendarClock className="w-3.5 h-3.5 opacity-70" />
                            <span>{format(new Date(rental.contractual_end_date), "dd MMM, yyyy", { locale: es })}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No definido</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        {formatCurrency(calculateTotal(rental.items))}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${getPaymentStatusColor(rental.payment_status)}`}>
                          {rental.payment_status === 'current' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                          {getPaymentStatusLabel(rental.payment_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(rental.status)}`}>
                          {getStatusLabel(rental.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

// Componente interno para las tarjetas de estadísticas
const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  bgColor 
}: { 
  title: string; 
  value: string; 
  subtitle?: string; 
  icon: React.ReactNode; 
  bgColor: string; 
}) => (
  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2 rounded-xl ${bgColor}`}>
        {icon}
      </div>
    </div>
    <div>
      <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</h3>
      <p className="text-sm font-medium text-gray-500 mt-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      )}
    </div>
  </div>
);
