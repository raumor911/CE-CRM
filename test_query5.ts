import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY!,
    }
  });
  const text = await res.json();
  const def = text.definitions.fin_expense_categories;
  console.log('fin_expense_categories definition:', def ? Object.keys(def.properties) : 'Not found');
}
run();
