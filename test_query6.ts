import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: process.env.VITE_SUPABASE_ANON_KEY!,
    }
  });
  const text = await res.text();
  const match = text.match(/"fin_expense_categories":\{"type":"object","properties":\{([^}]+)\}/);
  if (match) {
    console.log(match[1]);
  } else {
    console.log("Not found with regex");
    // let's just grep the text
    const lines = text.split('"fin_expense_categories"');
    console.log("Occurrences:", lines.length - 1);
    if (lines.length > 1) {
      console.log(lines[1].substring(0, 300));
    }
  }
}
run();
