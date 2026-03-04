import { Lead } from './types';

export const MOCK_LEADS: Lead[] = [
  {
    id: "uuid-1",
    project_name: "Residencia Lomas",
    stage: "Propuesta",
    budget: 15000,
    last_activity: "2026-03-01T10:00:00",
    sentiment_label: "Entusiasta",
    main_image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    lead_name: "Carlos Ruiz",
    email: "carlos.ruiz@example.com",
    phone: "+52 55 1234 5678",
    category: "Proyecto",
    is_priority: true
  },
  {
    id: "uuid-2",
    project_name: "Oficinas Tech",
    stage: "Negociación",
    budget: 45000,
    last_activity: "2026-02-25T08:00:00",
    sentiment_label: "Preocupado",
    main_image_url: "https://images.unsplash.com/photo-1497366216548-37526070297c",
    lead_name: "Ana García",
    email: "ana.garcia@example.com",
    phone: "+52 55 8765 4321",
    category: "Proyecto",
    ai_notes: "El cliente está preocupado por los plazos de entrega de la carpintería.",
    price_history: [{ date: '2026-02-20', amount: 48000 }, { date: '2026-02-25', amount: 45000 }]
  },
  {
    id: "uuid-3",
    project_name: "Apartamento Minimal",
    stage: "Ingreso",
    budget: 12000,
    last_activity: new Date().toISOString(),
    sentiment_label: "Dudoso",
    main_image_url: "https://images.unsplash.com/photo-1484154218962-a197022b5858",
    lead_name: "Juan Pérez",
    email: "juan.perez@email.com",
    phone: "+52 55 5555 5555",
    category: "10 ft Modificado",
    contact_info: "juan.perez@email.com"
  },
  {
    id: "uuid-4",
    project_name: "Casa de Campo",
    stage: "Briefing",
    budget: 85000,
    last_activity: "2026-03-02T15:00:00",
    sentiment_label: "Entusiasta",
    main_image_url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233",
    lead_name: "Sofía Martínez",
    email: "sofia.martinez@example.com",
    phone: "+52 55 4444 4444",
    category: "Proyecto",
    checklist_briefing: { m2: true, style_defined: true, deadlines: false }
  },
  {
    id: "uuid-5",
    project_name: "Loft Industrial",
    stage: "Cierre",
    budget: 28000,
    last_activity: "2026-03-03T09:00:00",
    sentiment_label: "Entusiasta",
    main_image_url: "https://images.unsplash.com/photo-1554995207-c18c203602cb",
    lead_name: "Roberto Gómez",
    email: "roberto.gomez@example.com",
    phone: "+52 55 3333 3333",
    category: "Compra Contenedor"
  }
];

export const STAGES = ["Ingreso", "Briefing", "Propuesta", "Negociación", "Cierre"] as const;
