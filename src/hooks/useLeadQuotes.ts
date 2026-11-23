import { useCallback, useEffect, useState } from 'react';
import { useQuotesRepo } from '../context/QuotesRepoContext';
import type { CreateQuoteInput, Quote, QuoteStatus } from '../types';

export function useLeadQuotes(leadId: string) {
  const repo = useQuotesRepo();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuotes(await repo.listQuotesByLead(leadId));
    } catch (e: any) {
      setError(e?.message ?? 'No se pudieron cargar las cotizaciones.');
    } finally {
      setLoading(false);
    }
  }, [repo, leadId]);

  useEffect(() => { void reload(); }, [reload]);

  return {
    quotes, loading, error, reload,
    createQuote: async (input: CreateQuoteInput) => { const q = await repo.createQuote(input); await reload(); return q; },
    updateQuote: async (quote: Quote, input: CreateQuoteInput) => { const q = await repo.updateQuote(quote.id, quote.updated_at, input); await reload(); return q; },
    transition: async (quote: Quote, to: QuoteStatus) => { const q = await repo.transitionQuote(quote.id, quote.updated_at, to); await reload(); return q; },
  };
}
