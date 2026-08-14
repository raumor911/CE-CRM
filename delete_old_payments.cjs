const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteOldPayments() {
  const { data, error } = await supabase
    .from('rental_payments')
    .delete()
    .lt('payment_period', '2026-08-01')
    .eq('status', 'pending_confirmation');

  if (error) {
    console.error("Error deleting old payments:", error);
  } else {
    console.log("Old pending payments deleted successfully.", data);
  }
}

deleteOldPayments();
