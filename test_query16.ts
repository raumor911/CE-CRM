import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
  console.log('No service key available to test RLS bypass.');
} else {
  const supabase = createClient(process.env.VITE_SUPABASE_URL!, serviceKey);
  supabase.from('fin_expense_categories').select('*').then(({data, error}) => {
    console.log('Service Role Data:', data?.length);
    console.log('Error:', error);
  });
}
