import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: expenses } = await supabase.from('fin_expenses').select('*');
  const { data: rec } = await supabase.from('fin_recurring_occurrences').select('*');
  const { data: pay } = await supabase.from('fin_payroll_periods').select('*');
  console.log('Expenses:', expenses);
  console.log('Rec:', rec);
  console.log('Pay:', pay);
}
run();
