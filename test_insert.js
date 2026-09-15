import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('register_inventory_product', {
    p_product_type: 'Oficina',
    p_physical_number: 'TEST-001',
    p_condition: 'Nuevo',
    p_location: 'Patio',
    p_location_detail: '',
    p_operational_status: 'Disponible',
    p_available_for_sale: true,
    p_available_for_rent: true,
    p_available_for_modification: true,
    p_notes: '',
    p_rental_id: null
  });
  console.log("Result:", data, error);
}
run();
