import { endOfMonth, format, startOfMonth } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { financeService } from '../services/financeService';
import {
  FinanceExpense,
  FinanceExpenseAttachment,
  FinanceExpenseAttachmentType,
  FinanceExpenseCategory,
  FinanceExpenseDraft,
  FinanceInventoryCost,
  FinanceMonthlySummary,
  FinancePayrollBatch,
  FinancePayrollBatchPaymentDraft,
  FinancePayrollCompensationChangeDraft,
  FinancePayrollCompensationHistory,
  FinancePayrollPeriod,
  FinancePayrollProfile,
  FinancePayrollProfileDraft,
  FinanceResourceErrors,
  FinanceReferenceOption,
  FinanceRecurringExpense,
  FinanceRecurringExpenseDraft,
  FinanceRecurringOccurrence,
} from '../types';

const getInitialPeriod = () => format(new Date(), 'yyyy-MM');

const parsePeriod = (period: string) => {
  const [yearValue, monthValue] = period.split('-');
  const year = Number(yearValue);
  const month = Number(monthValue);
  const date = new Date(year, month - 1, 1);

  return {
    year,
    month,
    startDate: format(startOfMonth(date), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'No fue posible procesar la operación financiera.';
};

export const useFinanceModule = (userId?: string | null) => {
  const [period, setPeriod] = useState(getInitialPeriod);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resourceErrors, setResourceErrors] = useState<FinanceResourceErrors>({});
  const [summary, setSummary] = useState<FinanceMonthlySummary | null>(null);
  const [categories, setCategories] = useState<FinanceExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [allExpenses, setAllExpenses] = useState<FinanceExpense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<FinanceRecurringExpense[]>([]);
  const [recurringOccurrences, setRecurringOccurrences] = useState<FinanceRecurringOccurrence[]>([]);
  const [allRecurringOccurrences, setAllRecurringOccurrences] = useState<FinanceRecurringOccurrence[]>([]);
  const [payrollProfiles, setPayrollProfiles] = useState<FinancePayrollProfile[]>([]);
  const [payrollPeriods, setPayrollPeriods] = useState<FinancePayrollPeriod[]>([]);
  const [allPayrollPeriods, setAllPayrollPeriods] = useState<FinancePayrollPeriod[]>([]);
  const [payrollBatches, setPayrollBatches] = useState<FinancePayrollBatch[]>([]);
  const [inventoryCosts, setInventoryCosts] = useState<FinanceInventoryCost[]>([]);
  const [inventoryReferences, setInventoryReferences] = useState<Array<{ id: string; label: string }>>([]);
  const [rentalReferences, setRentalReferences] = useState<Array<{ id: string; label: string }>>([]);
  const [saleReferences, setSaleReferences] = useState<Array<{ id: string; label: string }>>([]);
  const [modificationProjectReferences, setModificationProjectReferences] = useState<FinanceReferenceOption[]>([]);

  const periodContext = useMemo(() => parsePeriod(period), [period]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResourceErrors({});

    try {
      const [
        nextSummary,
        nextCategories,
        nextExpenses,
        nextAllExpenses,
        nextRecurringExpenses,
        nextRecurringOccurrences,
        nextAllRecurringOccurrences,
        nextPayrollProfiles,
        nextPayrollPeriods,
        nextAllPayrollPeriods,
        nextPayrollBatches,
        nextInventoryCosts,
        nextInventoryReferences,
        nextRentalReferences,
        nextSaleReferences,
        nextModificationProjectReferences,
      ] = await Promise.allSettled([
        financeService.getMonthlyFinancialSummary(periodContext.year, periodContext.month),
        financeService.listExpenseCategories(),
        financeService.listExpenses({ year: periodContext.year, month: periodContext.month }),
        financeService.listExpenses(),
        financeService.listRecurringExpenses(),
        financeService.listRecurringOccurrences(periodContext.startDate, periodContext.endDate),
        financeService.listRecurringOccurrences(),
        financeService.listPayrollProfiles(),
        financeService.listPayrollPeriods(periodContext.startDate, periodContext.endDate),
        financeService.listPayrollPeriods(),
        financeService.listPayrollBatches(periodContext.startDate, periodContext.endDate),
        financeService.listInventoryCosts(),
        financeService.listInventoryReferences(),
        financeService.listRentalReferences(),
        financeService.listSaleReferences(),
        financeService.listModificationProjectReferences(),
      ]);

      const getSettledValue = <T,>(result: PromiseSettledResult<T>) =>
        result.status === 'fulfilled' ? result.value : null;
      const nextResourceErrors: FinanceResourceErrors = {
        summary: nextSummary.status === 'rejected' ? getErrorMessage(nextSummary.reason) : null,
        categories: nextCategories.status === 'rejected' ? getErrorMessage(nextCategories.reason) : null,
        expenses: nextExpenses.status === 'rejected' ? getErrorMessage(nextExpenses.reason) : null,
        allExpenses: nextAllExpenses.status === 'rejected' ? getErrorMessage(nextAllExpenses.reason) : null,
        recurringExpenses: nextRecurringExpenses.status === 'rejected' ? getErrorMessage(nextRecurringExpenses.reason) : null,
        recurringOccurrences: nextRecurringOccurrences.status === 'rejected' ? getErrorMessage(nextRecurringOccurrences.reason) : null,
        allRecurringOccurrences:
          nextAllRecurringOccurrences.status === 'rejected' ? getErrorMessage(nextAllRecurringOccurrences.reason) : null,
        payrollProfiles: nextPayrollProfiles.status === 'rejected' ? getErrorMessage(nextPayrollProfiles.reason) : null,
        payrollPeriods: nextPayrollPeriods.status === 'rejected' ? getErrorMessage(nextPayrollPeriods.reason) : null,
        allPayrollPeriods:
          nextAllPayrollPeriods.status === 'rejected' ? getErrorMessage(nextAllPayrollPeriods.reason) : null,
        payrollBatches: nextPayrollBatches.status === 'rejected' ? getErrorMessage(nextPayrollBatches.reason) : null,
        inventoryCosts: nextInventoryCosts.status === 'rejected' ? getErrorMessage(nextInventoryCosts.reason) : null,
        inventoryReferences:
          nextInventoryReferences.status === 'rejected' ? getErrorMessage(nextInventoryReferences.reason) : null,
        rentalReferences: nextRentalReferences.status === 'rejected' ? getErrorMessage(nextRentalReferences.reason) : null,
        saleReferences: nextSaleReferences.status === 'rejected' ? getErrorMessage(nextSaleReferences.reason) : null,
        modificationProjectReferences:
          nextModificationProjectReferences.status === 'rejected'
            ? getErrorMessage(nextModificationProjectReferences.reason)
            : null,
      };

      setSummary(getSettledValue(nextSummary));
      setCategories(getSettledValue(nextCategories) || []);
      setExpenses(getSettledValue(nextExpenses) || []);
      setAllExpenses(getSettledValue(nextAllExpenses) || []);
      setRecurringExpenses(getSettledValue(nextRecurringExpenses) || []);
      setRecurringOccurrences(getSettledValue(nextRecurringOccurrences) || []);
      setAllRecurringOccurrences(getSettledValue(nextAllRecurringOccurrences) || []);
      setPayrollProfiles(getSettledValue(nextPayrollProfiles) || []);
      setPayrollPeriods(getSettledValue(nextPayrollPeriods) || []);
      setAllPayrollPeriods(getSettledValue(nextAllPayrollPeriods) || []);
      setPayrollBatches(getSettledValue(nextPayrollBatches) || []);
      setInventoryCosts(getSettledValue(nextInventoryCosts) || []);
      setInventoryReferences(getSettledValue(nextInventoryReferences) || []);
      setRentalReferences(getSettledValue(nextRentalReferences) || []);
      setSaleReferences(getSettledValue(nextSaleReferences) || []);
      setModificationProjectReferences(getSettledValue(nextModificationProjectReferences) || []);
      setResourceErrors(nextResourceErrors);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [periodContext.endDate, periodContext.month, periodContext.startDate, periodContext.year]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async <T,>(operation: () => Promise<T>) => {
      setSaving(true);
      setError(null);

      try {
        const result = await operation();
        await refresh();
        return result;
      } catch (nextError) {
        const message = getErrorMessage(nextError);
        setError(message);
        throw nextError instanceof Error ? nextError : new Error(message);
      } finally {
        setSaving(false);
      }
    },
    [refresh]
  );

  return useMemo(
    () => ({
      period,
      setPeriod,
      periodContext,
      loading,
      saving,
      error,
      resourceErrors,
      summary,
      categories,
      expenses,
      allExpenses,
      recurringExpenses,
      recurringOccurrences,
      allRecurringOccurrences,
      payrollProfiles,
      payrollPeriods,
      allPayrollPeriods,
      payrollBatches,
      inventoryCosts,
      inventoryReferences,
      rentalReferences,
      saleReferences,
      modificationProjectReferences,
      refresh,
      createExpense: (draft: FinanceExpenseDraft) =>
        runMutation(() => financeService.createExpense(draft, { userId: userId || null })),
      updateExpense: (expenseId: string, updates: Partial<FinanceExpenseDraft>) =>
        runMutation(() => financeService.updateExpense(expenseId, updates, { userId: userId || null })),
      cancelExpense: (expenseId: string) =>
        runMutation(() => financeService.cancelExpense(expenseId, { userId: userId || null })),
      createRecurringExpense: (draft: FinanceRecurringExpenseDraft) =>
        runMutation(() => financeService.createRecurringExpense(draft, { userId: userId || null })),
      updateRecurringExpense: (id: string, updates: Partial<FinanceRecurringExpenseDraft>) =>
        runMutation(() => financeService.updateRecurringExpense(id, updates, { userId: userId || null })),
      cancelRecurringExpense: (id: string) =>
        runMutation(() => financeService.cancelRecurringExpense(id, { userId: userId || null })),
      generateRecurringOccurrences: () =>
        runMutation(() => financeService.generateRecurringOccurrences(periodContext.endDate, { userId: userId || null })),
      registerRecurringPayment: (
        occurrenceId: string,
        input: {
          actualAmount: number;
          paymentDate: string;
          paymentMethod?: string | null;
          reference?: string | null;
          receiptUrl?: string | null;
          notes?: string | null;
        }
      ) => runMutation(() => financeService.registerRecurringPayment(occurrenceId, input, { userId: userId || null })),
      createPayrollProfile: (draft: FinancePayrollProfileDraft) =>
        runMutation(() => financeService.createPayrollProfile(draft, { userId: userId || null })),
      updatePayrollProfile: (id: string, updates: Partial<FinancePayrollProfileDraft>) =>
        runMutation(() => financeService.updatePayrollProfile(id, updates, { userId: userId || null })),
      listPayrollCompensationHistory: (payrollProfileId?: string) =>
        financeService.listPayrollCompensationHistory(payrollProfileId),
      changePayrollCompensation: (payrollProfileId: string, input: FinancePayrollCompensationChangeDraft) =>
        runMutation(() => financeService.changePayrollCompensation(payrollProfileId, input, { userId: userId || null })),
      createPayrollBatch: (input: {
        period_start: string;
        period_end: string;
        payroll_period_ids?: string[];
      }) => runMutation(() => financeService.createPayrollBatch(input, { userId: userId || null })),
      registerPayrollBatchPayment: (payrollBatchId: string, input: FinancePayrollBatchPaymentDraft) =>
        runMutation(() => financeService.registerPayrollBatchPayment(payrollBatchId, input, { userId: userId || null })),
      generatePayrollPeriods: () =>
        runMutation(() => financeService.generatePayrollPeriods(periodContext.endDate, { userId: userId || null })),
      registerPayrollPayment: (
        payrollPeriodId: string,
        input: {
          actualAmount: number;
          paymentDate: string;
          paymentMethod?: string | null;
          reference?: string | null;
          receiptUrl?: string | null;
          notes?: string | null;
        }
      ) => runMutation(() => financeService.registerPayrollPayment(payrollPeriodId, input, { userId: userId || null })),
      registerContainerPurchase: (input: {
        product_type: '20 DC' | '40 DC' | '40 HC' | 'Oficina';
        physical_number?: string;
        condition: 'Nuevo' | 'Usado';
        initial_location?: string;
        acquisition_amount: number;
        acquisition_date: string;
        supplier_name?: string;
        acquisition_payment_method?: string;
        acquisition_reference?: string;
        acquisition_receipt_url?: string;
        freight_amount?: number;
        freight_date?: string;
        freight_supplier_name?: string;
        freight_payment_method?: string;
        freight_reference?: string;
        freight_receipt_url?: string;
        notes?: string;
      }) =>
        runMutation(() => financeService.registerContainerPurchase({ ...input, userId: userId || null })),
      registerModificationCost: (input: {
        concept: string;
        amount: number;
          expenseDate: string;
          categoryId: string;
          inventoryItemId?: string;
          modificationProjectId?: string;
          supplierName?: string;
          description?: string;
        status?: 'PENDING' | 'PAID';
          paymentDate?: string | null;
      }) =>
        runMutation(() => financeService.registerModificationCost({ ...input, userId: userId || null })),
      listExpenseAttachments: (expenseId: string): Promise<FinanceExpenseAttachment[]> =>
        financeService.listExpenseAttachments(expenseId),
      uploadExpenseAttachment: (input: {
        expenseId: string;
        file: File;
        documentType: FinanceExpenseAttachmentType;
      }) => runMutation(() => financeService.createExpenseAttachment(input, { userId: userId || null })),
      deleteExpenseAttachment: (attachmentId: string) =>
        runMutation(() => financeService.deleteExpenseAttachment(attachmentId, { userId: userId || null })),
      getExpenseAttachmentSignedUrl: (attachmentId: string) =>
        financeService.getExpenseAttachmentSignedUrl(attachmentId),
      closeMonth: () =>
        runMutation(() => financeService.closeFinancialMonth(periodContext.year, periodContext.month, { userId: userId || null })),
    }),
    [
      allExpenses,
      allPayrollPeriods,
      allRecurringOccurrences,
      categories,
      error,
      expenses,
      inventoryCosts,
      inventoryReferences,
      loading,
      modificationProjectReferences,
      payrollBatches,
      payrollPeriods,
      payrollProfiles,
      period,
      periodContext,
      recurringExpenses,
      recurringOccurrences,
      refresh,
      resourceErrors,
      rentalReferences,
      runMutation,
      saleReferences,
      saving,
      setPeriod,
      summary,
      userId,
    ]
  );
};

export type UseFinanceModuleResult = ReturnType<typeof useFinanceModule>;
