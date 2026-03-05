import { supabase } from './supabase';
import { Lead } from '../types';

export const importLeadsFromCSV = async (csvText: string, targetStage: 'Ingreso' | 'Briefing' | 'Propuesta' | 'Negociación' | 'Cierre' = 'Ingreso') => {
  const lines = csvText.split('\n');
  // Find the header line to start parsing
  const headerIndex = lines.findIndex(l => l.includes('Oportunidad_ID') && l.includes('Nombre'));
  if (headerIndex === -1) return { success: false, message: 'No se encontró la fila de encabezados.' };

  const dataLines = lines.slice(headerIndex + 1);
  const leadsToInsert: Omit<Lead, 'id'>[] = [];

  for (const line of dataLines) {
    if (!line.trim() || line.startsWith(',,,,')) continue;
    
    // Improved CSV split for quoted values
    const parts: string[] = [];
    let currentPart = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(currentPart.trim());
        currentPart = '';
      } else {
        currentPart += char;
      }
    }
    parts.push(currentPart.trim());

    if (parts.length < 5) continue;

    const [
      id_opp,
      fecha_entrada,
      nombre,
      empresa,
      correo,
      telefono,
      zona,
      fuente_campana,
      fuente_conjunto,
      fuente_anuncio,
      tipo_cliente,
      uso_contenedor,
      entrega_estado,
      entrega_ciudad,
      tiempo_decision,
      presupuesto_rango,
      factibilidad,
      notas_factibilidad,
      sku_10ft,
      paquete,
      extras,
      condiciones_especiales,
      etapa_actual,
      fecha_etapa_actual,
      responsable,
      probabilidad,
      proximo_paso,
      fecha_siguiente,
      fecha_1ra_resp,
      fecha_ultimo_cont,
      motivo_perdida,
      dias_etapa,
      hrs_resp,
      dias_entrada,
      seguimiento_vencido,
      calificado,
      precio_cotizado,
      anticipo_esperado,
      anticipo_recibido,
      fecha_anticipo,
      margen,
      forecast7,
      forecast14,
      link_exp,
      link_wa,
      objecion,
      comentarios
    ] = parts.map(p => p.replace(/^"|"$/g, '').trim());

    // Skip if no name and no phone
    if (!nombre && !telefono) continue;

    const budget = parseFloat(precio_cotizado?.replace(/[^0-9.-]+/g, "")) || 0;

    const lead: Omit<Lead, 'id'> = {
      project_name: empresa || `Proyecto ${id_opp || 'Sin ID'}`,
      lead_name: nombre || 'Cliente Potencial',
      email: correo || '',
      phone: telefono || '',
      budget: budget,
      stage: targetStage,
      category: 'Proyecto',
      last_activity: fecha_ultimo_cont || fecha_entrada || new Date().toISOString(),
      sentiment_label: 'Entusiasta',
      main_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
      created_at: fecha_entrada ? new Date(fecha_entrada).toISOString() : new Date().toISOString(),
      ai_notes: `ID: ${id_opp}. Zona: ${zona}. Uso: ${uso_contenedor}. SKU: ${sku_10ft}. Comentarios: ${comentarios || ''}. Próximo paso: ${proximo_paso || ''}`,
    };

    leadsToInsert.push(lead);
  }

  if (leadsToInsert.length === 0) return { success: false, message: 'No se encontraron datos válidos.' };

  const { error } = await supabase.from('leads').insert(leadsToInsert);

  if (error) {
    console.error('Error importing leads:', error);
    return { success: false, message: error.message };
  }

  return { success: true, count: leadsToInsert.length };
};
