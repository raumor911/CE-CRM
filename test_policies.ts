import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY! }
  });
  const text = await res.json();
  const def = text.components?.schemas?.fin_payroll_profiles || text.definitions?.fin_payroll_profiles;
  console.log('fin_payroll_profiles properties:', def ? Object.keys(def.properties) : 'Not found');
}
run();
