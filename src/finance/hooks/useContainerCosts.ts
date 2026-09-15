import { useMemo } from 'react';
import { FinanceExpense, FinanceInventoryCost } from '../types';
import { UseFinanceModuleResult } from './useFinanceModule';

export const useContainerCosts = (finance: UseFinanceModuleResult) => {
  const costMap = useMemo(
    () => new Map(finance.inventoryCosts.map((item: FinanceInventoryCost) => [item.inventory_item_id, item] as const)),
    [finance.inventoryCosts]
  );

  const getCostExpenses = (inventoryItemId: string) =>
    finance.allExpenses
        .filter((item: FinanceExpense) => item.relatedInventoryItemId === inventoryItemId)
        .sort((a: FinanceExpense, b: FinanceExpense) => b.expenseDate.localeCompare(a.expenseDate));

  return useMemo(
    () => ({
      inventoryCosts: finance.inventoryCosts,
      inventoryReferences: finance.inventoryReferences,
      modificationProjectReferences: finance.modificationProjectReferences,
      categories: finance.categories,
      costMap,
      getCostExpenses,
      registerContainerPurchase: finance.registerContainerPurchase,
      registerModificationCost: finance.registerModificationCost,
      uploadExpenseAttachment: finance.uploadExpenseAttachment,
    }),
    [
      costMap,
      finance.categories,
      finance.inventoryCosts,
      finance.inventoryReferences,
      finance.modificationProjectReferences,
      finance.registerContainerPurchase,
      finance.registerModificationCost,
      finance.uploadExpenseAttachment,
      getCostExpenses,
    ]
  );
};
