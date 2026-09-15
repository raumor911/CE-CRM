import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('fin_payroll_profiles').insert({
    person_name: 'Prueba',
    area: 'Prueba',
    periodicity: 'MONTHLY',
    current_period_amount: 1000,
    estimated_monthly_cost: 1000,
    start_date: '2026-09-14',
    active: true
  }).select('*');
  console.log('Error de insert:', error?.message);
}
run();
