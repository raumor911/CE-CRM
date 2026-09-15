import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('fin_expense_categories')
    .select('id, code, name, nature, summary_bucket, is_operating_cost, is_active, sort_order, description');
  console.log('Error:', error);
  console.log('Data count:', data?.length);
}
run();
