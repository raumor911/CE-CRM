import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/fin_payroll_profiles`, {
    method: 'OPTIONS',
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY! }
  });
  console.log(await res.text());
}
run();
