import { supabase } from '../../lib/supabase';
import { FinanceCollectedIncomeResult } from '../types';

export const rentalIncomeAdapter = {
  async getCollectedRentalIncome(startDate: string, endDate: string): Promise<FinanceCollectedIncomeResult> {
    const { data, error } = await supabase
      .from('rentals')
      .select('id, customer_name, project_name, start_date, effective_end_date, status, monthly_amount_total, items:rental_items(monthly_total)');

    if (error) throw error;

    const items = (data || [])
      .filter((rental: any) => {
        // Rentas activas en el mes
        if (rental.start_date > endDate) return false;
        if (rental.status === 'active') return true;
        if (rental.effective_end_date && rental.effective_end_date >= startDate) return true;
        return false;
      })
      .map((rental: any) => {
        const rentalTotal = rental.monthly_amount_total || rental.items?.reduce((sum: number, item: any) => sum + (Number(item.monthly_total) || 0), 0) || 0;
        
        return {
          source_id: rental.id,
          source_type: 'RENTAL' as const,
          label: rental.project_name
            ? `${rental.customer_name} · ${rental.project_name}`
            : rental.customer_name,
          amount: Number(rentalTotal),
          collected_at: rental.start_date, // Usamos start_date como referencia temporal
          notes: 'Valor mensual de renta (activa en el periodo)',
        };
      })
      .filter(item => item.amount > 0);

    return {
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      dataGapNotes: [
        'Rentas: se muestra el valor mensual total de las rentas activas durante el periodo seleccionado, independientemente de si fueron cobradas o no.',
      ],
    };
  },
};

export type RentalIncomeAdapter = typeof rentalIncomeAdapter;
