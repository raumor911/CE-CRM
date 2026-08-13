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
  client_name: string;
  phone: string | null;
  project_location: string | null;
  start_date: string;
  contractual_end_date: string | null;
  actual_end_date: string | null;
  rental_status: 'active' | 'completed' | 'cancelled';
  payment_status: 'current' | 'pending_confirmation';
  lead_id: string | null;
  contract_link: string | null;
  receipts_link: string | null;
  notes: string | null;
  historical_missing_end_date: boolean;
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
