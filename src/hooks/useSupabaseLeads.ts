import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';
import { useAuth } from '../context/AuthContext';

export function useSupabaseLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('last_activity', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching leads:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createLead = async (lead: Omit<Lead, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([{ ...lead, user_id: user?.id }])
        .select();

      if (error) throw error;
      
      if (data && data[0]) {
        setLeads(prev => {
          const exists = prev.some(l => l.id === data[0].id);
          return exists ? prev : [data[0], ...prev];
        });
      }
      
      return data?.[0];
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data) {
        setLeads(prev => prev.map(l => l.id === id ? data[0] : l));
      }
      return data?.[0];
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    if (!user) {
      setLeads([]);
      setLoading(false);
      return;
    }

    fetchLeads();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newLead = payload.new as Lead;
          setLeads(prev => {
            const exists = prev.some(l => l.id === newLead.id);
            if (exists) return prev;
            return [newLead, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedLead = payload.new as Lead;
          setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
        } else if (payload.eventType === 'DELETE') {
          setLeads(prev => prev.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads, user]);

  return { leads, loading, error, fetchLeads, createLead, updateLead };
}
