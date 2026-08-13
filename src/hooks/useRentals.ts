import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Rental, RentalItem } from '../types';
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
      const formattedData: RentalWithItems[] = (data || []).map((rental: any) => ({
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

  return {
    rentals,
    loading,
    error,
    fetchRentals,
    createRental,
    updateRental
  };
};
