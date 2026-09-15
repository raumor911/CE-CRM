import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY! }
  });
  const text = await res.json();
  console.log('Schemas available:', Object.keys(text.definitions || text.components?.schemas || {}));
}
run();
