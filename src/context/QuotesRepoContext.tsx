import React, { createContext, useContext } from 'react';
import { supabaseQuotesRepo, type QuotesRepo } from '../lib/quotesRepo';

const QuotesRepoContext = createContext<QuotesRepo>(supabaseQuotesRepo);

/** Permite sustituir el origen de datos (p. ej. datos sintéticos en la vista previa). Por defecto usa Supabase. */
export const QuotesRepoProvider: React.FC<{ repo: QuotesRepo; children: React.ReactNode }> = ({ repo, children }) => (
  <QuotesRepoContext.Provider value={repo}>{children}</QuotesRepoContext.Provider>
);

export const useQuotesRepo = (): QuotesRepo => useContext(QuotesRepoContext);
