export type Sentiment = 'Entusiasta' | 'Dudoso' | 'Preocupado' | string;

export interface Lead {
  id: string; // UUID
  project_name: string;
  stage: 'Ingreso' | 'Briefing' | 'Propuesta' | 'Negociación' | 'Cierre';
  budget: number;
  last_activity: string;
  sentiment_label: Sentiment;
  main_image_url: string;
  lead_name: string;
  email: string;
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
  created_at?: string;
  assigned_to?: string;
  user_id?: string;
}
