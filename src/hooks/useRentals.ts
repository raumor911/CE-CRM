import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Rental, RentalItem, RentalActivity } from '../types';
import { useAuth } from '../context/AuthContext';

export type RentalWithItems = Rental & {
  items: RentalItem[];
};

export const useRentals = () => {
  const { user } = useAuth();
  const [rentals, setRentals] = useState<RentalWithItems[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('rentals')
        .select('*, rental_items (*)')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Mapeamos 'rental_items' al campo 'items' requerido
      const formattedData: RentalWithItems[] = (data || []).map((rental) => ({
        ...rental,
        items: rental.rental_items || [],
      }));

      setRentals(formattedData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching rentals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRental = async (
    rentalData: Partial<Omit<Rental, 'id' | 'created_at' | 'updated_at'>>,
    itemsData: Omit<RentalItem, 'id' | 'rental_id' | 'created_at' | 'updated_at'>[]
  ) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Insertar la renta
      const { data: rental, error: rentalError } = await supabase
        .from('rentals')
        .insert([{
          ...rentalData,
          created_by: user?.id,
          updated_by: user?.id
        }])
        .select()
        .single();

      if (rentalError) throw rentalError;

      let insertedItems: RentalItem[] = [];

      // 2. Insertar los items relacionados si existen
      if (itemsData && itemsData.length > 0) {
        const itemsToInsert = itemsData.map(item => ({
          ...item,
          rental_id: rental.id
        }));

        const { data: items, error: itemsError } = await supabase
          .from('rental_items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) throw itemsError;
        insertedItems = items || [];
      }

      const newRentalWithItems: RentalWithItems = {
        ...rental,
        items: insertedItems
      };

      // Actualizar el estado local
      setRentals(prev => [newRentalWithItems, ...prev]);

      // Registrar actividad de creación
      await addRentalActivity(rental.id, 'Creación', 'Renta creada exitosamente');

      return newRentalWithItems;
    } catch (err: any) {
      setError(err.message);
      console.error('Error creating rental:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRental = async (
    id: string,
    updates: Partial<Omit<Rental, 'id' | 'created_at' | 'created_by'>>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data: updatedRental, error: updateError } = await supabase
        .from('rentals')
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Actualizar el estado local preservando los items existentes
      setRentals(prev =>
        prev.map(r =>
          r.id === id
            ? { ...r, ...updatedRental, items: r.items }
            : r
        )
      );

      return updatedRental;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating rental:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- NUEVAS OPERACIONES ---

  // 1. Actividades de renta
  const getRentalActivities = async (rentalId: string): Promise<RentalActivity[]> => {
    try {
      const { data, error } = await supabase
        .from('rental_activities')
        .select('*')
        .eq('rental_id', rentalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RentalActivity[];
    } catch (err) {
      console.error('Error fetching rental activities:', err);
      return [];
    }
  };

  const addRentalActivity = async (
    rentalId: string,
    activityType: string,
    description: string,
    previousData?: any
  ) => {
    try {
      const { error: activityError } = await supabase
        .from('rental_activities')
        .insert([{
          rental_id: rentalId,
          activity_type: activityType,
          description,
          previous_data: previousData || null,
          created_by: user?.id
        }]);

      if (activityError) throw activityError;
    } catch (err) {
      console.error('Error adding rental activity:', err);
    }
  };

  // 2. Recalcular Totales
  const recalculateTotals = async (rentalId: string) => {
    try {
      const { data: items, error: itemsError } = await supabase
        .from('rental_items')
        .select('*')
        .eq('rental_id', rentalId);

      if (itemsError) throw itemsError;

      let subtotal_monthly = 0;
      let tax_monthly = 0;
      let monthly_amount_total = 0;
      let return_freight_total = 0;

      if (items && items.length > 0) {
        items.forEach(item => {
          subtotal_monthly += Number(item.subtotal_monthly || 0);
          tax_monthly += Number(item.tax_monthly || 0);
          monthly_amount_total += Number(item.monthly_total || 0);
          return_freight_total += Number(item.return_freight_cost || 0);
        });
      }

      const updates = {
        subtotal_monthly,
        tax_monthly,
        monthly_amount_total,
        return_freight_total
      };

      await updateRental(rentalId, updates);

      // Registrar actividad del recálculo
      await addRentalActivity(
        rentalId, 
        'Recálculo de Totales', 
        'Se recalcularon los totales de la renta por cambios en los artículos.'
      );

    } catch (err) {
      console.error('Error recalculating totals:', err);
    }
  };

  // 3. Operaciones de artículos (Rental Items)
  const addRentalItem = async (
    rentalId: string,
    itemData: Omit<RentalItem, 'id' | 'rental_id' | 'created_at' | 'updated_at'>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data: newItem, error: itemError } = await supabase
        .from('rental_items')
        .insert([{
          ...itemData,
          rental_id: rentalId
        }])
        .select()
        .single();

      if (itemError) throw itemError;

      // Actualizar estado local
      setRentals(prev => prev.map(r => 
        r.id === rentalId ? { ...r, items: [...r.items, newItem] } : r
      ));

      await recalculateTotals(rentalId);

      return newItem;
    } catch (err: any) {
      setError(err.message);
      console.error('Error adding rental item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateRentalItem = async (
    itemId: string,
    rentalId: string,
    updates: Partial<Omit<RentalItem, 'id' | 'rental_id' | 'created_at'>>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { data: updatedItem, error: updateError } = await supabase
        .from('rental_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Actualizar estado local
      setRentals(prev => prev.map(r => 
        r.id === rentalId 
          ? { ...r, items: r.items.map(i => i.id === itemId ? updatedItem : i) }
          : r
      ));

      await recalculateTotals(rentalId);

      return updatedItem;
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating rental item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeRentalItem = async (itemId: string, rentalId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('rental_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      // Actualizar estado local
      setRentals(prev => prev.map(r => 
        r.id === rentalId 
          ? { ...r, items: r.items.filter(i => i.id !== itemId) }
          : r
      ));

      await recalculateTotals(rentalId);
    } catch (err: any) {
      setError(err.message);
      console.error('Error removing rental item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 4. Cambiar estado de pago
  const changePaymentStatus = async (rentalId: string, status: 'current' | 'pending_confirmation') => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      await updateRental(rentalId, { payment_status: status });
      await addRentalActivity(
        rentalId, 
        'Cambio de Estado de Pago', 
        `Estado de pago cambiado a ${status === 'current' ? 'Al corriente' : 'Pendiente de confirmación'}`,
        { previous_status: rental?.payment_status }
      );
    } catch (err) {
      console.error('Error changing payment status:', err);
      throw err;
    }
  };

  // 5. Renovar renta
  const renewRental = async (rentalId: string, newEndDate: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      await updateRental(rentalId, { contractual_end_date: newEndDate });
      await addRentalActivity(
        rentalId, 
        'Renovación', 
        `Renta renovada hasta ${newEndDate}`,
        { previous_end_date: rental?.contractual_end_date }
      );
    } catch (err) {
      console.error('Error renewing rental:', err);
      throw err;
    }
  };

  // 6. Completar renta
  const completeRental = async (rentalId: string, reason?: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      const updates = { 
        status: 'completed' as const, 
        effective_end_date: new Date().toISOString(),
        ...(reason ? { completion_reason: reason } : {})
      };
      await updateRental(rentalId, updates);
      await addRentalActivity(
        rentalId, 
        'Finalización', 
        `Renta completada${reason ? `: ${reason}` : ''}`,
        { previous_status: rental?.status }
      );
    } catch (err) {
      console.error('Error completing rental:', err);
      throw err;
    }
  };

  // 7. Cancelar renta
  const cancelRental = async (rentalId: string, reason: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      const updates = { 
        status: 'cancelled' as const, 
        effective_end_date: new Date().toISOString(),
        cancellation_reason: reason 
      };
      await updateRental(rentalId, updates);
      await addRentalActivity(
        rentalId, 
        'Cancelación', 
        `Renta cancelada: ${reason}`,
        { previous_status: rental?.status }
      );
    } catch (err) {
      console.error('Error cancelling rental:', err);
      throw err;
    }
  };

  return {
    rentals,
    loading,
    error,
    fetchRentals,
    createRental,
    updateRental,
    getRentalActivities,
    addRentalActivity,
    recalculateTotals,
    addRentalItem,
    updateRentalItem,
    removeRentalItem,
    changePaymentStatus,
    renewRental,
    completeRental,
    cancelRental
  };
};
