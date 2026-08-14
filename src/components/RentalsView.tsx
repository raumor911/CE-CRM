import React, { useState, useMemo, useEffect } from 'react';
import { useRentals, RentalWithItems } from '../hooks/useRentals';
import { useRentalPayments } from '../hooks/useRentalPayments';
import { RentalActivity, RentalItem, RentalPayment } from '../types';
import { RentalFormModal } from './modals/RentalFormModal';
import { ContainerIcon } from './icons/BrandIcons';
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
  Phone,
  Plus,
  History,
  CheckSquare,
  Trash2,
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  ChevronDown,
  ChevronRight,
  CornerDownRight
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';



interface UpcomingExpiration {
  rentalId: string;
  client: string;
  amount: number;
  date: Date;
  days: number;
  urgency: 'red' | 'orange' | 'yellow';
}

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

const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'Sin registrar';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Sin registrar';
  return format(date, 'dd/MM/yyyy HH:mm');
};

const formatShortDate = (dateStr?: string | null): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return '-';
  return format(date, 'dd MMM', { locale: es });
};

export const RentalsView: React.FC = () => {
  const { 
    rentals, 
    loading, 
    fetchRentals,
    getRentalActivities,
    addRentalActivity,
    changePaymentStatus,
    renewRental,
    completeRental,
    cancelRental,
    createRental,
    updateRental,
    addRentalItem,
    updateRentalItem,
    removeRentalItem
  } = useRentals();
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);
  const {
    payments,
    ensureCurrentMonthPayments,
    confirmMonthlyPayment,
    registerPaymentFollowUp,
    getPaymentFollowUps
  } = useRentalPayments();

  const [paymentTab, setPaymentTab] = useState<'pendientes' | 'confirmados' | 'todos'>('pendientes');
  const [paymentToValidate, setPaymentToValidate] = useState<RentalPayment | null>(null);
  const [paymentToFollowUp, setPaymentToFollowUp] = useState<RentalPayment | null>(null);
  const [followUpsMap, setFollowUpsMap] = useState<Record<string, RentalActivity>>({});
  const activeRentalsCountRef = React.useRef(0);
  
  // Activities
  const [activities, setActivities] = useState<RentalActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Form Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRentalId, setEditingRentalId] = useState<string | null>(null);
  const [formInitialFocus, setFormInitialFocus] = useState<string | undefined>(undefined);

  // Active Action State


  // Action Modals
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [renewDate, setRenewDate] = useState('');
  
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completeReason, setCompleteReason] = useState('');
  const [completeDate, setCompleteDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDate, setCancelDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState('');
  
  const [paymentFollowUpModalOpen, setPaymentFollowUpModalOpen] = useState(false);
  const [paymentFollowUpNotes, setPaymentFollowUpNotes] = useState('');
  const [paymentFollowUpType, setPaymentFollowUpType] = useState('Llamada');

  const [paymentValidationModalOpen, setPaymentValidationModalOpen] = useState(false);
  const [paymentDetailModalOpen, setPaymentDetailModalOpen] = useState(false);
  const [paymentStatusTarget, setPaymentStatusTarget] = useState<'current' | 'pending_confirmation'>('current');
  
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  const [contractLinkModalOpen, setContractLinkModalOpen] = useState(false);
  const [newContractLink, setNewContractLink] = useState('');
  const [newContractType, setNewContractType] = useState<'document' | 'folder'>('document');

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    payment: 'all',
    expiration: 'all',
    equipment: ''
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (clientName: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(clientName)) next.delete(clientName);
      else next.add(clientName);
      return next;
    });
  };

  const [tempFilters, setTempFilters] = useState(filters);
  


  const applyFilters = () => {
    setFilters(tempFilters);
    setIsFilterOpen(false);
  };
  
  const clearFilters = () => {
    const defaultFilters = { status: 'all', payment: 'all', expiration: 'all', equipment: '' };
    setTempFilters(defaultFilters);
    setFilters(defaultFilters);
    setIsFilterOpen(false);
  };
  
  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all' && v !== '').length;

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  useEffect(() => {
    const activeRentals = rentals.filter(r => r.status === 'active');
    if (activeRentals.length > 0 && activeRentals.length !== activeRentalsCountRef.current) {
      ensureCurrentMonthPayments(activeRentals);
      activeRentalsCountRef.current = activeRentals.length;
    }
  }, [rentals, ensureCurrentMonthPayments]);

  useEffect(() => {
    if (payments.length > 0) {
      getPaymentFollowUps(payments.map(p => p.id)).then(setFollowUpsMap);
    }
  }, [payments, getPaymentFollowUps]);

  const { 
    activeCount, 
    expiring60DaysCount, 
    totalMonthlyWithVAT,
    upcomingExpirations
  } = useMemo(() => {
    const today = startOfDay(new Date());
    let active = 0;
    let expiring60 = 0;
    let totalVAT = 0;

    const expirations: UpcomingExpiration[] = [];

    rentals.forEach(rental => {
      const isRentalActive = rental.status === 'active';
      
      if (isRentalActive) {
        active++;
        
        const rentalTotal = rental.monthly_amount_total || rental.items?.reduce((sum, item) => sum + (Number(item.monthly_total) || 0), 0) || 0;
        totalVAT += Number(rentalTotal);

        if (rental.contractual_end_date) {
          const endDate = parseLocalDate(rental.contractual_end_date);
          if (endDate) {
            const diffDays = differenceInDays(endDate, today);

            if (diffDays >= 0 && diffDays <= 60) {
              expiring60++;
            }

            if (diffDays >= 0 && diffDays <= 60) {
              expirations.push({
                rentalId: rental.id,
                client: rental.customer_name,
                amount: rentalTotal,
                date: endDate,
                days: diffDays,
                urgency: diffDays <= 7 ? 'red' : 'orange'
              });
            }
          }
        }
      }
    });

    expirations.sort((a, b) => a.date.getTime() - b.date.getTime());

    return { 
      activeCount: active, 
      expiring60DaysCount: expiring60, 
      totalMonthlyWithVAT: totalVAT,
      upcomingExpirations: expirations.slice(0, 5)
    };
  }, [rentals]);



  const paymentsWithDetails = useMemo(() => {
    return payments.map(p => {
      const rental = rentals.find(r => r.id === p.rental_id);
      return {
        ...p,
        client: rental?.customer_name || 'Desconocido'
      };
    });
  }, [payments, rentals]);

  const { expected, confirmed, pending, progress } = useMemo(() => {
    let exp = 0;
    let conf = 0;
    let pend = 0;
    payments.forEach(p => {
      exp += Number(p.expected_amount);
      if (p.status === 'confirmed') conf += Number(p.expected_amount);
      if (p.status === 'pending_confirmation') pend += Number(p.expected_amount);
    });
    const prog = exp > 0 ? (conf / exp) * 100 : 0;
    return { expected: exp, confirmed: conf, pending: pend, progress: prog };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    let sorted = [...paymentsWithDetails];
    if (paymentTab === 'pendientes') sorted = sorted.filter(p => p.status === 'pending_confirmation');
    else if (paymentTab === 'confirmados') sorted = sorted.filter(p => p.status === 'confirmed');
    
    return sorted.sort((a, b) => {
      const dateA = new Date(a.payment_due_date).getTime();
      const dateB = new Date(b.payment_due_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      const nameA = a.client || '';
      const nameB = b.client || '';
      return nameA.localeCompare(nameB);
    });
  }, [paymentsWithDetails, paymentTab, followUpsMap]);

  const currentMonthName = format(new Date(), "MMMM 'de' yyyy", { locale: es });

  const calculateTotal = (rental: RentalWithItems) => {
    if (rental.monthly_amount_total) return Number(rental.monthly_amount_total);
    if (!rental.items || rental.items.length === 0) return 0;
    return rental.items.reduce((sum, item) => sum + (Number(item.monthly_total) || 0), 0);
  };

  // Filtrado de Rentas Principal
  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      if (filters.status !== 'all' && rental.status !== filters.status) return false;
      if (filters.payment !== 'all' && rental.payment_status !== filters.payment) return false;

      if (filters.expiration !== 'all') {
        if (filters.expiration === 'none') {
          if (rental.contractual_end_date) return false;
        } else {
          if (!rental.contractual_end_date) return false;
          const endDate = parseLocalDate(rental.contractual_end_date);
          if (!endDate) return false;
          
          const today = startOfDay(new Date());
          const diffDays = differenceInDays(endDate, today);
          
          if (filters.expiration === 'expired' && diffDays >= 0) return false;
          if (filters.expiration === '0-7' && (diffDays < 0 || diffDays > 7)) return false;
          if (filters.expiration === '8-60' && (diffDays < 8 || diffDays > 60)) return false;
        }
      }

      if (filters.equipment) {
        const eq = filters.equipment.toLowerCase().replace(/\s+/g, '');
        const hasEquipment = rental.items?.some(item => (item.equipment_description?.toLowerCase().replace(/\s+/g, '') || '').includes(eq));
        if (!hasEquipment) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase().replace(/\s+/g, '');
        const match = 
          (rental.customer_name?.toLowerCase().replace(/\s+/g, '') || '').includes(q) ||
          (rental.customer_phone?.toLowerCase().replace(/\s+/g, '') || '').includes(q) ||
          (rental.contact_name?.toLowerCase().replace(/\s+/g, '') || '').includes(q) ||
          (rental.project_name?.toLowerCase().replace(/\s+/g, '') || '').includes(q) ||
          (rental.location?.toLowerCase().replace(/\s+/g, '') || '').includes(q) ||
          rental.items?.some(item => (item.equipment_description?.toLowerCase().replace(/\s+/g, '') || '').includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [rentals, searchQuery, filters]);

  
  const groupedRentals = useMemo(() => {
    const groups: Record<string, typeof filteredRentals> = {};
    filteredRentals.forEach(rental => {
      const client = rental.customer_name || 'Desconocido';
      if (!groups[client]) groups[client] = [];
      groups[client].push(rental);
    });

    return Object.entries(groups).map(([clientName, clientRentals]) => {
      clientRentals.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      const totalContainers = clientRentals.reduce((sum, r) => sum + (r.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0), 0);
      
      let earliestStartDate = clientRentals[0].start_date;
      clientRentals.forEach(r => {
        if (new Date(r.start_date) < new Date(earliestStartDate)) earliestStartDate = r.start_date;
      });

      let nearestEndDate: string | null = null;
      clientRentals.forEach(r => {
        if (r.contractual_end_date) {
          if (!nearestEndDate || new Date(r.contractual_end_date) < new Date(nearestEndDate)) {
            nearestEndDate = r.contractual_end_date;
          }
        }
      });

      const totalAmount = clientRentals.reduce((sum, r) => sum + calculateTotal(r), 0);
      
      const pendingCount = clientRentals.filter(r => r.payment_status === 'pending_confirmation').length;
      const paymentStatus = pendingCount > 0 ? 'pending_confirmation' : 'current';

      const activeCount = clientRentals.filter(r => r.status === 'active').length;
      const completedCount = clientRentals.filter(r => r.status === 'completed').length;
      let rentalStatus = 'Mixto';
      if (activeCount === clientRentals.length) rentalStatus = 'Activa';
      else if (completedCount === clientRentals.length) rentalStatus = 'Finalizada';

      let latestActivityAt = clientRentals[0].updated_at;
      clientRentals.forEach(r => {
        if (new Date(r.updated_at) > new Date(latestActivityAt)) latestActivityAt = r.updated_at;
      });

      return {
        clientName,
        rentals: clientRentals,
        totalContainers,
        earliestStartDate,
        nearestEndDate,
        totalAmount,
        pendingCount,
        paymentStatus,
        rentalStatus,
        latestActivityAt
      };
    }).sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [filteredRentals]);

  const selectedRental = useMemo(() => {
    return rentals.find(r => r.id === selectedRentalId) || filteredRentals[0] || null;
  }, [rentals, selectedRentalId, filteredRentals]);

  useEffect(() => {
    if (filteredRentals.length > 0 && !selectedRentalId) {
      setSelectedRentalId(filteredRentals[0].id);
    }
  }, [filteredRentals, selectedRentalId]);

  useEffect(() => {
    if (selectedRentalId) {
      setLoadingActivities(true);
      getRentalActivities(selectedRentalId)
        .then(data => setActivities(data))
        .finally(() => setLoadingActivities(false));
    } else {
      setActivities([]);
    }
  }, [selectedRentalId, getRentalActivities]);

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
    <div className="flex-1 overflow-auto bg-gray-50 min-h-screen font-sans text-gray-900 relative">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        
        <div className="flex justify-end items-center">
          <button 
            onClick={() => { setEditingRentalId(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Renta
          </button>
        </div>

        {/* Top KPI Bar - Grid Responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Rentas activas" value={activeCount.toString()} icon={<Building2 className="w-3.5 h-3.5 text-blue-600" />} color="blue" />
          <KpiCard 
            title="Vencen en 60 días" 
            value={expiring60DaysCount.toString()} 
            icon={<Calendar className="w-3.5 h-3.5 text-orange-600" />} 
            color="orange" 
          />
          <KpiCard 
            title="Pagos por confirmar" 
            value={payments.filter(p => p.status === 'pending_confirmation').length.toString()} 
            icon={payments.filter(p => p.status === 'pending_confirmation').length > 0 ? <CreditCard className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />} 
            color={payments.filter(p => p.status === 'pending_confirmation').length > 0 ? "amber" : "green"} 
          />
          <KpiCard title="Valor mensual activo" value={formatCurrency(totalMonthlyWithVAT)} icon={<DollarSign className="w-3.5 h-3.5 text-green-600" />} color="green" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (2/3) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Sección 1: Seguimiento de Pagos */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-gray-100 px-4 pt-4 pb-3">
                <h2 className="text-sm font-semibold text-gray-900 capitalize">Seguimiento de pagos · {currentMonthName}</h2>
                
                {/* Resumen Mensual */}
                <div className="grid grid-cols-4 gap-4 mt-4 mb-2">
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Importe esperado</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(expected)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Importe confirmado</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(confirmed)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Importe pendiente</p>
                    <p className="text-lg font-bold text-amber-600">{formatCurrency(pending)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-1">Avance</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-blue-600">{Math.round(progress)}%</p>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-4">
                  <button onClick={() => setPaymentTab('pendientes')} className={`text-[11px] font-medium pb-2 border-b-2 transition-colors ${paymentTab === 'pendientes' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Pendientes</button>
                  <button onClick={() => setPaymentTab('confirmados')} className={`text-[11px] font-medium pb-2 border-b-2 transition-colors ${paymentTab === 'confirmados' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Confirmados</button>
                  <button onClick={() => setPaymentTab('todos')} className={`text-[11px] font-medium pb-2 border-b-2 transition-colors ${paymentTab === 'todos' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>Todos</button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50/50 text-gray-500 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Cliente</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Fecha de pago</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider text-right">Importe esperado</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-xs">No hay pagos para mostrar en esta pestaña.</td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => {
                        const isConfirmed = payment.status === 'confirmed';
                        const followUp = followUpsMap[payment.id];
                        let followUpText = 'Sin seguimiento';
                        if (isConfirmed && payment.confirmed_at) {
                          followUpText = `Confirmado el ${format(new Date(payment.confirmed_at), 'dd/MM/yyyy')}`;
                        } else if (followUp) {
                          const fType = followUp.previous_data?.follow_up_type || 'Seguimiento';
                          followUpText = `${fType} · ${formatShortDate(followUp.created_at)}`;
                        }

                        return (
                          <tr key={payment.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedRentalId(payment.rental_id)}>
                            <td className="px-4 py-2.5 font-medium text-gray-900">{payment.client}</td>
                            <td className="px-4 py-2.5 text-gray-600">
                              <div className="flex items-center gap-2">
                                <span>{format(parseLocalDate(payment.payment_due_date) || new Date(), 'dd/MM/yyyy')}</span>
                                {payment.status === 'pending_confirmation' && payment.payment_due_date && (parseLocalDate(payment.payment_due_date)?.getTime() || Infinity) < new Date().setHours(0,0,0,0) && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">Vencido</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-900 font-medium text-right">{formatCurrency(payment.expected_amount)}</td>
                            <td className="px-4 py-2.5 text-right space-x-2">
                              {!isConfirmed && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPaymentToValidate(payment);
                                    setPaymentStatusTarget('current');
                                    setPaymentValidationModalOpen(true);
                                  }}
                                  className="text-[10px] font-medium text-blue-600 border border-blue-200 hover:bg-blue-50 px-2 py-1 rounded transition-colors inline-flex items-center justify-center"
                                >
                                  Validar pago
                                </button>
                              )}
                              {isConfirmed && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPaymentToValidate(payment);
                                    setPaymentDetailModalOpen(true);
                                  }}
                                  className="text-[10px] font-medium text-gray-600 border border-gray-200 hover:bg-gray-100 px-2 py-1 rounded transition-colors inline-flex items-center justify-center"
                                >
                                  Ver detalle
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sección 2: Directorio de Rentas (Tabla Principal) */}
            <div id="directorio-rentas" className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-gray-900">Directorio de Rentas</h2>
                
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Buscar cliente, proyecto, contenedor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-64 transition-all bg-gray-50 focus:bg-white"
                    />
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium border rounded-md transition-colors ${activeFiltersCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <span className="bg-blue-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center ml-1">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>

                    {isFilterOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Estado de renta</label>
                            <select 
                              value={tempFilters.status}
                              onChange={(e) => setTempFilters({...tempFilters, status: e.target.value})}
                              className="w-full py-1.5 px-2 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="all">Todos</option>
                              <option value="active">Activas</option>
                              <option value="completed">Completadas</option>
                              <option value="cancelled">Canceladas</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Estado de pago</label>
                            <select 
                              value={tempFilters.payment}
                              onChange={(e) => setTempFilters({...tempFilters, payment: e.target.value})}
                              className="w-full py-1.5 px-2 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="all">Todos</option>
                              <option value="current">Al corriente</option>
                              <option value="pending_confirmation">Por confirmar</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Vencimiento</label>
                            <select 
                              value={tempFilters.expiration}
                              onChange={(e) => setTempFilters({...tempFilters, expiration: e.target.value})}
                              className="w-full py-1.5 px-2 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="all">Todos</option>
                              <option value="8-60">Vence entre 8 y 60 días</option>
                              <option value="0-7">Vence en 7 días o menos</option>
                              <option value="expired">Contrato vencido</option>
                              <option value="none">Sin fecha contractual</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-gray-700 mb-1">Tipo o descripción de contenedor</label>
                            <input 
                              type="text"
                              placeholder="Ej. Laptop, Monitor..."
                              value={tempFilters.equipment}
                              onChange={(e) => setTempFilters({...tempFilters, equipment: e.target.value})}
                              className="w-full py-1.5 px-2 text-[11px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
                          <button 
                            onClick={clearFilters}
                            className="px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                          >
                            Limpiar
                          </button>
                          <button 
                            onClick={applyFilters}
                            className="px-3 py-1.5 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                          >
                            Aplicar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Cliente / Proyecto</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Contenedor y cantidad</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Inicio</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Vencimiento</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider text-right">Importe</th>
                      <th className="px-4 py-2 font-medium text-[10px] uppercase tracking-wider">Pago</th>
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
                          <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded-md w-12"></div></td>
                        </tr>
                      ))
                    ) : groupedRentals.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-500">No se encontraron rentas.</td>
                      </tr>
                    ) : (
                      groupedRentals.map((group) => {
                        const isExpanded = searchQuery ? true : expandedGroups.has(group.clientName);
                        const hasMultiple = group.rentals.length > 1;

                        return (
                          <React.Fragment key={group.clientName}>
                            {/* Fila Principal / Consolidada */}
                            <tr 
                              onClick={() => {
                                if (hasMultiple) {
                                  toggleGroup(group.clientName);
                                } else {
                                  setSelectedRentalId(group.rentals[0].id);
                                }
                              }}
                              className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${!hasMultiple && selectedRentalId === group.rentals[0].id ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-500/20' : ''} ${hasMultiple ? 'bg-gray-50/30' : ''}`}
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  {hasMultiple && (
                                    <div className="text-gray-400">
                                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-medium text-gray-900 text-xs flex items-center gap-2">
                                      {group.clientName}
                                      {hasMultiple && (
                                        <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-medium border border-blue-100">
                                          {group.rentals.length} rentas
                                        </span>
                                      )}
                                    </div>
                                    {!hasMultiple && (
                                      <div className="text-[10px] text-gray-500 mt-0.5 truncate max-w-[160px]">
                                        {[group.rentals[0].project_name, group.rentals[0].location].filter(Boolean).join(' - ') || 'Sin ubicación'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-1.5 text-gray-600 text-[11px]">
                                  <ContainerIcon size={12} className="text-gray-500" />
                                  {group.totalContainers > 0 ? (group.totalContainers === 1 ? '1 Contenedor' : `${group.totalContainers} Contenedores`) : 'Sin contenedores'}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-gray-600 text-[11px]">
                                {formatLocalDate(group.earliestStartDate)}
                              </td>
                              <td className="px-4 py-2.5 text-[11px]">
                                <span className="text-gray-900 font-medium">
                                  {hasMultiple && group.nearestEndDate ? 'Próximo: ' : ''}{formatLocalDate(group.nearestEndDate || group.rentals[0].contractual_end_date)}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-gray-900 text-[11px]">
                                {formatCurrency(group.totalAmount)}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ring-1 ring-inset ${group.paymentStatus === 'current' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'}`}>
                                  {group.paymentStatus === 'current' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                                  {group.paymentStatus === 'current' ? 'Al corriente' : `${group.pendingCount} pendientes`}
                                </span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${group.rentalStatus === 'Activa' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : group.rentalStatus === 'Finalizada' ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                  {group.rentalStatus}
                                </span>
                              </td>
                            </tr>

                            {/* Filas Hijas */}
                            {hasMultiple && isExpanded && group.rentals.map((rental, index) => {
                              const equipmentCount = rental.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
                              return (
                                <tr 
                                  key={rental.id}
                                  onClick={() => setSelectedRentalId(rental.id)}
                                  className={`hover:bg-blue-50/50 transition-colors cursor-pointer group ${selectedRentalId === rental.id ? 'bg-blue-50/30 ring-1 ring-inset ring-blue-500/20' : ''}`}
                                >
                                  <td className="px-4 py-2 pl-8">
                                    <div className="flex items-start gap-2">
                                      <CornerDownRight size={12} className="text-gray-300 mt-0.5" />
                                      <div>
                                        <div className="font-medium text-gray-700 text-xs">
                                          Renta {index + 1} · {[rental.project_name, rental.location].filter(Boolean).join(' - ') || 'Sin ubicación'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <div className="flex items-center gap-1.5 text-gray-500 text-[11px]">
                                      {equipmentCount} {equipmentCount === 1 ? 'Contenedor' : 'Contenedores'}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-gray-500 text-[11px]">
                                    {formatLocalDate(rental.start_date)}
                                  </td>
                                  <td className="px-4 py-2 text-[11px] text-gray-600">
                                    {formatLocalDate(rental.contractual_end_date)}
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium text-gray-600 text-[11px]">
                                    {formatCurrency(calculateTotal(rental))}
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ring-1 ring-inset ${getPaymentStatusColor(rental.payment_status)}`}>
                                      {getPaymentStatusLabel(rental.payment_status)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2">
                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${getStatusColor(rental.status)}`}>
                                      {getStatusLabel(rental.status)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-[11px] text-gray-500">
                <span>Mostrando {groupedRentals.length} clientes · {filteredRentals.length} rentas</span>
              </div>
            </div>

          </div>

          {/* Right Column (1/3) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Próximos Vencimientos */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Próximos vencimientos</h2>
                <button 
                  onClick={() => document.getElementById('directorio-rentas')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
                >
                  Ver todos
                </button>
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
                      <button 
                        onClick={() => { setEditingRentalId(selectedRental.id); setIsFormOpen(true); }}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
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
                        <span className="font-medium text-gray-900 flex items-center gap-1">
                          {getPaymentStatusLabel(selectedRental.payment_status)}
                        </span>
                      </div>
                    </div>

                    {/* Contenedores */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Contenedores asignados</p>
                        <button 
                          onClick={() => { setEditingItem(null); setItemModalOpen(true); }}
                          className="text-[10px] text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Agregar
                        </button>
                      </div>
                      {selectedRental.items && selectedRental.items.length > 0 ? (
                        <div className="space-y-2">
                          {selectedRental.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded border border-gray-100 group">
                              <span className="text-xs font-medium text-gray-700 truncate">{item.equipment_description || 'Contenedor'}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-500 bg-white px-1.5 rounded border border-gray-200">Cant: {item.quantity}</span>
                                <div className="hidden group-hover:flex items-center gap-1">
                                  <button onClick={() => { setEditingItem(item); setItemModalOpen(true); }} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => {
                                    if(window.confirm('¿Seguro que deseas eliminar este contenedor?')) {
                                      removeRentalItem(item.id, selectedRental.id);
                                    }
                                  }} className="p-1 text-gray-400 hover:text-red-600 rounded">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No hay contenedores asignados</p>
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
                        <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={() => setRenewModalOpen(true)}
                            className="py-1.5 bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 text-[11px] font-medium rounded-md transition-colors">
                            Renovar
                          </button>
                          <button 
                            onClick={() => setCompleteModalOpen(true)}
                            className="py-1.5 bg-green-50 text-green-700 border border-green-100 hover:bg-green-100 text-[11px] font-medium rounded-md transition-colors">
                            <CheckSquare className="w-3.5 h-3.5 inline mr-1" /> Finalizar
                          </button>
                          <button 
                            onClick={() => setCancelModalOpen(true)}
                            className="py-1.5 bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 text-[11px] font-medium rounded-md transition-colors">
                            <XCircle className="w-3.5 h-3.5 inline mr-1" /> Cancelar
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

                    {/* Historial de Actividad */}
                    <div className="border-t border-gray-100 pt-4 pb-2">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" /> Historial de Actividad
                        </p>
                        <button 
                          onClick={() => setFollowUpModalOpen(true)}
                          className="text-[10px] text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Registrar
                        </button>
                      </div>
                      <div className="space-y-3">
                        {loadingActivities ? (
                          <div className="text-center py-4 text-gray-400"><Clock className="w-4 h-4 animate-spin mx-auto" /></div>
                        ) : activities.length === 0 ? (
                          <p className="text-[10px] text-gray-500 italic text-center py-2">Sin actividad reciente</p>
                        ) : (
                          activities.map(activity => (
                            <div key={activity.id} className="relative pl-3 border-l-2 border-gray-100">
                              <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-white"></div>
                              <p className="text-[10px] font-semibold text-gray-900">{activity.activity_type}</p>
                              <p className="text-[10px] text-gray-600 mt-0.5 leading-snug">{activity.description}</p>
                              <p className="text-[9px] text-gray-400 mt-1">{formatShortDate(activity.created_at)}</p>
                            </div>
                          ))
                        )}
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

      {/* Modals */}
      <RentalFormModal 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setFormInitialFocus(undefined); }} 
        initialData={editingRentalId ? rentals.find(r => r.id === editingRentalId) || null : null}
        initialItems={editingRentalId ? rentals.find(r => r.id === editingRentalId)?.items || [] : []}
        initialFocus={formInitialFocus}
        onSubmit={async (rentalData, itemsData) => {
          if (editingRentalId) {
            await updateRental(editingRentalId, rentalData);
            // Updating items can be tricky if we don't have item IDs.
            // In RentalFormModal, we didn't support updating existing items with ID.
            // But since the instruction says "En la vista de equipos (RentalDetailModal o RentalsView), permitir agregar, editar y eliminar equipos llamando a addRentalItem, updateRentalItem, removeRentalItem", we might not need to update items in the RentalFormModal.
            // Actually, if we just pass the items, we can handle it if we want, but let's just update the main rental data here. 
            // Wait, for full edit, maybe we don't update items in RentalFormModal? The instruction says:
            // "6. En la vista de equipos (RentalDetailModal o RentalsView), permitir agregar, editar y eliminar equipos llamando a addRentalItem, updateRentalItem, removeRentalItem."
            // So we'll handle item management in the detail view. 
          } else {
            await createRental(rentalData as any, itemsData as any);
          }
        }}
      />

      {/* Action Modals */}
      <AnimatePresence>
        {renewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setRenewModalOpen(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">Renovar Contrato</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nueva fecha de vencimiento</label>
                  <input type="date" value={renewDate} onChange={e => setRenewDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setRenewModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                  <button 
                    onClick={async () => {
                      if (renewDate && selectedRentalId) {
                        await renewRental(selectedRentalId, renewDate);
                        setRenewModalOpen(false);
                        setRenewDate('');
                      }
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Confirmar Renovación
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {completeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setCompleteModalOpen(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">Finalizar Renta</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha efectiva de finalización</label>
                  <input type="date" value={completeDate} onChange={e => setCompleteDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motivo / Notas (Opcional)</label>
                  <textarea value={completeReason} onChange={e => setCompleteReason(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Todo devuelto en orden..."></textarea>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setCompleteModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                  <button 
                    onClick={async () => {
                      if (selectedRentalId && completeDate) {
                        await completeRental(selectedRentalId, completeDate, completeReason);
                        setCompleteModalOpen(false);
                        setCompleteReason('');
                      }
                    }}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Confirmar Finalización
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {cancelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setCancelModalOpen(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4 text-red-600">Cancelar Contrato</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fecha efectiva de cancelación</label>
                  <input type="date" value={cancelDate} onChange={e => setCancelDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Motivo de cancelación</label>
                  <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-red-500 outline-none" placeholder="Falta de pago, problema con el cliente..."></textarea>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setCancelModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Volver</button>
                  <button 
                    onClick={async () => {
                      if (cancelReason && cancelDate && selectedRentalId) {
                        await cancelRental(selectedRentalId, cancelDate, cancelReason);
                        setCancelModalOpen(false);
                        setCancelReason('');
                      }
                    }}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    disabled={!cancelReason || !cancelDate}
                  >
                    Confirmar Cancelación
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {followUpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setFollowUpModalOpen(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">Registrar Seguimiento</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notas de seguimiento</label>
                  <textarea value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Se contactó al cliente por WhatsApp..."></textarea>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setFollowUpModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                  <button 
                    onClick={async () => {
                      if (followUpNotes && selectedRentalId) {
                        await addRentalActivity(selectedRentalId, 'Seguimiento', followUpNotes);
                        setFollowUpModalOpen(false);
                        setFollowUpNotes('');
                        // Reload activities
                        const newActs = await getRentalActivities(selectedRentalId);
                        setActivities(newActs);
                      }
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={!followUpNotes}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {paymentFollowUpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setPaymentFollowUpModalOpen(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">Registrar Seguimiento de Pago</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de seguimiento</label>
                  <select 
                    value={paymentFollowUpType} 
                    onChange={e => setPaymentFollowUpType(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Llamada">Llamada</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Revisión de pago">Revisión de pago</option>
                    <option value="Nota general">Nota general</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea value={paymentFollowUpNotes} onChange={e => setPaymentFollowUpNotes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-24 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="El cliente prometió transferir mañana..."></textarea>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setPaymentFollowUpModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                  <button 
                    onClick={async () => {
                      if (paymentFollowUpNotes && paymentToFollowUp) {
                        await registerPaymentFollowUp(paymentToFollowUp.id, paymentToFollowUp.rental_id, paymentFollowUpType, paymentFollowUpNotes);
                        setPaymentFollowUpModalOpen(false);
                        setPaymentFollowUpNotes('');
                        // Refetch followups
                        getPaymentFollowUps(payments.map(p => p.id)).then(setFollowUpsMap);
                      }
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={!paymentFollowUpNotes}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {itemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setItemModalOpen(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4">{editingItem ? 'Editar Contenedor' : 'Agregar Contenedor'}</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const desc = (form.elements.namedItem('desc') as HTMLInputElement).value;
                const qty = Number((form.elements.namedItem('qty') as HTMLInputElement).value);
                const subtotal = Number((form.elements.namedItem('subtotal') as HTMLInputElement).value);
                
                const totalSub = subtotal * qty;
                const tax = totalSub * 0.16;
                const total = totalSub + tax;

                const itemData = {
                  equipment_description: desc,
                  quantity: qty,
                  subtotal_monthly: subtotal,
                  tax_monthly: Number(tax.toFixed(2)),
                  monthly_total: Number(total.toFixed(2))
                };

                if (editingItem && selectedRentalId) {
                  await updateRentalItem(editingItem.id, selectedRentalId, itemData as any);
                } else if (selectedRentalId) {
                  await addRentalItem(selectedRentalId, itemData as any);
                }
                setItemModalOpen(false);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                    <input name="desc" required defaultValue={editingItem?.equipment_description} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                      <input name="qty" type="number" required min="1" defaultValue={editingItem?.quantity || 1} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Subtotal (Unitario)</label>
                      <input name="subtotal" type="number" step="0.01" required min="0" defaultValue={editingItem?.subtotal_monthly || 0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button type="button" onClick={() => { setItemModalOpen(false); setEditingItem(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Guardar
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {paymentValidationModalOpen && paymentToValidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setPaymentValidationModalOpen(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" /> Validar Pago
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg text-sm mb-4">
                  <p><span className="font-medium">Cliente:</span> {(paymentToValidate as any).client}</p>
                  <p><span className="font-medium">Periodo:</span> {format(parseLocalDate(paymentToValidate.payment_period) || new Date(), 'MMMM yyyy', { locale: es })}</p>
                  <p><span className="font-medium">Importe:</span> {formatCurrency(paymentToValidate.expected_amount)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">URL del comprobante (Opcional)</label>
                  <input type="url" id="receiptUrl" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notas (Opcional)</label>
                  <textarea id="paymentNotes" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Referencia o comentario..."></textarea>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setPaymentValidationModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">Cancelar</button>
                  <button 
                    onClick={async () => {
                      const receiptUrl = (document.getElementById('receiptUrl') as HTMLInputElement)?.value;
                      const notes = (document.getElementById('paymentNotes') as HTMLTextAreaElement)?.value;
                      try {
                        await confirmMonthlyPayment(paymentToValidate.id, paymentToValidate.rental_id, paymentToValidate.expected_amount, receiptUrl, notes);
                        setPaymentValidationModalOpen(false);
                      } catch (err) {
                        console.error('Error changing payment status:', err);
                      }
                    }}
                    className="px-4 py-2 text-sm text-white rounded-lg transition-colors shadow-sm bg-green-600 hover:bg-green-700"
                  >
                    Confirmar Pago
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {phoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setPhoneModalOpen(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" /> Agregar Teléfono
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Número de teléfono</label>
                  <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ej: 5512345678" />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setPhoneModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">Cancelar</button>
                  <button 
                    onClick={async () => {
                      if (newPhone && selectedRentalId) {
                        try {
                          await updateRental(selectedRentalId, { customer_phone: newPhone });
                          await addRentalActivity(selectedRentalId, 'phone_added', 'Teléfono del cliente agregado', { after: { customer_phone: newPhone } });
                          setPhoneModalOpen(false);
                          setNewPhone('');
                        } catch (err) {
                          console.error('Error adding phone:', err);
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    disabled={!newPhone}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {contractLinkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50" onClick={() => setContractLinkModalOpen(false)} />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-600" /> Enlace de Contrato
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">URL del contrato</label>
                  <input type="url" value={newContractLink} onChange={e => setNewContractLink(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de enlace</label>
                  <select
                    value={newContractType}
                    onChange={e => setNewContractType(e.target.value as 'document' | 'folder')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="document">Documento</option>
                    <option value="folder">Carpeta</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button onClick={() => setContractLinkModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">Cancelar</button>
                  <button 
                    onClick={async () => {
                      if (newContractLink && selectedRentalId) {
                        try {
                          await updateRental(selectedRentalId, { 
                            contract_reference_url: newContractLink,
                            contract_reference_type: newContractType
                          });
                          await addRentalActivity(selectedRentalId, 'contract_link_added', 'Enlace del contrato agregado', { 
                            after: { 
                              contract_reference_url: newContractLink,
                              contract_reference_type: newContractType
                            } 
                          });
                          setContractLinkModalOpen(false);
                          setNewContractLink('');
                        } catch (err) {
                          console.error('Error adding contract link:', err);
                        }
                      }
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    disabled={!newContractLink}
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
