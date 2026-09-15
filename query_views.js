import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  console.log("URL", process.env.VITE_SUPABASE_URL);
  
  // Try to query the view directly, if it exists we can just get one row.
  const { data, error } = await supabase.from('fin_v_monthly_expenses').select('*').limit(1);
  console.log("fin_v_monthly_expenses:", data, error);
}
run();
