import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Rental, RentalItem, RentalActivity } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  cleanCustomerName,
  normalizeCustomerPhone,
} from '../utils/customerIdentity';

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

    const subtotalMonthly = itemsData.reduce(
      (total, item) =>
        total + Number(item.subtotal_monthly || 0) * Number(item.quantity || 1),
      0
    );

    const taxMonthly = itemsData.reduce(
      (total, item) => total + Number(item.tax_monthly || 0),
      0
    );

    const monthlyTotal = itemsData.reduce(
      (total, item) => total + Number(item.monthly_total || 0),
      0
    );

    const rentalPayload = {
      ...rentalData,

      customer_name: cleanCustomerName(
        rentalData.customer_name
      ),

      customer_phone:
        normalizeCustomerPhone(rentalData.customer_phone) || null,

      contractual_end_date:
        rentalData.contractual_end_date || null,

      status: 'active',
      payment_status: 'current',
      currency: 'MXN',

      subtotal_monthly: subtotalMonthly,
      tax_monthly: taxMonthly,
      monthly_amount_total: monthlyTotal,

      short_term_exception: false,
      historical_missing_end_date: false,

      created_by: user?.id,
      updated_by: user?.id,
    };

    let createdRental: Rental | null = null;

    try {
      const { data: rental, error: rentalError } = await supabase
        .from('rentals')
        .insert([rentalPayload])
        .select()
        .single();

      if (rentalError) {
        const msg = rentalError.message || '';
        console.error('Error insertando rentals:', rentalError);
        throw new Error('No fue posible crear la renta. Verifica los datos e intenta nuevamente.');
      }

      createdRental = rental;
      let insertedItems: RentalItem[] = [];

      if (itemsData && itemsData.length > 0) {
        const itemsToInsert = itemsData.map(item => ({
          ...item,
          rental_id: rental.id
        }));

        const { data: items, error: itemsError } = await supabase
          .from('rental_items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) {
          try {
            await supabase.from('rentals').delete().eq('id', rental.id);
          } catch (rollbackErr) {
            console.error('Error en compensación al eliminar renta huérfana:', rollbackErr);
          }
          console.error('Error insertando rental_items:', itemsError);
          throw new Error('La renta no fue registrada porque ocurrió un problema al guardar los equipos.');
        }
        insertedItems = items || [];
      }

      const newRentalWithItems: RentalWithItems = {
        ...rental,
        items: insertedItems
      };

      setRentals(previousRentals => [
        {
          ...createdRental!,
          items: insertedItems,
        },
        ...previousRentals,
      ]);

      try {
        await addRentalActivity(rental.id, 'created', 'Renta creada exitosamente', { after: rentalPayload });
      } catch (activityError) {
        console.error('La renta fue creada, pero no se registró la actividad:', activityError);
      }

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

      // Si es una actualización simple sin una función especializada que ya registre la actividad
      // podemos opcionalmente registrarla aquí. Por ahora, las actualizaciones específicas
      // (teléfono, enlace) se registrarán desde los componentes de UI.

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
  const getRentalActivities = useCallback(async (rentalId: string): Promise<RentalActivity[]> => {
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
  }, []);

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
      throw err;
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
        'updated', 
        'Se recalcularon los totales de la renta por cambios en los artículos.',
        { after: updates }
      );

    } catch (err) {
      console.error('Error recalculating totals:', err);
      throw err;
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

      await addRentalActivity(
        rentalId,
        'item_added',
        `Equipo agregado: ${newItem.equipment_description}`,
        { after: newItem }
      );

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

      const rental = rentals.find(r => r.id === rentalId);
      const previousItem = rental?.items.find(i => i.id === itemId);

      // Actualizar estado local
      setRentals(prev => prev.map(r => 
        r.id === rentalId 
          ? { ...r, items: r.items.map(i => i.id === itemId ? updatedItem : i) }
          : r
      ));

      await recalculateTotals(rentalId);

      await addRentalActivity(
        rentalId,
        'item_updated',
        `Equipo actualizado: ${updatedItem.equipment_description}`,
        { before: previousItem, after: updatedItem }
      );

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
      const rental = rentals.find(r => r.id === rentalId);
      const previousItem = rental?.items.find(i => i.id === itemId);

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

      if (previousItem) {
        await addRentalActivity(
          rentalId,
          'item_deleted',
          `Equipo eliminado: ${previousItem.equipment_description}`,
          { before: previousItem }
        );
      }
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
        'payment_status_changed', 
        `Estado de pago cambiado a ${status === 'current' ? 'Al corriente' : 'Pendiente de confirmación'}`,
        { 
          before: { payment_status: rental?.payment_status },
          after: { payment_status: status }
        }
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
      await updateRental(rentalId, { 
        contractual_end_date: newEndDate,
        historical_missing_end_date: false
      });
      await addRentalActivity(
        rentalId, 
        'renewed', 
        `Renta renovada hasta ${newEndDate}`,
        { 
          before: { contractual_end_date: rental?.contractual_end_date, historical_missing_end_date: rental?.historical_missing_end_date },
          after: { contractual_end_date: newEndDate, historical_missing_end_date: false }
        }
      );
    } catch (err) {
      console.error('Error renewing rental:', err);
      throw err;
    }
  };

  // 6. Completar renta
  const completeRental = async (rentalId: string, effectiveEndDate: string, reason?: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      const updates = { 
        status: 'completed' as const, 
        effective_end_date: effectiveEndDate,
        ...(reason ? { completion_reason: reason } : {})
      };
      await updateRental(rentalId, updates);
      await addRentalActivity(
        rentalId, 
        'completed', 
        `Renta completada${reason ? `: ${reason}` : ''}`,
        { 
          before: { status: rental?.status },
          after: { status: 'completed', effective_end_date: effectiveEndDate, completion_reason: reason }
        }
      );
    } catch (err) {
      console.error('Error completing rental:', err);
      throw err;
    }
  };

  // 7. Cancelar renta
  const cancelRental = async (rentalId: string, effectiveEndDate: string, reason: string) => {
    try {
      const rental = rentals.find(r => r.id === rentalId);
      const updates = { 
        status: 'cancelled' as const, 
        effective_end_date: effectiveEndDate,
        cancellation_reason: reason 
      };
      await updateRental(rentalId, updates);
      await addRentalActivity(
        rentalId, 
        'cancelled', 
        `Renta cancelada: ${reason}`,
        { 
          before: { status: rental?.status },
          after: { status: 'cancelled', effective_end_date: effectiveEndDate, cancellation_reason: reason }
        }
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
