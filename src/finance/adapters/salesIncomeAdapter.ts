import { supabase } from '../../lib/supabase';
import { FinanceCollectedIncomeResult } from '../types';

export const salesIncomeAdapter = {
  async getCollectedSalesIncome(startDate: string, endDate: string): Promise<FinanceCollectedIncomeResult> {
    const { data, error } = await supabase
      .from('leads')
      .select('id, lead_name, project_name, monto_anticipo_real, payment_confirmed, contract_signed_at, budget')
      .eq('payment_confirmed', true)
      .not('contract_signed_at', 'is', null)
      .gte('contract_signed_at', `${startDate}T00:00:00`)
      .lte('contract_signed_at', `${endDate}T23:59:59`)
      .order('contract_signed_at', { ascending: false });

    if (error) throw error;

    const items = (data || []).map((item: any) => {
      const actualAmount = Number(item.monto_anticipo_real ?? 0);
      const contractValue = Number(item.budget ?? 0);

      const value =
        Number.isFinite(actualAmount) && actualAmount > 0
          ? actualAmount
          : Number.isFinite(contractValue) && contractValue > 0
            ? contractValue
            : 0;

      return {
        source_id: item.id,
        source_type: 'SALE' as const,
        label: item.project_name ? `${item.lead_name} · ${item.project_name}` : item.lead_name,
        amount: value,
        collected_at: item.contract_signed_at,
        notes: actualAmount > 0 
          ? 'Anticipo real cobrado'
          : 'Valor de contrato firmado',
      };
    }).filter(item => item.amount > 0);

    return {
      items,
      total: items.reduce((sum, item) => sum + item.amount, 0),
      dataGapNotes: [
        'Ventas: se muestra el valor de la venta cerrada (anticipo real o valor de contrato si no hay anticipo).',
      ],
    };
  },
};

export type SalesIncomeAdapter = typeof salesIncomeAdapter;
