import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RentalPayment, RentalActivity, Rental } from '../types';
import { useAuth } from '../context/AuthContext';
import { format, startOfMonth, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { useCurrentBillingPeriod } from './useCurrentBillingPeriod';

// Helper to safely parse local date string YYYY-MM-DD
const parseLocalDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const calculateDueDate = (startDateStr: string, targetMonthDate: Date) => {
  const startDate = parseLocalDate(startDateStr);
  const startDay = startDate.getDate();
  
  // Get days in target month
  const targetYear = targetMonthDate.getFullYear();
  const targetMonth = targetMonthDate.getMonth();
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  
  const dueDay = Math.min(startDay, daysInTargetMonth);
  return format(new Date(targetYear, targetMonth, dueDay), 'yyyy-MM-dd');
};

export const useRentalPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentPeriod, hasPeriodChanged, acknowledgePeriodChange } = useCurrentBillingPeriod();

  const ensureCurrentMonthPayments = useCallback(async (period: string, activeRentals: Rental[]) => {
    if (!activeRentals.length) return;
    
    setLoading(true);
    setError(null);
    try {
      const currentPeriodDate = parseLocalDate(period);
      const paymentsToUpsert: any[] = [];

      activeRentals.forEach(rental => {
        const startDate = parseLocalDate(rental.start_date);
        let expectedAmount = rental.monthly_amount_total;
        
        // Solo generamos el pago para el mes actual
        let targetMonthDate = currentPeriodDate;
        
        // Si la renta comenzó en el mes actual o en el futuro, no generamos cobro este mes (el primer mes está cubierto)
        if (startDate >= currentPeriodDate) {
          return;
        }

        const periodStr = period;
        const dueDateStr = calculateDueDate(rental.start_date, targetMonthDate);

        // No deben generarse pagos posteriores a contractual_end_date
        if (rental.contractual_end_date) {
          const endDate = parseLocalDate(rental.contractual_end_date);
          const dueDate = parseLocalDate(dueDateStr);
          if (endDate && dueDate && isAfter(dueDate, endDate)) {
            return;
          }
        }
        
        paymentsToUpsert.push({
          rental_id: rental.id,
          payment_period: periodStr,
          payment_due_date: dueDateStr,
          expected_amount: expectedAmount,
          created_by: user?.id,
          status: 'pending_confirmation'
        });
      });

      if (paymentsToUpsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('rental_payments')
          .upsert(paymentsToUpsert, { 
            onConflict: 'rental_id, payment_period',
            ignoreDuplicates: true 
          });

        if (upsertError) throw upsertError;
      }

      // Instead of relying on a parameterless fetch, we should explicitly fetch for the period
      await getCurrentMonthPayments(period);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Error in ensureCurrentMonthPayments:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getCurrentMonthPayments = useCallback(async (period: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('rental_payments')
        .select('*')
        .eq('payment_period', period);

      if (fetchError) throw fetchError;
      
      setPayments(data || []);
      return data || [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Error fetching payments:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmMonthlyPayment = async (
    paymentId: string, 
    rentalId: string, 
    expectedAmount: number,
    optionalReceiptUrl: string = '', 
    optionalNotes: string = ''
  ) => {
    setLoading(true);
    setError(null);
    try {
      const periodLabel = format(startOfMonth(new Date()), 'MMMM \'de\' yyyy', { locale: es });

      const { error: rpcError } = await supabase.rpc('confirm_rental_payment', {
        p_payment_id: paymentId,
        p_rental_id: rentalId,
        p_expected_amount: expectedAmount,
        p_receipt_url: optionalReceiptUrl || null,
        p_notes: optionalNotes || null,
        p_user_id: user?.id,
        p_period_label: periodLabel,
        p_payment_period: currentPeriod
      });

      if (rpcError) throw rpcError;

      const now = new Date().toISOString();
      setPayments(prev => prev.map(p => 
        p.id === paymentId 
          ? { ...p, status: 'confirmed', confirmed_at: now, receipt_url: optionalReceiptUrl || null, notes: optionalNotes || null, updated_at: now }
          : p
      ));

      // Hacemos refetch de respaldo
      await getCurrentMonthPayments(currentPeriod);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Error confirming payment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerPaymentFollowUp = async (
    paymentId: string,
    rentalId: string,
    followUpType: string,
    description: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const activityData = {
        rental_id: rentalId,
        activity_type: 'payment_follow_up',
        description: description,
        previous_data: {
          payment_id: paymentId,
          payment_period: currentPeriod,
          follow_up_type: followUpType
        },
        created_by: user?.id
      };

      const { error: activityError } = await supabase
        .from('rental_activities')
        .insert([activityData]);

      if (activityError) throw activityError;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Error registering follow up:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getPaymentFollowUps = useCallback(async (paymentIds: string[]) => {
    if (!paymentIds.length) return {};
    
    try {
      const { data, error } = await supabase
        .from('rental_activities')
        .select('*')
        .eq('activity_type', 'payment_follow_up')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const latestFollowUps: Record<string, RentalActivity> = {};
      
      if (data) {
        data.forEach(activity => {
          const pId = activity.previous_data?.payment_id;
          if (pId && paymentIds.includes(pId) && !latestFollowUps[pId]) {
            latestFollowUps[pId] = activity;
          }
        });
      }

      return latestFollowUps;
    } catch (err) {
      console.error('Error fetching follow ups:', err);
      return {};
    }
  }, []);

  const getPaymentDetail = useCallback(async (paymentId: string) => {
    try {
      const { data, error } = await supabase
        .from('rental_payments')
        .select('*, confirmed_by_user:confirmed_by(email)')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching payment detail:', err);
      return null;
    }
  }, []);

  return {
    payments,
    loading,
    error,
    currentPeriod,
    hasPeriodChanged,
    acknowledgePeriodChange,
    ensureCurrentMonthPayments,
    getCurrentMonthPayments,
    confirmMonthlyPayment,
    registerPaymentFollowUp,
    getPaymentFollowUps,
    getPaymentDetail
  };
};