import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data: user, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@ce.com', // guess based on normal setups, won't work without pass
    password: 'test'
  });
  console.log('Auth check:', authError ? authError.message : 'OK');
}
run();
