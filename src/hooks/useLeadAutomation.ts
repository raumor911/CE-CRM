import { useState, useCallback } from 'react';
import { Lead, Sentiment } from '../types';

export function useLeadAutomation() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeSentiment = useCallback(async (notes: string): Promise<Sentiment> => {
    setIsAnalyzing(true);
    // Simulación de llamada a Edge Function de Supabase
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const sentiments: Sentiment[] = ['Entusiasta', 'Dudoso', 'Preocupado'];
    const result = sentiments[Math.floor(Math.random() * sentiments.length)];
    
    setIsAnalyzing(false);
    return result;
  }, []);

  const copyProposalLink = useCallback((lead: Lead) => {
    const link = `${window.location.origin}/propuesta/${lead.id}`;
    const template = `¡Hola! Aquí puedes ver la propuesta para ${lead.project_name}: ${link}`;
    
    navigator.clipboard.writeText(template);
    return template;
  }, []);

  const generatePaymentLink = useCallback((lead: Lead) => {
    // Simulación de generación de link de Stripe/Paypal
    return `https://checkout.stripe.com/pay/${lead.id}_${Date.now()}`;
  }, []);

  const scheduleBriefing = useCallback(async (lead: Lead) => {
    // Simulación de llamada a Edge Function 'schedule-briefing'
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      calendar_event_id: `cal_${Math.random().toString(36).substr(2, 9)}`,
      ai_suggested_questions: [
        "¿Qué tipo de iluminación natural prefiere para los espacios comunes?",
        "¿Tiene alguna preferencia por materiales sostenibles o reciclados?",
        "¿Cómo visualiza la integración del contenedor con el entorno exterior?"
      ],
      calendly_link: `https://calendly.com/rauvia-sales/briefing-${lead.id}`
    };
  }, []);

  const formatWhatsAppMessage = useCallback((lead: Lead) => {
    const message = `Hola ${lead.lead_name}, agendamos tu briefing para ${lead.project_name}`;
    return `https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
  }, []);

  return {
    analyzeSentiment,
    isAnalyzing,
    copyProposalLink,
    generatePaymentLink,
    scheduleBriefing,
    formatWhatsAppMessage
  };
}
