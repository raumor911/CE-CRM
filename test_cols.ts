import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { error: e1 } = await supabase.from('fin_payroll_profiles').insert({
    person_name: 'Test', area: 'Test', periodicity: 'MONTHLY', current_period_amount: 100,
    estimated_monthly_cost: 100, start_date: '2026-01-01', active: true,
    user_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log('With user_id:', e1);
  
  const { error: e2 } = await supabase.from('fin_payroll_profiles').insert({
    person_name: 'Test', area: 'Test', periodicity: 'MONTHLY', current_period_amount: 100,
    estimated_monthly_cost: 100, start_date: '2026-01-01', active: true,
    created_by: '00000000-0000-0000-0000-000000000000'
  });
  console.log('With created_by:', e2);
}
run();
