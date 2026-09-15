import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { query_text: "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'inventory_products';" });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(data);
  }
}
run();
