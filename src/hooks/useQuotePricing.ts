import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuotesRepo } from '../context/QuotesRepoContext';
import type { ContainerPrice, ExchangeRate, FolioSeries, QuoteType, ServicePrice } from '../types';
import type { ContainerPriceInput, ServicePriceInput } from '../lib/quotesRepo';

/** Catálogo de precios, tipo de cambio y series de folio. Una sola carga; cada guardado refresca el estado local. */
export function useQuotePricing() {
  const repo = useQuotesRepo();
  const [containers, setContainers] = useState<ContainerPrice[]>([]);
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [series, setSeries] = useState<FolioSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, s, r, f] = await Promise.all([
        repo.listContainerPrices(), repo.listServicePrices(), repo.listExchangeRates(), repo.listFolioSeries(),
      ]);
      setContainers(c); setServices(s); setRates(r); setSeries(f);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cargar el catálogo de precios.');
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => { void reload(); }, [reload]);

  const currentRate = useMemo(() => rates[0] ?? null, [rates]);

  return {
    containers, services, rates, series, loading, error, reload, currentRate,
    saveContainer: async (input: ContainerPriceInput) => { const r = await repo.saveContainerPrice(input); await reload(); return r; },
    saveService: async (input: ServicePriceInput) => { const r = await repo.saveServicePrice(input); await reload(); return r; },
    addRate: async (rate: number, note: string | null) => { const r = await repo.addExchangeRate(rate, note); await reload(); return r; },
    setNextFolio: async (type: QuoteType, next: number) => { const r = await repo.setNextFolioNumber(type, next); await reload(); return r; },
  };
}
