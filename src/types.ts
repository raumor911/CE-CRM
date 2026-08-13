export type Sentiment = 'Entusiasta' | 'Dudoso' | 'Preocupado' | string;

export interface Lead {
  id: string; // UUID
  project_name: string;
  stage: 'Ingreso' | 'Briefing' | 'Propuesta' | 'Cierre';
  budget?: number;
  last_activity: string;
  sentiment_label: Sentiment;
  main_image_url: string;
  lead_name: string;
  email?: string;
  phone: string;
  category: 'Compra Contenedor' | 'Proyecto' | '10 ft Modificado' | 'Renta Contenedor' | 'Renta Oficina 20 ft' | 'Cliente convertido';
  contact_info?: string;
  calendar_event_id?: string;
  ai_suggested_questions?: string[];
  whatsapp_interaction_count?: number;
  stage_entry_timestamp?: string;
  checklist_briefing?: {
    m2: boolean;
    deadlines: boolean;
  };
  ai_notes?: string;
  price_history?: { date: string; amount: number }[];
  is_priority?: boolean;
  is_archived?: boolean;
  archive_reason?: string;
  archived_at?: string;
  created_at?: string;
  assigned_to?: string;
  user_id?: string;
  payment_confirmed?: boolean;      // TRUE cuando se confirma el adelanto
  monto_anticipo_real?: number;     // Monto real depositado
  signed_at?: string;               // Timestamp de la firma/cierre
}

export interface LeadDocument {
  id: string;
  lead_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface Rental {
  id: string;
  lead_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  contact_name: string | null;
  contact_email: string | null;
  project_name: string | null;
  location: string | null;
  start_date: string;
  contractual_end_date: string | null;
  effective_end_date: string | null;
  legacy_current_period: string | null;
  subtotal_monthly: number | null;
  tax_monthly: number | null;
  monthly_amount_total: number | null;
  return_freight_total: number | null;
  currency: string | null;
  short_term_exception: boolean | null;
  short_term_reason: string | null;
  historical_missing_end_date: boolean | null;
  status: 'active' | 'completed' | 'cancelled';
  payment_status: 'current' | 'pending_confirmation';
  completion_reason: string | null;
  cancellation_reason: string | null;
  contract_reference_url: string | null;
  contract_reference_type: string | null;
  receipts_folder_url: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalItem {
  id: string;
  rental_id: string;
  equipment_description: string;
  quantity: number;
  subtotal_monthly: number;
  tax_monthly: number;
  monthly_total: number;
  return_freight_cost: number | null;
  notes: string | null;
  source_row_number: number | null;
  created_at: string;
  updated_at: string;
}

export interface RentalActivity {
  id: string;
  rental_id: string;
  activity_type: string;
  description: string;
  previous_data: any | null;
  created_by: string | null;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  type: 'Llamada' | 'WhatsApp' | 'Cita' | 'Diseño' | 'Presupuesto' | 'Nota';
  description: string;
  created_at: string;
}
