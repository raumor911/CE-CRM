import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('fin_expense_categories')
    .select('id, code, name, nature, summary_bucket, is_operating_cost, is_active, sort_order, description')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  console.log('Error with ID:', error);
  console.log('Data count:', data?.length);
}
run();
