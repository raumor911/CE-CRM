import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { query_text: "SELECT view_definition FROM information_schema.views WHERE table_name = 'fin_v_inventory_costs'" });
  console.log("RPC:", data, error);
}
run();
