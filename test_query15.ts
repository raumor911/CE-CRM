import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'fin_expense_categories');
  console.log('Policies:', data, error);
}
run();
