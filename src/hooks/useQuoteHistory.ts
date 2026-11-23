import { useCallback, useEffect, useState } from 'react';
import { useQuotesRepo } from '../context/QuotesRepoContext';
import type { Quote } from '../types';

export const QUOTE_HISTORY_LIMIT = 500;

/** Histórico de todas las cotizaciones (cualquier lead), de la más reciente a la más antigua. */
export function useQuoteHistory() {
  const repo = useQuotesRepo();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuotes(await repo.listAllQuotes(QUOTE_HISTORY_LIMIT));
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar el histórico de cotizaciones.');
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => { void reload(); }, [reload]);

  return { quotes, loading, error, reload };
}
