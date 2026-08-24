import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, ProductRegistrationData } from '../types';
import { useAuth } from '../context/AuthContext';

export const useInventory = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('inventory_products')
        .select(`
          *,
          active_assignment:rental_inventory_assignments!left(
            rental_id,
            assigned_at,
            rental:rentals(
              customer_name,
              project_name
            )
          )
        `)
        .filter('rental_inventory_assignments.released_at', 'is', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform data to match Product interface with nested assignment
      const formattedData: Product[] = (data || []).map((p: any) => {
        const active_assignment = p.active_assignment?.[0] || null;
        return {
          ...p,
          active_assignment
        };
      });

      setProducts(formattedData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerProduct = async (data: ProductRegistrationData) => {
    setLoading(true);
    setError(null);
    try {
      const { data: product, error: rpcError } = await supabase.rpc('register_inventory_product', {
        p_product_type: data.product_type,
        p_physical_number: data.physical_number || null,
        p_condition: data.condition,
        p_location: data.location,
        p_location_detail: data.location_detail || null,
        p_operational_status: data.operational_status,
        p_available_for_sale: data.available_for_sale,
        p_available_for_rent: data.available_for_rent,
        p_available_for_modification: data.available_for_modification,
        p_notes: data.notes || null,
        p_rental_id: data.rental_id || null
      });

      if (rpcError) throw rpcError;

      // After successful RPC, we refetch to get the product with its assignment and triggers data
      // Although setProducts is faster, the RPC return might not include joined assignment data
      // or triggers might have modified fields. For consistency with assignments, we refetch.
      await fetchProducts();

      return product;
    } catch (err: any) {
      setError(err.message);
      console.error('Error registering product via RPC:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    loading,
    error,
    fetchProducts,
    registerProduct
  };
};
