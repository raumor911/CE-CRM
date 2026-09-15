import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('fin_expense_categories')
    .select('*')
    .eq('is_active', true);
  console.log('Error with is_active:', error);
}
run();
