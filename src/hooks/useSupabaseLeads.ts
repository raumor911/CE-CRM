import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';

export function useSupabaseLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
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
  }, []);

  const createLead = async (lead: Omit<Lead, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([lead])
        .select();

      if (error) throw error;
      if (data) {
        setLeads(prev => [data[0], ...prev]);
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
    fetchLeads();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLeads(prev => [payload.new as Lead, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setLeads(prev => prev.map(l => l.id === payload.new.id ? payload.new as Lead : l));
        } else if (payload.eventType === 'DELETE') {
          setLeads(prev => prev.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  return { leads, loading, error, fetchLeads, createLead, updateLead };
}
