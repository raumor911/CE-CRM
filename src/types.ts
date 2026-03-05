export type Sentiment = 'Entusiasta' | 'Dudoso' | 'Preocupado' | string;

export interface Lead {
  id: string; // UUID
  project_name: string;
  stage: 'Ingreso' | 'Briefing' | 'Propuesta' | 'Negociación' | 'Cierre';
  budget?: number;
  last_activity: string;
  sentiment_label: Sentiment;
  main_image_url: string;
  lead_name: string;
  email?: string;
  phone: string;
  category: 'Compra Contenedor' | 'Proyecto' | '10 ft Modificado';
  contact_info?: string;
  calendar_event_id?: string;
  ai_suggested_questions?: string[];
  whatsapp_interaction_count?: number;
  stage_entry_timestamp?: string;
  checklist_briefing?: {
    m2: boolean;
    style_defined: boolean;
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

export interface LeadActivity {
  id: string;
  lead_id: string;
  user_id: string;
  type: 'Llamada' | 'WhatsApp' | 'Cita' | 'Diseño' | 'Presupuesto' | 'Nota';
  description: string;
  created_at: string;
}
