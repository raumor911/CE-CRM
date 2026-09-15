import { useMemo } from 'react';
import { FinanceExpense } from '../types';
import { UseFinanceModuleResult } from './useFinanceModule';

export const useExpenses = (finance: UseFinanceModuleResult) => {
  const activeExpenses = useMemo(
    () => finance.expenses.filter((item: FinanceExpense) => item.status !== 'CANCELLED'),
    [finance.expenses]
  );

  const expenseById = useMemo(
    () => new Map(finance.allExpenses.map(item => [item.id, item] as const)),
    [finance.allExpenses]
  );

  return useMemo(
    () => ({
      activeExpenses,
      expenseById,
      categories: finance.categories,
      inventoryReferences: finance.inventoryReferences,
      saleReferences: finance.saleReferences,
      rentalReferences: finance.rentalReferences,
      modificationProjectReferences: finance.modificationProjectReferences,
      createExpense: finance.createExpense,
      cancelExpense: finance.cancelExpense,
      listExpenseAttachments: finance.listExpenseAttachments,
      uploadExpenseAttachment: finance.uploadExpenseAttachment,
      deleteExpenseAttachment: finance.deleteExpenseAttachment,
      getExpenseAttachmentSignedUrl: finance.getExpenseAttachmentSignedUrl,
    }),
    [
      activeExpenses,
      expenseById,
      finance.cancelExpense,
      finance.categories,
      finance.createExpense,
      finance.deleteExpenseAttachment,
      finance.getExpenseAttachmentSignedUrl,
      finance.inventoryReferences,
      finance.listExpenseAttachments,
      finance.modificationProjectReferences,
      finance.rentalReferences,
      finance.saleReferences,
      finance.uploadExpenseAttachment,
    ]
  );
};
