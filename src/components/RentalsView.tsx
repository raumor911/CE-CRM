import React, { useState, useMemo, useEffect } from 'react';
import { useRentals, RentalWithItems } from '../hooks/useRentals';
import { useRentalPayments } from '../hooks/useRentalPayments';
import { RentalActivity, RentalItem, RentalPayment } from '../types';
import { RentalFormModal } from './modals/RentalFormModal';
import { ContainerIcon } from './icons/BrandIcons';
import { 
  Building2, 
  Calendar, 
  X,
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
import { cn, formatCurrency, buildWhatsAppUrl, formatLocalDate, formatDateTime, formatShortDate, parseLocalDate } from '../lib/utils';
import {
  cleanCustomerName,
  normalizeCustomerName,
} from '../utils/customerIdentity';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { RentalDetailPanel } from './rentals/RentalDetailPanel';



interface UpcomingExpiration {
  rentalId: string;
  client: string;
  amount: number;
  date: Date;
  days: number;
  urgency: 'red' | 'orange' | 'yellow';
}





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
    currentPeriod,
    hasPeriodChanged,
    acknowledgePeriodChange,
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
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  
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

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
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

  const FilterChip: React.FC<{ label: string; onClear: () => void }> = ({ label, onClear }) => (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-700 animate-in fade-in slide-in-from-left-2">
      <span>{label}</span>
      <button onClick={onClear} className="hover:text-indigo-900 transition-colors">
        <X size={10} />
      </button>
    </div>
  );

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  useEffect(() => {
    const activeRentals = rentals.filter(r => r.status === 'active');
    let shouldUpdate = false;
    
    if (activeRentals.length > 0 && activeRentals.length !== activeRentalsCountRef.current) {
      shouldUpdate = true;
      activeRentalsCountRef.current = activeRentals.length;
    }
    
    if (hasPeriodChanged && activeRentals.length > 0) {
      shouldUpdate = true;
      acknowledgePeriodChange();
    }

    if (shouldUpdate) {
      ensureCurrentMonthPayments(currentPeriod, activeRentals);
    }
  }, [rentals, currentPeriod, hasPeriodChanged, ensureCurrentMonthPayments, acknowledgePeriodChange]);

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

  const paymentStateMap = useMemo(() => {
    const map = new Map<string, { state: 'pending' | 'confirmed' | 'not_applicable', payment: RentalPayment | null }>();
    rentals.forEach(r => {
       const p = payments.find(pay => pay.rental_id === r.id);
       if (!p) {
         map.set(r.id, { state: 'not_applicable', payment: null });
       } else if (p.status === 'pending_confirmation') {
         map.set(r.id, { state: 'pending', payment: p });
       } else {
         map.set(r.id, { state: 'confirmed', payment: p });
       }
    });
    return map;
  }, [rentals, payments]);

  // Filtrado de Rentas Principal
  const filteredRentals = useMemo(() => {
    return rentals.filter(rental => {
      if (filters.status !== 'all' && rental.status !== filters.status) return false;
      
      if (filters.payment !== 'all') {
        const pState = paymentStateMap.get(rental.id)?.state || 'not_applicable';
        if (filters.payment === 'current' && pState !== 'confirmed') return false;
        if (filters.payment === 'pending_confirmation' && pState !== 'pending') return false;
        if (filters.payment === 'not_applicable' && pState !== 'not_applicable') return false;
      }

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
  }, [rentals, searchQuery, filters, paymentStateMap]);

  
  const groupedRentals = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        clientName: string;
        rentals: typeof filteredRentals;
      }
    >();

    filteredRentals.forEach(rental => {
      const normalizedName =
        normalizeCustomerName(rental.customer_name);

      const clientKey = normalizedName
        ? `name:${normalizedName}`
        : `rental:${rental.id}`;

      const existingGroup = groups.get(clientKey);

      if (existingGroup) {
        existingGroup.rentals.push(rental);
        return;
      }

      groups.set(clientKey, {
        key: clientKey,
        clientName:
          cleanCustomerName(rental.customer_name) ||
          'Cliente sin identificar',
        rentals: [rental],
      });
    });

    return Array.from(groups.values()).map(group => {
      const clientRentals = group.rentals;
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

      let pendingCount = 0;
      let applicableCount = 0;

      clientRentals.forEach(r => {
        const pState = paymentStateMap.get(r.id)?.state || 'not_applicable';
        if (pState !== 'not_applicable') applicableCount++;
        if (pState === 'pending') pendingCount++;
      });

      let paymentStatus = 'Sin pago este mes';
      if (pendingCount > 0) paymentStatus = `${pendingCount} pendientes`;
      else if (applicableCount > 0 && pendingCount === 0) paymentStatus = 'Al corriente';

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
        key: group.key,
        clientName: group.clientName,
        rentals: clientRentals,
        totalContainers,
        earliestStartDate,
        nearestEndDate,
        totalAmount,
        pendingCount,
        paymentStatus,
        rentalStatus,
        latestActivityAt,
      };
    }).sort((a, b) =>
      a.clientName.localeCompare(b.clientName, 'es-MX')
    );
  }, [filteredRentals, paymentStateMap]);

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

  const getPaymentStatusColor = (state: string) => {
    switch (state) {
      case 'confirmed': return 'text-emerald-700 bg-emerald-50 ring-emerald-600/20';
      case 'pending': return 'text-amber-700 bg-amber-50 ring-amber-600/20';
      case 'not_applicable': return 'text-gray-600 bg-gray-50 ring-gray-500/20';
      default: return 'text-gray-700 bg-gray-50 ring-gray-600/20';
    }
  };

  const getPaymentStatusLabel = (state: string) => {
    switch (state) {
      case 'confirmed': return 'Al corriente';
      case 'pending': return 'Pendiente';
      case 'not_applicable': return 'Sin pago este mes';
      default: return state;
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-zinc-50 min-h-screen font-sans text-zinc-900 relative pb-20 md:pb-0">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
        
        <div className="flex justify-between items-center safe-top">
          <h1 className="text-xl md:text-2xl font-black text-zinc-900 uppercase tracking-tight md:hidden">Rentas</h1>
          <div className="flex-1" />
          <button 
            onClick={() => { setEditingRentalId(null); setIsFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-zinc-900/10 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Nueva Renta</span>
          </button>
        </div>

        {/* Top KPI Bar - Grid Responsivo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Rentas activas" value={activeCount.toString()} icon={<Building2 className="w-4 h-4 text-blue-600" />} color="blue" />
          <KpiCard 
            title="Vencen en 60d" 
            value={expiring60DaysCount.toString()} 
            icon={<Calendar className="w-4 h-4 text-orange-600" />} 
            color="orange" 
          />
          <KpiCard 
            title="Por confirmar" 
            value={payments.filter(p => p.status === 'pending_confirmation').length.toString()} 
            icon={payments.filter(p => p.status === 'pending_confirmation').length > 0 ? <CreditCard className="w-4 h-4 text-amber-600" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />} 
            color={payments.filter(p => p.status === 'pending_confirmation').length > 0 ? "amber" : "green"} 
          />
          <KpiCard title="Valor mensual" value={formatCurrency(totalMonthlyWithVAT)} icon={<DollarSign className="w-4 h-4 text-green-600" />} color="green" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (2/3) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Sección 1: Seguimiento de Pagos */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-zinc-100 px-4 pt-5 pb-4">
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Seguimiento de pagos · {currentMonthName}</h2>
                
                {/* Resumen Mensual - Scrollable on mobile if needed, but 2x2 is better */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-2">
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Esperado</p>
                    <p className="text-lg font-black text-zinc-900">{formatCurrency(expected)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Confirmado</p>
                    <p className="text-lg font-black text-emerald-600">{formatCurrency(confirmed)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Pendiente</p>
                    <p className="text-lg font-black text-amber-600">{formatCurrency(pending)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Avance</p>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-black text-indigo-600">{Math.round(progress)}%</p>
                      <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-6 mt-6 overflow-x-auto scrollbar-hide">
                  <button onClick={() => setPaymentTab('pendientes')} className={cn("text-xs font-bold pb-2 border-b-2 transition-all whitespace-nowrap", paymentTab === 'pendientes' ? 'text-zinc-900 border-zinc-900' : 'text-zinc-400 border-transparent hover:text-zinc-600')}>Pendientes</button>
                  <button onClick={() => setPaymentTab('confirmados')} className={cn("text-xs font-bold pb-2 border-b-2 transition-all whitespace-nowrap", paymentTab === 'confirmados' ? 'text-zinc-900 border-zinc-900' : 'text-zinc-400 border-transparent hover:text-zinc-600')}>Confirmados</button>
                  <button onClick={() => setPaymentTab('todos')} className={cn("text-xs font-bold pb-2 border-b-2 transition-all whitespace-nowrap", paymentTab === 'todos' ? 'text-zinc-900 border-zinc-900' : 'text-zinc-400 border-transparent hover:text-zinc-600')}>Todos</button>
                </div>
              </div>

              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-zinc-50/50 text-zinc-500 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest">Cliente</th>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest">Vencimiento</th>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-right">Importe</th>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 text-xs italic">No hay registros para mostrar.</td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => {
                        const isConfirmed = payment.status === 'confirmed';
                        return (
                          <tr key={payment.id} className="hover:bg-zinc-50 transition-colors cursor-pointer group" onClick={() => setSelectedRentalId(payment.rental_id)}>
                            <td className="px-6 py-4 font-bold text-zinc-900">{payment.client}</td>
                            <td className="px-6 py-4 text-zinc-600">
                              <div className="flex items-center gap-2">
                                <span>{format(parseLocalDate(payment.payment_due_date) || new Date(), 'dd/MM/yyyy')}</span>
                                {payment.status === 'pending_confirmation' && payment.payment_due_date && (parseLocalDate(payment.payment_due_date)?.getTime() || Infinity) < new Date().setHours(0,0,0,0) && (
                                  <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter bg-rose-500/10 text-rose-600">Vencido</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-900 font-bold text-right">{formatCurrency(payment.expected_amount)}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {!isConfirmed ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPaymentToValidate(payment);
                                    setPaymentStatusTarget('current');
                                    setPaymentValidationModalOpen(true);
                                  }}
                                  className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                >
                                  Validar pago
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPaymentToValidate(payment);
                                    setPaymentDetailModalOpen(true);
                                  }}
                                  className="text-[10px] font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-all active:scale-95"
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

              {/* Mobile View Cards */}
              <div className="md:hidden divide-y divide-zinc-100">
                {filteredPayments.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs italic">No hay registros para mostrar.</div>
                ) : (
                  filteredPayments.map((payment) => {
                    const isConfirmed = payment.status === 'confirmed';
                    const isVencido = payment.status === 'pending_confirmation' && payment.payment_due_date && (parseLocalDate(payment.payment_due_date)?.getTime() || Infinity) < new Date().setHours(0,0,0,0);
                    
                    return (
                      <motion.div 
                        key={payment.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-5 active:bg-zinc-50 transition-all"
                        onClick={() => {
                          setSelectedRentalId(payment.rental_id);
                          setIsMobileDetailOpen(true);
                        }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="min-w-0 pr-2">
                            <h3 className="font-black text-zinc-900 text-base truncate uppercase tracking-tight">{payment.client}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                <Calendar size={12} />
                                {format(parseLocalDate(payment.payment_due_date) || new Date(), 'dd/MM/yyyy')}
                              </span>
                              {isVencido && (
                                <span className="px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">Vencido</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-zinc-900 text-base">{formatCurrency(payment.expected_amount)}</p>
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest mt-1.5 border shadow-sm",
                              isConfirmed ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                            )}>
                              {isConfirmed ? 'Confirmado' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2.5">
                          {!isConfirmed ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentToValidate(payment);
                                setPaymentStatusTarget('current');
                                setPaymentValidationModalOpen(true);
                              }}
                              className="flex-1 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl active:scale-95 transition-all shadow-xl shadow-zinc-900/10 flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 size={16} />
                              Validar pago
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setPaymentToValidate(payment);
                                setPaymentDetailModalOpen(true);
                              }}
                              className="flex-1 bg-zinc-100 text-zinc-900 text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                              <Eye size={16} />
                              Ver detalle
                            </button>
                          )}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const rental = rentals.find(r => r.id === payment.rental_id);
                              if (rental?.customer_phone) {
                                window.open(buildWhatsAppUrl(rental.customer_phone, `Hola ${rental.customer_name}, te contacto de Creativos Espacios referente al pago de la renta de ${format(parseLocalDate(payment.payment_due_date) || new Date(), 'MMMM')}...`), '_blank');
                              }
                            }}
                            className="w-14 h-12 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-2xl active:bg-emerald-100 transition-all border border-emerald-100 shadow-sm shadow-emerald-600/5"
                          >
                            <MessageCircle size={20} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sección 2: Directorio de Rentas (Tabla Principal) */}
            <div id="directorio-rentas" className="bg-white border border-zinc-200 rounded-3xl shadow-sm flex flex-col overflow-hidden mb-20 md:mb-0">
              {/* Header & Filters - Mobile First */}
              <div className="p-4 md:p-6 border-b border-zinc-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Directorio de Rentas</h2>
                  <div className="md:hidden">
                    <button 
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border rounded-xl transition-all active:scale-95",
                        activeFiltersCount > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-zinc-200 text-zinc-700 shadow-sm"
                      )}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <span className="bg-indigo-600 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center ml-0.5">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Buscar cliente o proyecto..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-11 pr-4 py-3 md:py-2 text-base md:text-sm border border-zinc-200 rounded-2xl md:rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full transition-all bg-zinc-50 focus:bg-white"
                    />
                  </div>
                  
                  <div className="hidden md:block relative">
                    <button 
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 text-xs font-bold border rounded-xl transition-all active:scale-95 hover:bg-zinc-50",
                        activeFiltersCount > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-white border-zinc-200 text-zinc-700 shadow-sm"
                      )}
                    >
                      <Filter className="w-4 h-4" />
                      Filtros
                      {activeFiltersCount > 0 && (
                        <span className="bg-indigo-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center ml-1">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Chips de filtros activos */}
                <AnimatePresence>
                  {activeFiltersCount > 0 && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="flex flex-wrap gap-2 pt-1"
                    >
                      {filters.status !== 'all' && (
                        <FilterChip label={filters.status === 'active' ? 'Activas' : filters.status === 'completed' ? 'Finalizadas' : 'Canceladas'} onClear={() => setFilters(prev => ({ ...prev, status: 'all' }))} />
                      )}
                      {filters.payment !== 'all' && (
                        <FilterChip label={filters.payment === 'current' ? 'Al corriente' : filters.payment === 'pending_confirmation' ? 'Pendiente' : 'Sin pago'} onClear={() => setFilters(prev => ({ ...prev, payment: 'all' }))} />
                      )}
                      {filters.expiration !== 'all' && (
                        <FilterChip label={filters.expiration === 'expired' ? 'Vencido' : 'Próximo a vencer'} onClear={() => setFilters(prev => ({ ...prev, expiration: 'all' }))} />
                      )}
                      <button onClick={clearFilters} className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-auto py-1">Limpiar</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar / Bottom Sheet de Filtros */}
              <AnimatePresence>
                {isFilterOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsFilterOpen(false)}
                      className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-[100]"
                    />
                    <motion.div 
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed top-0 right-0 h-screen w-full max-w-[360px] bg-white shadow-2xl z-[101] flex flex-col"
                    >
                      <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                            <Filter size={18} />
                          </div>
                          <h3 className="font-black text-zinc-900 uppercase tracking-tight">Filtros de Rentas</h3>
                        </div>
                        <button onClick={() => setIsFilterOpen(false)} className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 transition-all">
                          <X size={20} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Estado de renta</label>
                            <select 
                              value={tempFilters.status}
                              onChange={(e) => setTempFilters({...tempFilters, status: e.target.value})}
                              className="w-full py-3.5 px-4 text-base md:text-sm border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50"
                            >
                              <option value="all">Todos</option>
                              <option value="active">Activas</option>
                              <option value="completed">Completadas</option>
                              <option value="cancelled">Canceladas</option>
                            </select>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Estado de pago</label>
                            <select 
                              value={tempFilters.payment}
                              onChange={(e) => setTempFilters({...tempFilters, payment: e.target.value})}
                              className="w-full py-3.5 px-4 text-base md:text-sm border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50"
                            >
                              <option value="all">Todos</option>
                              <option value="current">Al corriente</option>
                              <option value="pending_confirmation">Pendiente</option>
                              <option value="not_applicable">Sin pago este mes</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Vencimiento</label>
                            <select 
                              value={tempFilters.expiration}
                              onChange={(e) => setTempFilters({...tempFilters, expiration: e.target.value})}
                              className="w-full py-3.5 px-4 text-base md:text-sm border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50"
                            >
                              <option value="all">Todos</option>
                              <option value="8-60">Vence entre 8 y 60 días</option>
                              <option value="0-7">Vence en 7 días o menos</option>
                              <option value="expired">Contrato vencido</option>
                              <option value="none">Sin fecha contractual</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 space-y-3 safe-bottom">
                        <button 
                          onClick={applyFilters}
                          className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-zinc-900/10 text-xs"
                        >
                          Mostrar Resultados
                        </button>
                        <button 
                          onClick={clearFilters}
                          className="w-full py-3 text-xs font-bold text-zinc-500 hover:bg-zinc-100 rounded-2xl transition-all uppercase tracking-widest"
                        >
                          Limpiar Filtros
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="overflow-x-auto custom-scrollbar">
                {/* Desktop View Table */}
                <table className="hidden md:table w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-zinc-50/80 text-zinc-500 border-b border-zinc-100">
                    <tr>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest">Cliente / Proyecto</th>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest">Equipos</th>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest">Inicio</th>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest">Vencimiento</th>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-right">Importe</th>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest">Pago</th>
                      <th className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse hidden md:table-row">
                          <td className="px-6 py-4"><div className="h-3 bg-zinc-200 rounded w-3/4 mb-1"></div><div className="h-2 bg-zinc-100 rounded w-1/2"></div></td>
                          <td className="px-6 py-4"><div className="h-3 bg-zinc-200 rounded w-16"></div></td>
                          <td className="px-6 py-4"><div className="h-3 bg-zinc-200 rounded w-16"></div></td>
                          <td className="px-6 py-4"><div className="h-3 bg-zinc-200 rounded w-16"></div></td>
                          <td className="px-6 py-4"><div className="h-3 bg-zinc-200 rounded w-16 ml-auto"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-zinc-200 rounded-full w-16"></div></td>
                          <td className="px-6 py-4"><div className="h-4 bg-zinc-200 rounded-md w-12"></div></td>
                        </tr>
                      ))
                    ) : groupedRentals.length === 0 ? (
                      <tr className="hidden md:table-row">
                        <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-xs italic">No se encontraron rentas.</td>
                      </tr>
                    ) : (
                      groupedRentals.map((group) => {
                        const isExpanded = searchQuery ? true : expandedGroups.has(group.key);
                        const hasMultiple = group.rentals.length > 1;

                        return (
                          <React.Fragment key={group.key}>
                            {/* Desktop Row */}
                            <tr 
                              onClick={() => {
                                if (hasMultiple) toggleGroup(group.key);
                                else {
                                  setSelectedRentalId(group.rentals[0].id);
                                  if (window.innerWidth < 768) setIsMobileDetailOpen(true);
                                }
                              }}
                              className={cn(
                                "hidden md:table-row hover:bg-indigo-50/30 transition-colors cursor-pointer group",
                                hasMultiple ? "bg-zinc-50/30" : "",
                                !hasMultiple && selectedRentalId === group.rentals[0].id ? "bg-indigo-50/50" : ""
                              )}
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {hasMultiple && (
                                    <div className="text-zinc-400">
                                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-black text-zinc-900 text-xs uppercase tracking-tight flex items-center gap-2">
                                      {group.clientName}
                                      {hasMultiple && (
                                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest border border-indigo-100">
                                          {group.rentals.length} rentas
                                        </span>
                                      )}
                                    </div>
                                    {!hasMultiple && (
                                      <div className="text-[10px] text-zinc-500 font-bold mt-0.5 truncate max-w-[200px] uppercase">
                                        {[group.rentals[0].project_name, group.rentals[0].location].filter(Boolean).join(' - ') || 'Sin ubicación'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 text-zinc-600 font-bold text-[10px] uppercase tracking-widest">
                                  <Package size={14} className="text-zinc-400" />
                                  {group.totalContainers}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-zinc-500 font-bold text-[10px] uppercase tracking-widest">
                                {formatLocalDate(group.earliestStartDate)}
                              </td>
                              <td className="px-6 py-4 text-[10px] uppercase tracking-widest">
                                <span className={cn(
                                  "font-bold",
                                  group.nearestEndDate && differenceInDays(parseLocalDate(group.nearestEndDate) || new Date(), startOfDay(new Date())) <= 30 ? "text-rose-600" : "text-zinc-900"
                                )}>
                                  {group.nearestEndDate ? formatLocalDate(group.nearestEndDate) : '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-black text-zinc-900 text-xs">
                                {formatCurrency(group.totalAmount)}
                              </td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                  group.paymentStatus === 'Al corriente' ? "bg-emerald-50 border-emerald-200 text-emerald-700" : 
                                  group.paymentStatus === 'Sin pago este mes' ? "bg-zinc-50 border-zinc-200 text-zinc-600" : 
                                  "bg-amber-50 border-amber-200 text-amber-700"
                                )}>
                                  {group.paymentStatus === 'Al corriente' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                  {group.paymentStatus}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className={cn(
                                  "inline-flex items-center px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                                  group.rentalStatus === 'Activa' ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-zinc-100 border-zinc-200 text-zinc-700"
                                )}>
                                  {group.rentalStatus}
                                </span>
                              </td>
                            </tr>

                            {/* Mobile Item Card */}
                            <tr className="md:hidden">
                              <td colSpan={7} className="p-0">
                                <div className="flex flex-col divide-y divide-zinc-100">
                                  <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="p-5 bg-zinc-50/50 active:bg-zinc-100 transition-all flex items-center justify-between"
                                    onClick={() => {
                                      if (hasMultiple) toggleGroup(group.key);
                                      else {
                                        setSelectedRentalId(group.rentals[0].id);
                                        setIsMobileDetailOpen(true);
                                      }
                                    }}
                                  >
                                    <div className="flex-1 min-w-0 pr-4">
                                      <h3 className="font-black text-zinc-900 text-base uppercase tracking-tight truncate">{group.clientName}</h3>
                                      <div className="flex items-center gap-3 mt-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <Package size={12} className="text-zinc-400" />
                                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{group.totalContainers} equipos</span>
                                        </div>
                                        <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{group.rentals.length} rentas</span>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm",
                                        group.pendingCount > 0 ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                      )}>
                                        {group.paymentStatus}
                                      </span>
                                      {hasMultiple && (
                                        <motion.div
                                          animate={{ rotate: isExpanded ? 180 : 0 }}
                                          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                        >
                                          <ChevronDown size={18} className="text-zinc-400" />
                                        </motion.div>
                                      )}
                                      {!hasMultiple && <ChevronRight size={18} className="text-zinc-300" />}
                                    </div>
                                  </motion.div>

                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="divide-y divide-zinc-100 bg-white overflow-hidden"
                                      >
                                        {group.rentals.map((rental) => (
                                          <div 
                                            key={rental.id} 
                                            className="p-5 pl-10 active:bg-zinc-50 transition-all relative"
                                            onClick={() => {
                                              setSelectedRentalId(rental.id);
                                              setIsMobileDetailOpen(true);
                                            }}
                                          >
                                            {hasMultiple && (
                                              <div className="absolute left-4 top-6">
                                                <CornerDownRight size={16} className="text-zinc-300" />
                                              </div>
                                            )}
                                            <div className="flex justify-between items-start mb-3">
                                              <div className="min-w-0 pr-4">
                                                <p className="font-black text-zinc-800 text-sm uppercase tracking-tight truncate">{rental.project_name || 'Renta Individual'}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                  <MapPin size={10} className="text-zinc-400" />
                                                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest truncate">{rental.location || 'Sin ubicación'}</p>
                                                </div>
                                              </div>
                                              <div className="text-right shrink-0">
                                                <p className="font-black text-zinc-900 text-sm">{formatCurrency(calculateTotal(rental))}</p>
                                                <span className={cn(
                                                  "px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest mt-1.5 inline-block border shadow-sm",
                                                  getStatusColor(rental.status)
                                                )}>
                                                  {getStatusLabel(rental.status)}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-50">
                                              <div className="flex items-center gap-4 text-[9px] text-zinc-500 font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-1.5">
                                                  <Calendar size={12} className="text-zinc-400" />
                                                  <span>{formatLocalDate(rental.start_date)}</span>
                                                </div>
                                                {rental.contractual_end_date && (
                                                  <div className="flex items-center gap-1.5">
                                                    <CalendarClock size={12} className="text-zinc-400" />
                                                    <span className={cn(
                                                      differenceInDays(parseLocalDate(rental.contractual_end_date) || new Date(), startOfDay(new Date())) <= 30 ? "text-rose-600" : ""
                                                    )}>{formatLocalDate(rental.contractual_end_date)}</span>
                                                  </div>
                                                )}
                                              </div>
                                              <div className="w-8 h-8 flex items-center justify-center bg-zinc-50 text-zinc-400 rounded-lg">
                                                <ChevronRight size={16} />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </td>
                            </tr>

                            {/* Filas Hijas (Solo Desktop) */}
                            {hasMultiple && isExpanded && group.rentals.map((rental) => {
                              const pState = paymentStateMap.get(rental.id)?.state || 'not_applicable';
                              return (
                                <tr 
                                  key={rental.id}
                                  onClick={() => {
                                    setSelectedRentalId(rental.id);
                                    if (window.innerWidth < 768) setIsMobileDetailOpen(true);
                                  }}
                                  className={cn(
                                    "hidden md:table-row hover:bg-zinc-50 transition-colors cursor-pointer group",
                                    selectedRentalId === rental.id ? "bg-zinc-50 ring-1 ring-inset ring-zinc-200" : ""
                                  )}
                                >
                                  <td className="px-6 py-3 pl-14">
                                    <div className="flex items-center gap-3">
                                      <CornerDownRight size={14} className="text-zinc-300" />
                                      <div className="space-y-0.5">
                                        <p className="font-bold text-zinc-600 text-[11px] uppercase tracking-tight">{rental.project_name || 'Renta Individual'}</p>
                                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest truncate max-w-[200px]">{rental.location || 'Sin ubicación'}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-3">
                                    <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-bold">
                                      {rental.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0}
                                    </div>
                                  </td>
                                  <td className="px-6 py-3 text-zinc-400 text-[10px] font-bold">
                                    {formatLocalDate(rental.start_date)}
                                  </td>
                                  <td className="px-6 py-3 text-zinc-400 text-[10px] font-bold">
                                    {rental.contractual_end_date ? formatLocalDate(rental.contractual_end_date) : '-'}
                                  </td>
                                  <td className="px-6 py-3 text-right text-zinc-500 font-bold text-[11px]">
                                    {formatCurrency(calculateTotal(rental))}
                                  </td>
                                  <td className="px-6 py-3">
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                      pState === 'confirmed' ? "text-emerald-700 bg-emerald-50" :
                                      pState === 'pending' ? "text-amber-700 bg-amber-50" :
                                      "text-zinc-500 bg-zinc-50"
                                    )}>
                                      {pState === 'confirmed' ? 'Confirmado' : pState === 'pending' ? 'Pendiente' : 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                    <span className={cn(
                                      "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border",
                                      getStatusColor(rental.status)
                                    )}>
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
              <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                <span>Mostrando {groupedRentals.length} clientes · {filteredRentals.length} rentas</span>
              </div>
            </div>
          </div>

          {/* Right Column (1/3) */}
          <div className="hidden md:block lg:col-span-4 space-y-6">
            
            {/* Próximos Vencimientos */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 md:p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Próximos Vencimientos</h2>
                <CalendarClock className="w-5 h-5 text-zinc-400" />
              </div>
              <div className="p-4 md:p-6">
                {upcomingExpirations.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-zinc-500 italic">No hay vencimientos próximos.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingExpirations.map((exp) => (
                      <div 
                        key={exp.rentalId}
                        className="flex items-center gap-4 p-3 rounded-2xl border border-zinc-100 hover:border-zinc-200 transition-all cursor-pointer group"
                        onClick={() => setSelectedRentalId(exp.rentalId)}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border",
                          exp.urgency === 'red' ? "bg-rose-50 border-rose-100 text-rose-600" :
                          exp.urgency === 'orange' ? "bg-amber-50 border-amber-100 text-amber-600" :
                          "bg-zinc-50 border-zinc-100 text-zinc-600"
                        )}>
                          <span className="text-[10px] font-black">{format(exp.date, 'dd')}</span>
                          <span className="text-[8px] font-bold uppercase">{format(exp.date, 'MMM', { locale: es })}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-zinc-900 uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">{exp.client}</p>
                          <p className="text-[10px] text-zinc-500 font-bold mt-0.5">Vence en {exp.days} {exp.days === 1 ? 'día' : 'días'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-black text-zinc-900">{formatCurrency(exp.amount)}</p>
                          <ChevronRight size={14} className="text-zinc-300 ml-auto mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel de Detalle Avanzado (Desktop Only) */}
            <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden flex flex-col sticky top-8">
              {selectedRental ? (
                <>
                  <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
                    <div className="flex justify-between items-start mb-4">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm",
                        getStatusColor(selectedRental.status)
                      )}>
                        {getStatusLabel(selectedRental.status)}
                      </span>
                      <button 
                        onClick={() => { setEditingRentalId(selectedRental.id); setIsFormOpen(true); }}
                        className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <h2 className="text-base font-black text-zinc-900 uppercase tracking-tight leading-tight">{selectedRental.customer_name}</h2>
                    <p className="text-[10px] text-zinc-500 font-bold mt-2 flex items-center gap-2 uppercase">
                      <MapPin className="w-3 h-3" /> {[selectedRental.project_name, selectedRental.location].filter(Boolean).join(' - ') || 'Sin ubicación'}
                    </p>
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-8">
                    {/* Detalles Operativos */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Inicio</p>
                        <p className="text-xs font-black text-zinc-900">{formatLocalDate(selectedRental.start_date)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Vencimiento</p>
                        <p className="text-xs font-black text-zinc-900">{formatLocalDate(selectedRental.contractual_end_date) || '-'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Importe</p>
                        <p className="text-xs font-black text-zinc-900">{formatCurrency(calculateTotal(selectedRental))}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Estado Pago</p>
                        <p className="text-xs font-black text-zinc-900">
                          {getPaymentStatusLabel(paymentStateMap.get(selectedRental.id)?.state || 'not_applicable')}
                        </p>
                      </div>
                    </div>

                    {/* Contenedores */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Equipos asignados</h3>
                        <button 
                          onClick={() => { setEditingItem(null); setItemModalOpen(true); }}
                          className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1 uppercase"
                        >
                          <Plus className="w-3 h-3" /> Agregar
                        </button>
                      </div>
                      <div className="space-y-2">
                        {selectedRental.items && selectedRental.items.length > 0 ? (
                          selectedRental.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-zinc-50 p-3 rounded-xl border border-zinc-100 group">
                              <span className="text-[11px] font-bold text-zinc-700 truncate">{item.equipment_description || 'Equipo'}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-zinc-900 bg-white px-2 py-0.5 rounded-lg border border-zinc-200">x{item.quantity}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => { setEditingItem(item); setItemModalOpen(true); }} className="p-1 text-zinc-400 hover:text-indigo-600"><Edit2 size={12} /></button>
                                  <button onClick={() => { if(window.confirm('¿Eliminar equipo?')) removeRentalItem(item.id, selectedRental.id); }} className="p-1 text-zinc-400 hover:text-rose-600"><Trash2 size={12} /></button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-zinc-400 font-bold uppercase italic text-center py-4 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">Sin equipos</p>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="space-y-3 pt-4 border-t border-zinc-100">
                      {selectedRental.customer_phone && (
                        <button 
                          onClick={() => {
                            const msg = `Hola ${selectedRental.customer_name}, te contacto de Creativos Espacios referente a tu renta...`;
                            window.open(buildWhatsAppUrl(selectedRental.customer_phone!, msg), '_blank');
                          }}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                        >
                          <MessageCircle size={16} /> WhatsApp
                        </button>
                      )}
                      
                      {selectedRental.status === 'active' && (
                        <div className="grid grid-cols-1 gap-2">
                          <button onClick={() => setRenewModalOpen(true)} className="w-full py-3 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-zinc-900/10">Renovar</button>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setCompleteModalOpen(true)} className="py-3 bg-white border border-zinc-200 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:bg-emerald-50">Finalizar</button>
                            <button onClick={() => setCancelModalOpen(true)} className="py-3 bg-white border border-zinc-200 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:bg-rose-50">Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Historial */}
                    <div className="space-y-4 pt-4 border-t border-zinc-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Actividad</h3>
                        <button onClick={() => setFollowUpModalOpen(true)} className="text-zinc-400 hover:text-zinc-900"><Plus size={16} /></button>
                      </div>
                      <div className="space-y-4">
                        {loadingActivities ? (
                          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-zinc-300" /></div>
                        ) : activities.length === 0 ? (
                          <p className="text-[10px] text-zinc-400 italic text-center uppercase font-bold">Sin actividad</p>
                        ) : (
                          activities.map(activity => (
                            <div key={activity.id} className="relative pl-4 border-l border-zinc-100 space-y-1">
                              <div className="absolute -left-[4.5px] top-1 w-2 h-2 rounded-full bg-zinc-300 border-2 border-white"></div>
                              <p className="text-[10px] font-black text-zinc-900 uppercase">{activity.activity_type}</p>
                              <p className="text-[10px] text-zinc-500 leading-snug">{activity.description}</p>
                              <p className="text-[8px] text-zinc-400 font-bold uppercase">{formatShortDate(activity.created_at)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-4 bg-zinc-50/50">
                  <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center text-zinc-200">
                    <Building2 size={32} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Selecciona una renta</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Detail Panel */}
      <RentalDetailPanel 
        rental={selectedRental}
        isOpen={isMobileDetailOpen}
        onClose={() => setIsMobileDetailOpen(false)}
        onEdit={(id) => { setEditingRentalId(id); setIsFormOpen(true); }}
        onRenew={(id) => { setSelectedRentalId(id); setRenewModalOpen(true); }}
        onComplete={(id) => { setSelectedRentalId(id); setCompleteModalOpen(true); }}
        onCancel={(id) => { setSelectedRentalId(id); setCancelModalOpen(true); }}
        onAddActivity={(id) => { setSelectedRentalId(id); setFollowUpModalOpen(true); }}
        onManageItems={(id) => { setSelectedRentalId(id); setItemModalOpen(true); }}
        onUpdateContract={(id) => { setSelectedRentalId(id); setContractLinkModalOpen(true); }}
        activities={activities}
        loadingActivities={loadingActivities}
        paymentStatus={selectedRental ? {
          state: paymentStateMap.get(selectedRental.id)?.state || 'not_applicable',
          label: getPaymentStatusLabel(paymentStateMap.get(selectedRental.id)?.state || 'not_applicable'),
          color: getPaymentStatusColor(paymentStateMap.get(selectedRental.id)?.state || 'not_applicable')
        } : undefined}
      />

      {/* Modals */}
      <RentalFormModal 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setFormInitialFocus(undefined); }} 
        existingRentals={rentals}
        initialData={editingRentalId ? rentals.find(r => r.id === editingRentalId) || null : null}
        initialItems={editingRentalId ? rentals.find(r => r.id === editingRentalId)?.items || [] : []}
        initialFocus={formInitialFocus}
        onSubmit={async (rentalData, itemsData) => {
          if (editingRentalId) {
            await updateRental(editingRentalId, rentalData);
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
                  <input type="date" value={renewDate} onChange={e => setRenewDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
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
                  <input type="date" value={completeDate} onChange={e => setCompleteDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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
                  <input type="date" value={cancelDate} onChange={e => setCancelDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-red-500 outline-none" />
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
                    <input name="desc" required defaultValue={editingItem?.equipment_description} className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                      <input name="qty" type="number" required min="1" defaultValue={editingItem?.quantity || 1} className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Subtotal (Unitario)</label>
                      <input name="subtotal" type="number" step="0.01" required min="0" defaultValue={editingItem?.subtotal_monthly || 0} className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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
                  <input type="url" id="receiptUrl" className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="https://..." />
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
                  <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="Ej: 5512345678" />
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
                  <input type="url" value={newContractLink} onChange={e => setNewContractLink(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-3 md:py-2 text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="https://..." />
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

// Componente KpiCard Refactorizado AAA
const KpiCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: 'blue' | 'orange' | 'red' | 'amber' | 'gray' | 'green' }) => {
  const iconBgMap = {
    blue: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    red: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    gray: 'bg-zinc-50 text-zinc-500 border-zinc-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };

  return (
    <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.98]">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", iconBgMap[color])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] leading-tight truncate">{title}</p>
        <p className="text-lg font-black text-zinc-900 mt-1 truncate tracking-tight">{value}</p>
      </div>
    </div>
  );
};
