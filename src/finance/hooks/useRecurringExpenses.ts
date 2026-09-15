import { useMemo } from 'react';
import { FinanceRecurringOccurrence } from '../types';
import { UseFinanceModuleResult } from './useFinanceModule';

export const useRecurringExpenses = (finance: UseFinanceModuleResult) => {
  const pendingOccurrences = useMemo(
    () => finance.recurringOccurrences.filter((item: FinanceRecurringOccurrence) => item.status === 'EXPECTED'),
    [finance.recurringOccurrences]
  );

  const paidOccurrences = useMemo(
    () => finance.recurringOccurrences.filter((item: FinanceRecurringOccurrence) => item.status === 'PAID'),
    [finance.recurringOccurrences]
  );

  const pendingAmount = useMemo(
    () => pendingOccurrences.reduce((sum: number, item: FinanceRecurringOccurrence) => sum + Number(item.expected_amount), 0),
    [pendingOccurrences]
  );

  const paidAmount = useMemo(
    () =>
      paidOccurrences.reduce(
        (sum: number, item: FinanceRecurringOccurrence) => sum + Number(item.actual_amount ?? item.expected_amount),
        0
      ),
    [paidOccurrences]
  );

  const recurringMap = useMemo(
    () => new Map(finance.recurringExpenses.map(item => [item.id, item] as const)),
    [finance.recurringExpenses]
  );

  const recurringHistory = useMemo(() => {
    const grouped = new Map<string, FinanceRecurringOccurrence[]>();
    finance.allRecurringOccurrences.forEach((item: FinanceRecurringOccurrence) => {
      const current = grouped.get(item.recurring_expense_id) || [];
      current.push(item);
      grouped.set(item.recurring_expense_id, current);
    });
    return grouped;
  }, [finance.allRecurringOccurrences]);

  return useMemo(
    () => ({
      recurringMap,
      recurringHistory,
      pendingAmount,
      paidAmount,
      createRecurringExpense: finance.createRecurringExpense,
      updateRecurringExpense: finance.updateRecurringExpense,
      generateRecurringOccurrences: finance.generateRecurringOccurrences,
      registerRecurringPayment: finance.registerRecurringPayment,
      categories: finance.categories,
      recurringExpenses: finance.recurringExpenses,
      recurringOccurrences: finance.recurringOccurrences,
      allRecurringOccurrences: finance.allRecurringOccurrences,
    }),
    [
      finance.allRecurringOccurrences,
      finance.categories,
      finance.createRecurringExpense,
      finance.generateRecurringOccurrences,
      finance.recurringExpenses,
      finance.recurringOccurrences,
      finance.registerRecurringPayment,
      finance.updateRecurringExpense,
      paidAmount,
      pendingAmount,
      recurringHistory,
      recurringMap,
    ]
  );
};
