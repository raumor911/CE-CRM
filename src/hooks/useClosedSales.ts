import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ClosedSale {
  id: string;
  lead_name: string;
  project_name: string;
  budget: number | null;
  monto_anticipo_real: number | null;
  payment_confirmed: boolean;
  created_at: string | null;
  signed_at: string;
  is_archived: boolean;
}

export function useClosedSales() {
  const [closedSales, setClosedSales] = useState<ClosedSale[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClosedSales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          lead_name,
          project_name,
          budget,
          monto_anticipo_real,
          payment_confirmed,
          created_at,
          signed_at:contract_signed_at,
          is_archived
        `)
        .eq('payment_confirmed', true)
        .not('contract_signed_at', 'is', null)
        .order('contract_signed_at', { ascending: false });

      if (error) throw error;

      setClosedSales((data || []) as ClosedSale[]);
      setLoaded(true);
    } catch (error) {
      console.error("Error fetching closed sales:", error);
      setError(
        error instanceof Error
          ? error.message
          : 'No fue posible consultar los cierres'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    closedSales,
    loading,
    loaded,
    error,
    fetchClosedSales
  };
}
