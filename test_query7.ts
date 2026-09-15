import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('fin_expense_categories')
    .insert([{ name: 'Test' }])
    .select('*');
  console.log('Insert Error:', error);
  console.log('Data:', data);
}
run();
