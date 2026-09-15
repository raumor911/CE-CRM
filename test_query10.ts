import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase
    .from('fin_expenses')
    .select('*')
    .limit(1);
  console.log('Error:', error);
  console.log('Keys:', data && data.length > 0 ? Object.keys(data[0]) : 'No data');
}
run();
