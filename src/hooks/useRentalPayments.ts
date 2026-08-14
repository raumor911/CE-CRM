import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { RentalPayment, RentalActivity, Rental } from '../types';
import { useAuth } from '../context/AuthContext';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRentals } from './useRentals'; // To call addRentalActivity if needed, or we can just insert directly.

export const useRentalPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Calcula el periodo actual en la zona horaria local (asumiremos que date-fns hace un buen trabajo)
  const getCurrentPeriodString = () => {
    return format(startOfMonth(new Date()), 'yyyy-MM-01');
  };

  const ensureCurrentMonthPayments = useCallback(async (activeRentals: Rental[]) => {
    if (!activeRentals.length) return;
    
    setLoading(true);
    setError(null);
    try {
      const currentPeriod = getCurrentPeriodString();

      // Preparar los pagos que deberían existir
      const paymentsToUpsert = activeRentals.map(rental => {
        // Calcular expected_amount
        let expectedAmount = rental.monthly_amount_total;
        // Si no tenemos items no podemos calcular SUM(rental_items.monthly_total) de forma síncrona, 
        // pero la regla dice usar rentals.monthly_amount_total.
        // Asumimos que activeRentals tiene ese valor actualizado.
        
        return {
          rental_id: rental.id,
          payment_period: currentPeriod,
          expected_amount: expectedAmount,
          created_by: user?.id,
          status: 'pending_confirmation'
        };
      });

      // Upsert ignores conflicts or updates (we only want to insert if missing, so we use upsert with onConflict)
      const { error: upsertError } = await supabase
        .from('rental_payments')
        .upsert(paymentsToUpsert, { 
          onConflict: 'rental_id, payment_period',
          ignoreDuplicates: true // No sobrescribir pagos ya existentes
        });

      if (upsertError) throw upsertError;

      // Despues de asegurarnos, recargamos los pagos del mes
      await getCurrentMonthPayments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('Error in ensureCurrentMonthPayments:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getCurrentMonthPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentPeriod = getCurrentPeriodString();
      
      const { data, error: fetchError } = await supabase
        .from('rental_payments')
        .select('*')
        .eq('payment_period', currentPeriod)
        .order('created_at', { ascending: false });

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
      const currentPeriod = getCurrentPeriodString();
      const now = new Date().toISOString();

      // 1. Actualizar rental_payments
      const { error: paymentError } = await supabase
        .from('rental_payments')
        .update({
          status: 'confirmed',
          confirmed_at: now,
          confirmed_by: user?.id,
          receipt_url: optionalReceiptUrl || null,
          notes: optionalNotes || null,
          updated_at: now
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // 2. Actualizar rentals
      const { error: rentalError } = await supabase
        .from('rentals')
        .update({
          payment_status: 'current',
          updated_by: user?.id,
          updated_at: now
        })
        .eq('id', rentalId);

      if (rentalError) throw rentalError;

      // 3. Registrar actividad
      const periodLabel = format(startOfMonth(new Date()), 'MMMM \'de\' yyyy', { locale: es });
      
      const activityData = {
        rental_id: rentalId,
        activity_type: 'monthly_payment_confirmed',
        description: `Pago de ${periodLabel} confirmado`,
        previous_data: {
          payment_id: paymentId,
          payment_period: currentPeriod,
          expected_amount: expectedAmount,
          before: { status: 'pending_confirmation' },
          after: { status: 'confirmed' },
          receipt_url: optionalReceiptUrl || null
        },
        created_by: user?.id
      };

      const { error: activityError } = await supabase
        .from('rental_activities')
        .insert([activityData]);

      if (activityError) throw activityError;

      // Refrescar estado local
      setPayments(prev => prev.map(p => 
        p.id === paymentId 
          ? { ...p, status: 'confirmed', confirmed_at: now, receipt_url: optionalReceiptUrl || null, notes: optionalNotes || null, updated_at: now }
          : p
      ));

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
      const currentPeriod = getCurrentPeriodString();

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
      // Necesitamos obtener la última actividad de payment_follow_up para estos pagos.
      // Como Supabase no tiene una forma sencilla de agrupar por JSONB en la consulta básica,
      // traemos todas las actividades recientes de tipo payment_follow_up y filtramos en cliente.
      
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
        .select('*, confirmed_by_user:confirmed_by(email)') // Asumiendo que podemos unir con users o algo así
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
    ensureCurrentMonthPayments,
    getCurrentMonthPayments,
    confirmMonthlyPayment,
    registerPaymentFollowUp,
    getPaymentFollowUps,
    getPaymentDetail
  };
};
