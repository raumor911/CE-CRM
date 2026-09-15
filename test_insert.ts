import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  // We don't have an auth token here easily, but we can check if the table exists
  const { data, error } = await supabase.from('fin_payroll_profiles').select('*').limit(1);
  console.log('Select test:', error ? error.message : 'OK');
}
run();
