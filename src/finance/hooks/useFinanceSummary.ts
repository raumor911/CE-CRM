import { useMemo } from 'react';
import { FinanceExpense } from '../types';
import { UseFinanceModuleResult } from './useFinanceModule';

export const useFinanceSummary = (finance: UseFinanceModuleResult) => {
  const activeExpenses = useMemo(
    () => finance.expenses.filter((item: FinanceExpense) => item.status !== 'CANCELLED'),
    [finance.expenses]
  );

  const pendingRecurringAmount = useMemo(
    () =>
      finance.recurringOccurrences
        .filter(item => item.status === 'EXPECTED')
        .reduce((sum, item) => sum + Number(item.expected_amount), 0),
    [finance.recurringOccurrences]
  );

  const pendingPayrollAmount = useMemo(
    () =>
      finance.payrollPeriods
        .filter(item => item.status === 'PENDING')
        .reduce((sum, item) => sum + Number(item.expected_amount) - Number(item.actual_amount ?? 0), 0),
    [finance.payrollPeriods]
  );

  const pendingExpenseAmount = useMemo(
    () =>
      activeExpenses
        .filter(item => item.status === 'PENDING')
        .reduce((sum, item) => sum + Number(item.amount), 0),
    [activeExpenses]
  );

  const sourceBreakdown = useMemo(() => {
    const grouped = new Map<string, number>();

    activeExpenses
        .filter(item => item.status === 'PAID')
        .forEach((item: FinanceExpense) => {
        grouped.set(
            item.sourceType,
            (grouped.get(item.sourceType) || 0) + Number(item.paidAmount ?? item.amount)
        );
      });

    return grouped;
  }, [activeExpenses]);

  return {
    activeExpenses,
    pendingRecurringAmount,
    pendingPayrollAmount,
    pendingExpenseAmount,
    sourceBreakdown,
  };
};
