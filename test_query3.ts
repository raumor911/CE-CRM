import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.rpc('get_columns_for_table', { table_name: 'fin_expense_categories' });
  console.log(error);
  
  // if rpc doesn't exist, let's just do a REST query if possible or we can just fetch the row and see keys
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/fin_expense_categories?limit=1`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY!}`
    }
  });
  const text = await res.text();
  console.log('REST:', text);
}
run();
