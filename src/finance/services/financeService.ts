import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { financeRepository, FinanceRepository } from '../repositories/financeRepository';
import { rentalIncomeAdapter, RentalIncomeAdapter } from '../adapters/rentalIncomeAdapter';
import { salesIncomeAdapter, SalesIncomeAdapter } from '../adapters/salesIncomeAdapter';
import {
  FinanceAllocationEntityType,
  FinanceExpense,
  FinanceExpenseAttachmentDraft,
  FinanceExpenseDraft,
  FinanceExpenseFilters,
  FinanceInventoryCost,
  FinanceMonthPeriod,
  FinanceLinkEntityType,
  FinanceMonthlySummary,
  FinancePayrollBatchDraft,
  FinancePayrollBatchPaymentDraft,
  FinancePayrollCompensationChangeDraft,
  FinancePayrollProfileDraft,
  FinancePayrollPeriodicity,
  FinanceRecurringExpenseDraft,
  FinanceRecurringFrequency,
} from '../types';

type FinanceServiceDeps = {
  repository?: FinanceRepository;
  salesAdapter?: SalesIncomeAdapter;
  rentalAdapter?: RentalIncomeAdapter;
};

type AuditMeta = {
  userId?: string | null;
  correlationId?: string;
};

type ContainerPurchaseInput = AuditMeta & {
  product_type: '20 DC' | '40 DC' | '40 HC' | 'Oficina';
  physical_number?: string;
  condition: 'Nuevo' | 'Excelente' | 'Bueno' | 'Regular' | 'Requiere reparación';
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
};

type ModificationCostInput = AuditMeta & {
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
};

type ExpensePaymentRegistrationInput = {
  actualAmount: number;
  paymentDate: string;
  paymentMethod?: string | null;
  reference?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
};

const getMonthLabel = (year: number, month: number) =>
  format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: es });

const generateCorrelationId = () => crypto.randomUUID();

const sumAmount = <T>(items: T[], selector: (item: T) => number) =>
  items.reduce((sum, item) => sum + selector(item), 0);

const getPreviousDay = (date: string) =>
  format(addDays(new Date(`${date}T00:00:00`), -1), 'yyyy-MM-dd');

const getNextRecurringDueDate = (date: string, frequency: FinanceRecurringFrequency, intervalCount: number) => {
  const parsed = new Date(`${date}T00:00:00`);
  switch (frequency) {
    case 'MONTHLY':
      return format(addMonths(parsed, intervalCount), 'yyyy-MM-dd');
    case 'BIMONTHLY':
      return format(addMonths(parsed, 2 * intervalCount), 'yyyy-MM-dd');
    case 'QUARTERLY':
      return format(addMonths(parsed, 3 * intervalCount), 'yyyy-MM-dd');
    case 'SEMIANNUAL':
      return format(addMonths(parsed, 6 * intervalCount), 'yyyy-MM-dd');
    case 'ANNUAL':
      return format(addMonths(parsed, 12 * intervalCount), 'yyyy-MM-dd');
    case 'CUSTOM_DAYS':
      return format(addDays(parsed, intervalCount), 'yyyy-MM-dd');
    default:
      return format(addMonths(parsed, intervalCount), 'yyyy-MM-dd');
  }
};

const getPayrollStepDays = (periodicity: FinancePayrollPeriodicity) => {
  switch (periodicity) {
    case 'WEEKLY':
      return 7;
    case 'BIWEEKLY':
      return 14;
    case 'CUSTOM':
      return 30;
    case 'MONTHLY':
    default:
      return 30;
  }
};

const buildPayrollPeriodRange = (startDate: string, periodicity: FinancePayrollPeriodicity) => {
  const start = new Date(`${startDate}T00:00:00`);
  if (periodicity === 'MONTHLY') {
    const end = endOfMonth(start);
    return {
      period_start: format(start, 'yyyy-MM-dd'),
      period_end: format(end, 'yyyy-MM-dd'),
      due_date: format(end, 'yyyy-MM-dd'),
    };
  }

  const stepDays = getPayrollStepDays(periodicity);
  const end = addDays(start, stepDays - 1);
  return {
    period_start: format(start, 'yyyy-MM-dd'),
    period_end: format(end, 'yyyy-MM-dd'),
    due_date: format(end, 'yyyy-MM-dd'),
  };
};

export const createFinanceService = (deps: FinanceServiceDeps = {}) => {
  const repository = deps.repository || financeRepository;
  const salesAdapter = deps.salesAdapter || salesIncomeAdapter;
  const rentalAdapter = deps.rentalAdapter || rentalIncomeAdapter;

  const createEvent = async (
    eventType: string,
    entityType: string,
    entityId: string,
    payload: Record<string, unknown>,
    meta: AuditMeta = {}
  ) => {
    await repository.createEvent({
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      correlation_id: meta.correlationId || null,
      payload,
      created_by: meta.userId || undefined,
    });
  };

  const ensureMonthPeriod = async (year: number, month: number, meta: AuditMeta = {}) => {
    const existing = await repository.getMonthPeriod(year, month);
    if (existing) return existing;

    const latestClosed = await repository.getLatestClosedMonthPeriodBefore(year, month);
    return repository.createMonthPeriod({
      period_year: year,
      period_month: month,
      status: 'OPEN' as const,
      opening_balance: latestClosed?.closing_balance || 0,
      created_by: meta.userId || undefined,
      updated_by: meta.userId || undefined,
    });
  };

  const getMonthPeriodSnapshot = async (year: number, month: number): Promise<FinanceMonthPeriod> => {
    const existing = await repository.getMonthPeriod(year, month);
    if (existing) return existing;

    const latestClosed = await repository.getLatestClosedMonthPeriodBefore(year, month);
    return {
      id: `virtual-${year}-${month}`,
      period_year: year,
      period_month: month,
      status: 'OPEN',
      opening_balance: latestClosed?.closing_balance || 0,
      collected_sales_income: 0,
      collected_rental_income: 0,
      total_income: 0,
      operating_cost_paid: 0,
      inventory_cost_paid: 0,
      modification_cost_paid: 0,
      logistics_cost_paid: 0,
      tax_cost_paid: 0,
      extraordinary_cost_paid: 0,
      total_expenses_paid: 0,
      net_cash_flow: 0,
      closing_balance: latestClosed?.closing_balance || 0,
      pending_obligations_total: 0,
      notes: null,
      closed_at: null,
      closed_by: null,
      created_by: null,
      updated_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  const validateExpenseDraft = (draft: FinanceExpenseDraft) => {
    if (!draft.concept.trim()) {
      throw new Error('El concepto del egreso es obligatorio.');
    }
    if (!Number.isFinite(draft.amount) || draft.amount <= 0) {
      throw new Error('No se permite registrar egresos menores o iguales a cero.');
    }
    if (!draft.expenseDate) {
      throw new Error('La fecha del egreso es obligatoria.');
    }
    if (draft.status === 'PAID' && !draft.paymentDate) {
      throw new Error('Un egreso pagado requiere payment_date.');
    }
  };

  const hydrateCategorySnapshot = async (categoryId: string) => {
    const category = await repository.getExpenseCategory(categoryId);
    if (!category) {
      throw new Error('La categoria del egreso no existe.');
    }
    return category;
  };

  const resolveExpenseCategoryIdByCode = async (code: string) => {
    const category = await repository.getExpenseCategoryByCode(code);
    if (!category) {
      throw new Error(`No existe la categoria configurada: ${code}.`);
    }
    return category.code;
  };

  const resolvePayrollExpenseCategoryId = async () => {
    const preferred = await repository.getExpenseCategoryByCode('OP_PAYROLL');
    if (preferred) return preferred.code;

    const fallback = await repository.getExpenseCategoryByCode('PAYROLL');
    if (fallback) return fallback.code;

    throw new Error('No existe una categoria configurada para nomina.');
  };

  const createExpense = async (draft: FinanceExpenseDraft, meta: AuditMeta = {}) => {
    validateExpenseDraft(draft);
    const category = draft.categoryId 
      ? await hydrateCategorySnapshot(draft.categoryId)
      : null;
    const correlationId = draft.correlationId || meta.correlationId || generateCorrelationId();
    const status = draft.status || 'PENDING';
    const expenseId = draft.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const expense = await repository.createExpense({
      id: expenseId,
      concept: draft.concept.trim(),
      amount: draft.amount,
      expenseDate: draft.expenseDate,
      categoryId: category?.code || null,
      categoryNameSnapshot: category?.name || null,
      natureSnapshot: category?.nature || null,
      summaryBucketSnapshot: category?.summaryBucket || null,
      isOperatingCost: category?.isOperatingCost ?? false,
      status,
      paymentDate: status === 'PAID' ? draft.paymentDate : null,
      paidAmount: status === 'PAID' ? draft.paidAmount || draft.amount : null,
      supplierName: draft.supplierName || null,
      paymentMethod: draft.paymentMethod || null,
      reference: draft.reference || null,
      description: draft.description || null,
      receiptUrl: draft.receiptUrl || null,
      sourceType: draft.sourceType || 'MANUAL',
      correlationId,
      relatedSaleId: draft.relatedSaleId || null,
      relatedRentalId: draft.relatedRentalId || null,
      relatedInventoryItemId: draft.relatedInventoryItemId || null,
      relatedModificationProjectId: draft.relatedModificationProjectId || null,
      cancelledAt: null,
      createdBy: meta.userId || null,
      createdAt: now,
      updatedAt: now,
    });

    if (draft.links?.length) {
      await repository.createExpenseLinks(
        draft.links.map(link => ({
          expenseId: expense.id,
          entityType: link.entityType,
          entityId: link.entityId,
          linkRole: link.linkRole || 'RELATED',
          allocatedAmount: link.allocatedAmount ?? null,
          correlationId,
          notes: link.notes || null,
        }))
      );
    }

    await createEvent(
      'FIN_EXPENSE_CREATED',
      'FIN_EXPENSE',
      expense.id,
      { amount: expense.amount, status: expense.status, category_id: expense.categoryId, source_type: expense.sourceType },
      { ...meta, correlationId }
    );

    return expense;
  };

  const updateExpense = async (expenseId: string, updates: Partial<FinanceExpenseDraft>, meta: AuditMeta = {}) => {
    const expense = await repository.getExpenseById(expenseId);
    if (!expense) {
      throw new Error('El egreso no existe.');
    }

    const category = updates.categoryId
      ? await hydrateCategorySnapshot(updates.categoryId)
      : null;

    const status = updates.status || expense.status;
    if (status === 'PAID' && !((updates.paymentDate ?? expense.paymentDate) || null)) {
      throw new Error('Un egreso pagado requiere payment_date.');
    }
    if (updates.amount !== undefined && updates.amount <= 0) {
      throw new Error('No se permite registrar egresos menores o iguales a cero.');
    }

    const updated = await repository.updateExpense(expenseId, {
      concept: updates.concept?.trim() ?? expense.concept,
      amount: updates.amount ?? expense.amount,
      expenseDate: updates.expenseDate ?? expense.expenseDate,
      categoryId: category?.code ?? expense.categoryId,
      categoryNameSnapshot: category?.name ?? expense.categoryNameSnapshot,
      natureSnapshot: category?.nature ?? expense.natureSnapshot,
      summaryBucketSnapshot: category?.summaryBucket ?? expense.summaryBucketSnapshot,
      isOperatingCost: category?.isOperatingCost ?? expense.isOperatingCost,
      status,
      paymentDate: status === 'PAID' ? updates.paymentDate ?? expense.paymentDate : null,
      paidAmount: status === 'PAID' ? updates.paidAmount ?? expense.paidAmount ?? updates.amount ?? expense.amount : null,
      supplierName: updates.supplierName ?? expense.supplierName ?? null,
      paymentMethod: updates.paymentMethod ?? expense.paymentMethod ?? null,
      reference: updates.reference ?? expense.reference ?? null,
      description: updates.description ?? expense.description ?? null,
      receiptUrl: updates.receiptUrl ?? expense.receiptUrl ?? null,
      sourceType: updates.sourceType ?? expense.sourceType,
      correlationId: expense.correlationId,
      relatedSaleId: updates.relatedSaleId ?? expense.relatedSaleId ?? null,
      relatedRentalId: updates.relatedRentalId ?? expense.relatedRentalId ?? null,
      relatedInventoryItemId: updates.relatedInventoryItemId ?? expense.relatedInventoryItemId ?? null,
      relatedModificationProjectId: updates.relatedModificationProjectId ?? expense.relatedModificationProjectId ?? null,
      cancelledAt: expense.cancelledAt ?? null,
      createdAt: expense.createdAt,
      updatedAt: new Date().toISOString(),
    });

    await createEvent(
      'FIN_EXPENSE_UPDATED',
      'FIN_EXPENSE',
      updated.id,
      { before_status: expense.status, after_status: updated.status },
      meta
    );

    return updated;
  };

  const cancelExpense = async (expenseId: string, meta: AuditMeta = {}) => {
    const expense = await repository.getExpenseById(expenseId);
    if (!expense) {
      throw new Error('El egreso no existe.');
    }

    const cancelled = await repository.updateExpense(expenseId, {
      status: 'CANCELLED',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await createEvent(
      'FIN_EXPENSE_CANCELLED',
      'FIN_EXPENSE',
      cancelled.id,
      { status: cancelled.status },
      meta
    );

    return cancelled;
  };

  const allocateExpense = async (
    expenseId: string,
    entityType: FinanceAllocationEntityType,
    entityId: string,
    allocatedAmount: number,
    meta: AuditMeta = {}
  ) => {
    if (!Number.isFinite(allocatedAmount) || allocatedAmount <= 0) {
      throw new Error('La asignacion debe ser mayor a cero.');
    }

    const expense = await repository.getExpenseById(expenseId);
    if (!expense) {
      throw new Error('El egreso no existe.');
    }

    const existingAllocations = await repository.listExpenseAllocations(expenseId);
    const currentTotal = sumAmount(existingAllocations, item => Number(item.allocated_amount));
    if (currentTotal + allocatedAmount > Number(expense.amount)) {
      throw new Error('La asignacion excede el monto total del egreso.');
    }

    const correlationId = meta.correlationId || generateCorrelationId();
    const allocation = await repository.createExpenseAllocation({
      expense_id: expenseId,
      entity_type: entityType,
      entity_id: entityId,
      allocated_amount: allocatedAmount,
      correlation_id: correlationId,
      notes: null,
    });

    // Optimistic concurrency safeguard with compensation because the current architecture
    // does not expose multi-statement transactions from the client layer.
    const afterInsert = await repository.listExpenseAllocations(expenseId);
    const afterTotal = sumAmount(afterInsert, item => Number(item.allocated_amount));
    if (afterTotal > Number(expense.amount)) {
      await repository.removeExpenseAllocation(allocation.id);
      throw new Error('Conflicto de asignacion detectado. La suma excedio el monto del egreso y el cambio fue revertido.');
    }

    await createEvent(
      'FIN_COST_ALLOCATED',
      entityType,
      entityId,
      { expense_id: expenseId, allocated_amount: allocatedAmount },
      { ...meta, correlationId }
    );

    return allocation;
  };

  const removeExpenseAllocation = async (allocationId: string, meta: AuditMeta = {}) => {
    await repository.removeExpenseAllocation(allocationId);
    await createEvent(
      'FIN_COST_ALLOCATED',
      'FIN_EXPENSE_ALLOCATION',
      allocationId,
      { action: 'REMOVED' },
      meta
    );
  };

  const createRecurringExpense = async (draft: FinanceRecurringExpenseDraft, meta: AuditMeta = {}) => {
    if (draft.expected_amount <= 0) {
      throw new Error('El gasto recurrente debe ser mayor a cero.');
    }
    const correlationId = draft.correlation_id || meta.correlationId || generateCorrelationId();
    const recurring = await repository.createRecurringExpense({
      ...draft,
      interval_count: draft.interval_count || 1,
      next_due_date: draft.next_due_date || draft.first_due_date,
      status: draft.status || 'ACTIVE',
      correlation_id: correlationId,
      created_by: meta.userId || undefined,
      updated_by: meta.userId || undefined,
    });

    await createEvent(
      'FIN_RECURRING_CREATED',
      'FIN_RECURRING_EXPENSE',
      recurring.id,
      { concept: recurring.concept, expected_amount: recurring.expected_amount },
      { ...meta, correlationId }
    );

    return recurring;
  };

  const updateRecurringExpense = async (id: string, updates: Partial<FinanceRecurringExpenseDraft>, meta: AuditMeta = {}) => {
    const recurring = await repository.updateRecurringExpense(id, {
      ...updates,
      updated_by: meta.userId || undefined,
      updated_at: new Date().toISOString(),
    });
    return recurring;
  };

  const generateRecurringOccurrences = async (
    endDate: string,
    meta: AuditMeta = {}
  ) => {
    const recurringExpenses = await repository.listRecurringExpenses();
    const createdRows: Record<string, unknown>[] = [];

    recurringExpenses
      .filter(item => item.status === 'ACTIVE')
      .forEach(item => {
        let cursor = item.next_due_date;
        while (cursor <= endDate) {
          createdRows.push({
            recurring_expense_id: item.id,
            due_date: cursor,
            expected_amount: item.expected_amount,
            status: 'EXPECTED',
            correlation_id: meta.correlationId || item.correlation_id || generateCorrelationId(),
            created_by: meta.userId || undefined,
            updated_by: meta.userId || undefined,
          });
          cursor = getNextRecurringDueDate(cursor, item.frequency, item.interval_count);
        }
      });

    const occurrences = await repository.createRecurringOccurrences(createdRows);

    for (const occurrence of occurrences) {
      await createEvent(
        'FIN_RECURRING_OCCURRENCE_CREATED',
        'FIN_RECURRING_OCCURRENCE',
        occurrence.id,
        { due_date: occurrence.due_date, expected_amount: occurrence.expected_amount },
        meta
      );
    }

    return occurrences;
  };

  const registerRecurringPayment = async (
    occurrenceId: string,
    input: ExpensePaymentRegistrationInput,
    meta: AuditMeta = {}
  ) => {
    const { actualAmount, paymentDate, paymentMethod, reference, receiptUrl, notes } = input;
    if (actualAmount <= 0) {
      throw new Error('El pago recurrente debe ser mayor a cero.');
    }

    const occurrences = await repository.listRecurringOccurrences();
    const occurrence = occurrences.find(item => item.id === occurrenceId);
    if (!occurrence) {
      throw new Error('La ocurrencia recurrente no existe.');
    }
    const recurringExpenses = await repository.listRecurringExpenses();
    const recurring = recurringExpenses.find(item => item.id === occurrence.recurring_expense_id);
    if (!recurring) {
      throw new Error('El gasto recurrente asociado no existe.');
    }

    const correlationId = meta.correlationId || generateCorrelationId();
    const resolvedCategoryId = recurring.category_code 
      ? await resolveExpenseCategoryIdByCode(recurring.category_code)
      : null;

    const expense = await createExpense(
      {
        concept: recurring.concept,
        amount: actualAmount,
        expenseDate: paymentDate,
        categoryId: resolvedCategoryId,
        status: 'PAID',
        paymentDate: paymentDate,
        paidAmount: actualAmount,
        supplierName: recurring.provider_name || undefined,
        paymentMethod: paymentMethod || recurring.payment_method_default || undefined,
        reference: reference || undefined,
        receiptUrl: receiptUrl || undefined,
        description: notes || occurrence.notes || undefined,
        sourceType: 'RECURRING',
        correlationId: correlationId,
        links: [{ entityType: 'RECURRING_EXPENSE', entityId: recurring.id, linkRole: 'PRIMARY' }],
      },
      meta
    );

    const updated = await repository.updateRecurringOccurrence(occurrenceId, {
      actual_amount: actualAmount,
      status: 'PAID',
      payment_date: paymentDate,
      paid_expense_id: expense.id,
      notes: notes ?? occurrence.notes ?? null,
      updated_at: new Date().toISOString(),
      updated_by: meta.userId || undefined,
    });

    await repository.updateRecurringExpense(recurring.id, {
      next_due_date: getNextRecurringDueDate(occurrence.due_date, recurring.frequency, recurring.interval_count),
      updated_at: new Date().toISOString(),
      updated_by: meta.userId || undefined,
    });

    await createEvent(
      'FIN_RECURRING_PAID',
      'FIN_RECURRING_OCCURRENCE',
      updated.id,
      { actual_amount: actualAmount, expected_amount: occurrence.expected_amount, paid_expense_id: expense.id },
      { ...meta, correlationId }
    );

    return { occurrence: updated, expense };
  };

  const createPayrollProfile = async (draft: FinancePayrollProfileDraft, meta: AuditMeta = {}) => {
    if (draft.current_period_amount <= 0 || draft.estimated_monthly_cost <= 0) {
      throw new Error('Los importes de nomina deben ser mayores a cero.');
    }
    const correlationId = draft.correlation_id || meta.correlationId || generateCorrelationId();
    const profile = await repository.createPayrollProfile({
      ...draft,
      active: draft.active ?? true,
      correlation_id: correlationId,
      created_by: meta.userId || undefined,
      updated_by: meta.userId || undefined,
    });

    await repository.createPayrollCompensationHistory({
      payroll_profile_id: profile.id,
      effective_from: draft.start_date,
      effective_to: null,
      payment_frequency: draft.periodicity,
      base_payment_amount: draft.current_period_amount,
      estimated_monthly_cost: draft.estimated_monthly_cost,
      change_reason: draft.notes || 'Alta inicial',
      created_by: meta.userId || undefined,
    });

    return profile;
  };

  const updatePayrollProfile = async (id: string, updates: Partial<FinancePayrollProfileDraft>, meta: AuditMeta = {}) => {
    return repository.updatePayrollProfile(id, {
      ...updates,
      updated_by: meta.userId || undefined,
      updated_at: new Date().toISOString(),
    });
  };

  const listPayrollCompensationHistory = async (payrollProfileId?: string) =>
    repository.listPayrollCompensationHistory(payrollProfileId);

  const changePayrollCompensation = async (
    payrollProfileId: string,
    input: FinancePayrollCompensationChangeDraft,
    meta: AuditMeta = {}
  ) => {
    if (input.base_payment_amount <= 0 || input.estimated_monthly_cost <= 0) {
      throw new Error('La nueva remuneracion debe ser mayor a cero.');
    }

    const profiles = await repository.listPayrollProfiles();
    const profile = profiles.find(item => item.id === payrollProfileId);
    if (!profile) {
      throw new Error('El perfil de nomina no existe.');
    }

    const activeCompensation = await repository.getActivePayrollCompensation(payrollProfileId);
    if (activeCompensation) {
      await repository.updatePayrollCompensationHistory(activeCompensation.id, {
        effective_to: getPreviousDay(input.effective_from),
      });
    }

    const created = await repository.createPayrollCompensationHistory({
      payroll_profile_id: payrollProfileId,
      effective_from: input.effective_from,
      effective_to: null,
      payment_frequency: input.payment_frequency,
      base_payment_amount: input.base_payment_amount,
      estimated_monthly_cost: input.estimated_monthly_cost,
      change_reason: input.change_reason || null,
      created_by: meta.userId || undefined,
    });

    await repository.updatePayrollProfile(payrollProfileId, {
      periodicity: input.payment_frequency,
      current_period_amount: input.base_payment_amount,
      estimated_monthly_cost: input.estimated_monthly_cost,
      updated_by: meta.userId || undefined,
      updated_at: new Date().toISOString(),
    });

    await createEvent(
      'FIN_PAYROLL_COMPENSATION_CHANGED',
      'FIN_PAYROLL_PROFILE',
      payrollProfileId,
      {
        effective_from: input.effective_from,
        base_payment_amount: input.base_payment_amount,
        estimated_monthly_cost: input.estimated_monthly_cost,
        change_reason: input.change_reason || null,
      },
      meta
    );

    return created;
  };

  const createPayrollBatch = async (draft: FinancePayrollBatchDraft, meta: AuditMeta = {}) => {
    const correlationId = draft.correlation_id || meta.correlationId || generateCorrelationId();
    const periods = draft.payroll_period_ids?.length
      ? await repository.listPayrollPeriodsByIds(draft.payroll_period_ids)
      : await repository.listPayrollPeriods(draft.period_start, draft.period_end);

    const eligiblePeriods = periods
      .filter(period => period.status === 'PENDING')
      .filter(period => period.period_start >= draft.period_start && period.period_end <= draft.period_end);

    if (!eligiblePeriods.length) {
      throw new Error('No existen obligaciones de nomina pendientes para este periodo.');
    }

    const existingBatches = await repository.listPayrollBatches(draft.period_start, draft.period_end);
    const openBatch = existingBatches.find(
      batch =>
        batch.period_start === draft.period_start &&
        batch.period_end === draft.period_end &&
        ['PENDING', 'PARTIAL'].includes(batch.status)
    );
    if (openBatch) {
      return {
        batch: openBatch,
        items: await repository.listPayrollBatchItems(openBatch.id),
        periods: eligiblePeriods,
      };
    }

    const itemRows = eligiblePeriods
      .map(period => {
        const remaining = Math.max(Number(period.expected_amount) - Number(period.actual_amount ?? 0), 0);
        return {
          payroll_period_id: period.id,
          expected_amount: remaining,
        };
      })
      .filter(item => item.expected_amount > 0);

    if (!itemRows.length) {
      throw new Error('Las obligaciones pendientes ya fueron cubiertas por pagos previos.');
    }

    const batch = await repository.createPayrollBatch({
      period_start: draft.period_start,
      period_end: draft.period_end,
      expected_amount: sumAmount(itemRows, item => item.expected_amount),
      paid_amount: 0,
      status: 'PENDING',
      payment_date: null,
      financial_expense_id: null,
      payment_method: null,
      reference: null,
      notes: null,
      difference_amount: null,
      difference_treatment: null,
      adjustment_reason: null,
      adjustment_comment: null,
      correlation_id: correlationId,
      created_by: meta.userId || undefined,
      updated_by: meta.userId || undefined,
    });

    const items = await repository.createPayrollBatchItems(
      itemRows.map(item => ({
        payroll_batch_id: batch.id,
        payroll_period_id: item.payroll_period_id,
        expected_amount: item.expected_amount,
        paid_amount: 0,
      }))
    );

    await createEvent(
      'FIN_PAYROLL_BATCH_CREATED',
      'FIN_PAYROLL_BATCH',
      batch.id,
      {
        period_start: batch.period_start,
        period_end: batch.period_end,
        expected_amount: batch.expected_amount,
        items: items.length,
      },
      { ...meta, correlationId }
    );

    return { batch, items, periods: eligiblePeriods };
  };

  const registerPayrollBatchPayment = async (
    payrollBatchId: string,
    input: FinancePayrollBatchPaymentDraft,
    meta: AuditMeta = {}
  ) => {
    if (input.paid_amount <= 0) {
      throw new Error('El pago consolidado de nomina debe ser mayor a cero.');
    }

    const batch = await repository.getPayrollBatch(payrollBatchId);
    if (!batch) {
      throw new Error('El lote de nomina no existe.');
    }
    if (batch.status === 'PAID' || batch.status === 'CANCELLED') {
      throw new Error('El lote seleccionado ya no admite nuevos pagos.');
    }

    const batchItems = await repository.listPayrollBatchItems(payrollBatchId);
    const periods = await repository.listPayrollPeriodsByIds(batchItems.map(item => item.payroll_period_id));
    if (!periods.length) {
      throw new Error('El lote no contiene periodos de nomina.');
    }

    const expectedAmount = sumAmount(batchItems, item => Number(item.expected_amount));
    const differenceAmount = Number(input.paid_amount) - expectedAmount;
    const hasDifference = differenceAmount !== 0;

    if (hasDifference && !input.difference_treatment) {
      throw new Error('Debes indicar como tratar la diferencia del pago de nomina.');
    }
    if (input.difference_treatment === 'KEEP_PENDING' && differenceAmount > 0) {
      throw new Error('Un excedente no puede mantenerse pendiente. Usa ajuste explicito.');
    }
    if (
      input.difference_treatment === 'ADJUST_PERIOD' &&
      (!input.adjustment_reason || !input.adjustment_comment?.trim())
    ) {
      throw new Error('El ajuste de nomina exige motivo y comentario.');
    }

    const correlationId = batch.correlation_id || meta.correlationId || generateCorrelationId();
    const payrollCategoryId = await resolvePayrollExpenseCategoryId();
    const expense = await createExpense(
      {
        concept: `Nomina ${batch.period_start} a ${batch.period_end}`,
        amount: input.paid_amount,
        expenseDate: input.payment_date,
        categoryId: payrollCategoryId,
        status: 'PAID',
        paymentDate: input.payment_date,
        paidAmount: input.paid_amount,
        paymentMethod: input.payment_method || undefined,
        reference: input.reference || undefined,
        receiptUrl: input.receipt_url || undefined,
        description: input.notes || undefined,
        sourceType: 'PAYROLL',
        correlationId: correlationId,
      },
      { ...meta, correlationId }
    );

    let remaining = input.paid_amount;
    const periodsById = new Map(periods.map(period => [period.id, period]));

    for (const batchItem of batchItems) {
      const period = periodsById.get(batchItem.payroll_period_id);
      if (!period) continue;

      const expectedForItem = Number(batchItem.expected_amount);
      const allocatedPaid =
        input.difference_treatment === 'ADJUST_PERIOD' && differenceAmount > 0 && batchItem === batchItems[batchItems.length - 1]
          ? remaining
          : Math.max(Math.min(remaining, expectedForItem), 0);

      remaining -= allocatedPaid;

      await repository.updatePayrollBatchItem(batchItem.id, {
        paid_amount: allocatedPaid,
        updated_at: new Date().toISOString(),
      });

      const nextActualAmount = Number(period.actual_amount ?? 0) + allocatedPaid;
      const isAdjustedSettlement = input.difference_treatment === 'ADJUST_PERIOD';
      const isCovered = nextActualAmount >= Number(period.expected_amount) || isAdjustedSettlement;

      const adjustmentNote = isAdjustedSettlement
        ? `Ajuste nomina: ${input.adjustment_reason}. ${input.adjustment_comment}`
        : null;

      await repository.updatePayrollPeriod(period.id, {
        actual_amount: nextActualAmount,
        status: isCovered ? 'PAID' : 'PENDING',
        payment_date: input.payment_date,
        paid_expense_id: isCovered ? expense.id : null,
        notes: [period.notes, adjustmentNote].filter(Boolean).join(' ') || null,
        updated_by: meta.userId || undefined,
        updated_at: new Date().toISOString(),
      });
    }

    const nextStatus = hasDifference
      ? input.difference_treatment === 'KEEP_PENDING'
        ? 'PARTIAL'
        : 'PAID'
      : 'PAID';

    const updatedBatch = await repository.updatePayrollBatch(payrollBatchId, {
      paid_amount: input.paid_amount,
      payment_date: input.payment_date,
      status: nextStatus,
      financial_expense_id: expense.id,
      payment_method: input.payment_method || null,
      reference: input.reference || null,
      notes: input.notes || null,
      difference_amount: hasDifference ? differenceAmount : 0,
      difference_treatment: input.difference_treatment || null,
      adjustment_reason: input.adjustment_reason || null,
      adjustment_comment: input.adjustment_comment || null,
      updated_by: meta.userId || undefined,
      updated_at: new Date().toISOString(),
    });

    await createEvent(
      'FIN_PAYROLL_PAYMENT_REGISTERED',
      'FIN_PAYROLL_BATCH',
      updatedBatch.id,
      {
        paid_amount: input.paid_amount,
        expected_amount: expectedAmount,
        difference_amount: differenceAmount,
        status: nextStatus,
        financial_expense_id: expense.id,
      },
      { ...meta, correlationId }
    );

    return {
      batch: updatedBatch,
      expense,
      items: await repository.listPayrollBatchItems(payrollBatchId),
    };
  };

  const generatePayrollPeriods = async (endDate: string, meta: AuditMeta = {}) => {
    const profiles = await repository.listPayrollProfiles();
    const rows: Record<string, unknown>[] = [];

    profiles
      .filter(profile => profile.active)
      .forEach(profile => {
        let cursor = profile.start_date;
        while (cursor <= endDate) {
          const range = buildPayrollPeriodRange(cursor, profile.periodicity);
          rows.push({
            payroll_profile_id: profile.id,
            ...range,
            expected_amount: profile.current_period_amount,
            status: 'PENDING',
            correlation_id: meta.correlationId || profile.correlation_id || generateCorrelationId(),
            created_by: meta.userId || undefined,
            updated_by: meta.userId || undefined,
          });
          cursor = profile.periodicity === 'MONTHLY'
            ? format(addMonths(new Date(`${cursor}T00:00:00`), 1), 'yyyy-MM-dd')
            : format(addDays(new Date(`${cursor}T00:00:00`), getPayrollStepDays(profile.periodicity)), 'yyyy-MM-dd');
        }
      });

    const periods = await repository.createPayrollPeriods(rows);
    for (const period of periods) {
      await createEvent(
        'FIN_PAYROLL_PERIOD_CREATED',
        'FIN_PAYROLL_PERIOD',
        period.id,
        { due_date: period.due_date, expected_amount: period.expected_amount },
        meta
      );
    }
    return periods;
  };

  const registerPayrollPayment = async (
    payrollPeriodId: string,
    input: ExpensePaymentRegistrationInput,
    meta: AuditMeta = {}
  ) => {
    const { actualAmount, paymentDate, paymentMethod, reference, receiptUrl, notes } = input;
    if (actualAmount <= 0) {
      throw new Error('El pago de nomina debe ser mayor a cero.');
    }

    const periods = await repository.listPayrollPeriods();
    const period = periods.find(item => item.id === payrollPeriodId);
    if (!period) {
      throw new Error('El periodo de nomina no existe.');
    }
    const profiles = await repository.listPayrollProfiles();
    const profile = profiles.find(item => item.id === period.payroll_profile_id);
    if (!profile) {
      throw new Error('El perfil de nomina asociado no existe.');
    }

    const correlationId = meta.correlationId || generateCorrelationId();
    const payrollCategoryId = await resolvePayrollExpenseCategoryId();
    const expense = await createExpense(
      {
        concept: `Nomina · ${profile.person_name}`,
        amount: actualAmount,
        expenseDate: paymentDate,
        categoryId: payrollCategoryId,
        status: 'PAID',
        paymentDate: paymentDate,
        paidAmount: actualAmount,
        paymentMethod: paymentMethod || undefined,
        reference: reference || undefined,
        receiptUrl: receiptUrl || undefined,
        description: notes || profile.area,
        sourceType: 'PAYROLL',
        correlationId: correlationId,
        links: [{ entityType: 'PAYROLL_PROFILE', entityId: profile.id, linkRole: 'PRIMARY' }],
      },
      meta
    );

    const updated = await repository.updatePayrollPeriod(payrollPeriodId, {
      actual_amount: actualAmount,
      status: 'PAID',
      payment_date: paymentDate,
      paid_expense_id: expense.id,
      notes: notes ?? period.notes ?? null,
      updated_by: meta.userId || undefined,
      updated_at: new Date().toISOString(),
    });

    await createEvent(
      'FIN_PAYROLL_PAID',
      'FIN_PAYROLL_PERIOD',
      updated.id,
      { actual_amount: actualAmount, expected_amount: period.expected_amount, paid_expense_id: expense.id },
      { ...meta, correlationId }
    );

    return { period: updated, expense };
  };

  const registerContainerPurchase = async (input: ContainerPurchaseInput) => {
    if (input.acquisition_amount <= 0) {
      throw new Error('La compra del container debe ser mayor a cero.');
    }

    const correlationId = input.correlationId || generateCorrelationId();
    const inventoryItem = await repository.registerInventoryProduct({
      product_type: input.product_type,
      physical_number: input.physical_number || null,
      condition: input.condition,
      location: input.initial_location || 'Patio principal',
      operational_status: 'Disponible',
      available_for_sale: true,
      available_for_rent: true,
      available_for_modification: true,
      notes: input.notes || null,
    });

    await createEvent(
      'INVENTORY_ITEM_CREATED',
      'INVENTORY_ITEM',
      inventoryItem.id,
      { internal_id: inventoryItem.internal_id },
      { userId: input.userId, correlationId }
    );

    const acquisitionExpense = await createExpense(
      {
        concept: `Compra de ${inventoryItem.internal_id}`,
        amount: input.acquisition_amount,
        expenseDate: input.acquisition_date,
        categoryId: await resolveExpenseCategoryIdByCode('CONTAINER_PURCHASE'),
        status: 'PAID',
        paymentDate: input.acquisition_date,
        paidAmount: input.acquisition_amount,
        supplierName: input.supplier_name,
        paymentMethod: input.acquisition_payment_method,
        reference: input.acquisition_reference,
        receiptUrl: input.acquisition_receipt_url,
        sourceType: 'INVENTORY_PURCHASE',
        correlationId: correlationId,
        relatedInventoryItemId: inventoryItem.id,
        links: [{ entityType: 'INVENTORY_ITEM', entityId: inventoryItem.id, linkRole: 'PRIMARY' }],
      },
      { userId: input.userId, correlationId }
    );

    await allocateExpense(
      acquisitionExpense.id,
      'INVENTORY_ITEM',
      inventoryItem.id,
      input.acquisition_amount,
      { userId: input.userId, correlationId }
    );

    let freightExpense: FinanceExpense | null = null;
    if (input.freight_amount && input.freight_amount > 0) {
      freightExpense = await createExpense(
        {
          concept: `Flete de ${inventoryItem.internal_id}`,
          amount: input.freight_amount,
          expenseDate: input.freight_date || input.acquisition_date,
          categoryId: await resolveExpenseCategoryIdByCode('DIRECT_FREIGHT'),
          status: 'PAID',
          paymentDate: input.freight_date || input.acquisition_date,
          paidAmount: input.freight_amount,
          supplierName: input.freight_supplier_name || input.supplier_name,
          paymentMethod: input.freight_payment_method,
          reference: input.freight_reference,
          receiptUrl: input.freight_receipt_url,
          sourceType: 'INVENTORY_PURCHASE',
          correlationId: correlationId,
          relatedInventoryItemId: inventoryItem.id,
          links: [{ entityType: 'INVENTORY_ITEM', entityId: inventoryItem.id, linkRole: 'PRIMARY' }],
        },
        { userId: input.userId, correlationId }
      );

      await allocateExpense(
        freightExpense.id,
        'INVENTORY_ITEM',
        inventoryItem.id,
        input.freight_amount,
        { userId: input.userId, correlationId }
      );
    }

    await createEvent(
      'FIN_CONTAINER_PURCHASE_CREATED',
      'INVENTORY_ITEM',
      inventoryItem.id,
      {
        acquisition_expense_id: acquisitionExpense.id,
        freight_expense_id: freightExpense?.id || null,
      },
      { userId: input.userId, correlationId }
    );

    return { inventoryItem, acquisitionExpense, freightExpense };
  };

  const registerModificationCost = async (input: ModificationCostInput) => {
    const correlationId = input.correlationId || generateCorrelationId();
    const links: Array<{
      entityType: FinanceLinkEntityType;
      entityId: string;
      linkRole: 'PRIMARY' | 'RELATED' | 'REFERENCE';
    }> = [];
    if (input.inventoryItemId) {
      links.push({ entityType: 'INVENTORY_ITEM', entityId: input.inventoryItemId, linkRole: 'PRIMARY' });
    }
    if (input.modificationProjectId) {
      links.push({ entityType: 'MODIFICATION_PROJECT', entityId: input.modificationProjectId, linkRole: 'PRIMARY' });
    }

    const expense = await createExpense(
      {
        concept: input.concept,
        amount: input.amount,
        expenseDate: input.expenseDate,
        categoryId: input.categoryId,
        status: input.status || 'PAID',
        paymentDate: input.paymentDate || input.expenseDate,
        paidAmount: input.amount,
        supplierName: input.supplierName,
        description: input.description,
        sourceType: 'MODIFICATION',
        correlationId: correlationId,
        relatedInventoryItemId: input.inventoryItemId || null,
        relatedModificationProjectId: input.modificationProjectId || null,
        links,
      },
      { userId: input.userId, correlationId }
    );

    if (input.inventoryItemId) {
      await allocateExpense(
        expense.id,
        'INVENTORY_ITEM',
        input.inventoryItemId,
        input.amount,
        { userId: input.userId, correlationId }
      );
    }

    if (input.modificationProjectId) {
      await allocateExpense(
        expense.id,
        'MODIFICATION_PROJECT',
        input.modificationProjectId,
        input.amount,
        { userId: input.userId, correlationId }
      );
    }

    await createEvent(
      'FIN_MODIFICATION_COST_CREATED',
      input.inventoryItemId ? 'INVENTORY_ITEM' : 'MODIFICATION_PROJECT',
      input.inventoryItemId || input.modificationProjectId || expense.id,
      { expense_id: expense.id, amount: expense.amount },
      { userId: input.userId, correlationId }
    );

    return expense;
  };

  const listPayrollBatches = async (startDate?: string, endDate?: string) =>
    repository.listPayrollBatches(startDate, endDate);

  const listModificationProjectReferences = async () =>
    repository.listModificationProjectReferences();

  const listExpenseAttachments = async (expenseId: string) =>
    repository.listExpenseAttachments(expenseId);

  const createExpenseAttachment = async (
    input: {
      expenseId: string;
      file: File;
      documentType: FinanceExpenseAttachmentDraft['document_type'];
    },
    meta: AuditMeta = {}
  ) => {
    const expense = await repository.getExpenseById(input.expenseId);
    if (!expense) {
      throw new Error('El egreso no existe.');
    }

    const safeName = input.file.name.replace(/\s+/g, '_');
    const filePath = `${input.expenseId}/${Date.now()}_${safeName}`;

    await repository.uploadExpenseAttachmentFile(filePath, input.file);

    const attachment = await repository.createExpenseAttachment({
      expense_id: input.expenseId,
      file_path: filePath,
      file_name: input.file.name,
      mime_type: input.file.type || 'application/octet-stream',
      document_type: input.documentType,
      created_by: meta.userId || undefined,
    });

    await createEvent(
      'FIN_EXPENSE_ATTACHMENT_CREATED',
      'FIN_EXPENSE',
      input.expenseId,
      {
        attachment_id: attachment.id,
        document_type: attachment.document_type,
        file_name: attachment.file_name,
      },
      meta
    );

    return attachment;
  };

  const deleteExpenseAttachment = async (attachmentId: string, meta: AuditMeta = {}) => {
    const attachment = await repository.getExpenseAttachment(attachmentId);
    if (!attachment) {
      throw new Error('El adjunto no existe.');
    }

    await repository.removeExpenseAttachmentFile(attachment.file_path);
    await repository.deleteExpenseAttachment(attachmentId);

    await createEvent(
      'FIN_EXPENSE_ATTACHMENT_DELETED',
      'FIN_EXPENSE',
      attachment.expense_id,
      { attachment_id: attachmentId, file_path: attachment.file_path },
      meta
    );
  };

  const getExpenseAttachmentSignedUrl = async (attachmentId: string) => {
    const attachment = await repository.getExpenseAttachment(attachmentId);
    if (!attachment) {
      throw new Error('El adjunto no existe.');
    }

    return repository.createExpenseAttachmentSignedUrl(attachment.file_path);
  };

  const getMonthlyFinancialSummary = async (year: number, month: number): Promise<FinanceMonthlySummary> => {
    const period = await getMonthPeriodSnapshot(year, month);
    const startDate = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

    const [salesIncome, rentalIncome, expenses, recurringExpenses, payrollProfiles] = await Promise.all([
      salesAdapter.getCollectedSalesIncome(startDate, endDate),
      rentalAdapter.getCollectedRentalIncome(startDate, endDate),
      repository.listExpenses({ year, month }),
      repository.listRecurringExpenses(),
      repository.listPayrollProfiles(),
    ]);

    const paidExpenses = expenses.filter(item => item.status === 'PAID');
    const activeExpenses = expenses.filter(item => item.status !== 'CANCELLED');

    const operatingCost = sumAmount(
      paidExpenses.filter(item => item.isOperatingCost),
      item => Number(item.paidAmount ?? item.amount)
    );
    const inventoryCost = sumAmount(
      paidExpenses.filter(item => item.summaryBucketSnapshot === 'INVENTORY'),
      item => Number(item.paidAmount ?? item.amount)
    );
    const modificationCost = sumAmount(
      paidExpenses.filter(item => item.summaryBucketSnapshot === 'MODIFICATION'),
      item => Number(item.paidAmount ?? item.amount)
    );
    const logisticsCost = sumAmount(
      paidExpenses.filter(item => item.summaryBucketSnapshot === 'LOGISTICS'),
      item => Number(item.paidAmount ?? item.amount)
    );
    const taxCost = sumAmount(
      paidExpenses.filter(item => item.summaryBucketSnapshot === 'TAX'),
      item => Number(item.paidAmount ?? item.amount)
    );
    const extraordinaryCost = sumAmount(
      paidExpenses.filter(item => item.summaryBucketSnapshot === 'EXTRAORDINARY'),
      item => Number(item.paidAmount ?? item.amount)
    );

    const pendingExpenseObligations = sumAmount(
      activeExpenses.filter(item => item.status === 'PENDING'),
      item => Number(item.amount)
    );

    // Sumamos el valor proyectado (expected_amount) de los perfiles recurrentes activos
    const pendingRecurring = sumAmount(
      recurringExpenses.filter(item => item.status === 'ACTIVE'),
      item => Number(item.expected_amount)
    );

    // Sumamos el valor proyectado (estimated_monthly_cost) de los perfiles de nómina activos
    const pendingPayroll = sumAmount(
      payrollProfiles.filter(item => item.active),
      item => Number(item.estimated_monthly_cost)
    );

    const salesCollected = salesIncome.total;
    const rentalCollected = rentalIncome.total;
    const totalIncome = salesCollected + rentalCollected;

    // Para evitar duplicar, solo sumamos los egresos registrados que NO vienen de recurrencia ni nómina
    // (porque esos ya se están considerando arriba en sus proyecciones de perfiles activos)
    const capturedExpensesTotal = sumAmount(
      activeExpenses.filter(item => item.sourceType !== 'RECURRING' && item.sourceType !== 'PAYROLL'),
      item => Number(item.paidAmount ?? item.amount)
    );

    const totalExpenses = capturedExpensesTotal + pendingRecurring + pendingPayroll;
    const netCashFlow = totalIncome - totalExpenses;
    const closingBalance = Number(period.opening_balance) + netCashFlow;
    const pendingObligations = pendingExpenseObligations + pendingRecurring + pendingPayroll;

    return {
      period: {
        year,
        month,
        label: getMonthLabel(year, month),
        startDate,
        endDate,
        status: period.status,
      },
      openingBalance: Number(period.opening_balance),
      salesCollected,
      rentalCollected,
      totalIncome,
      operatingCost,
      inventoryCost,
      modificationCost,
      logisticsCost,
      taxCost,
      extraordinaryCost,
      totalExpenses,
      netCashFlow,
      closingBalance,
      incomeToOperatingRatio: operatingCost > 0 ? Number((totalIncome / operatingCost).toFixed(2)) : null,
      pendingObligations,
      dataGapNotes: [...salesIncome.dataGapNotes, ...rentalIncome.dataGapNotes],
    };
  };

  const getInventoryCost = async (inventoryItemId: string): Promise<FinanceInventoryCost | null> => {
    return repository.getInventoryCost(inventoryItemId);
  };

  const closeFinancialMonth = async (year: number, month: number, meta: AuditMeta = {}) => {
    const period = await ensureMonthPeriod(year, month, meta);
    if (period.status !== 'OPEN') {
      throw new Error('El periodo ya esta cerrado.');
    }

    const summary = await getMonthlyFinancialSummary(year, month);
    const updated = await repository.updateMonthPeriod(period.id, {
      status: 'CLOSED',
      collected_sales_income: summary.salesCollected,
      collected_rental_income: summary.rentalCollected,
      total_income: summary.totalIncome,
      operating_cost_paid: summary.operatingCost,
      inventory_cost_paid: summary.inventoryCost,
      modification_cost_paid: summary.modificationCost,
      logistics_cost_paid: summary.logisticsCost,
      tax_cost_paid: summary.taxCost,
      extraordinary_cost_paid: summary.extraordinaryCost,
      total_expenses_paid: summary.totalExpenses,
      net_cash_flow: summary.netCashFlow,
      closing_balance: summary.closingBalance,
      pending_obligations_total: summary.pendingObligations,
      closed_at: new Date().toISOString(),
      closed_by: meta.userId || null,
      updated_by: meta.userId || undefined,
      updated_at: new Date().toISOString(),
    });

    const nextMonthDate = addMonths(new Date(year, month - 1, 1), 1);
    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = nextMonthDate.getMonth() + 1;
    const nextPeriod = await repository.getMonthPeriod(nextYear, nextMonth);
    if (!nextPeriod) {
      await repository.createMonthPeriod({
        period_year: nextYear,
        period_month: nextMonth,
        status: 'OPEN',
        opening_balance: summary.closingBalance,
        created_by: meta.userId || undefined,
        updated_by: meta.userId || undefined,
      });
    }

    await createEvent(
      'FIN_MONTH_CLOSED',
      'FIN_MONTH_PERIOD',
      updated.id,
      {
        year,
        month,
        opening_balance: summary.openingBalance,
        closing_balance: summary.closingBalance,
        net_cash_flow: summary.netCashFlow,
      },
      meta
    );

    return updated;
  };

  return {
    createExpense,
    updateExpense,
    cancelExpense,
    allocateExpense,
    removeExpenseAllocation,
    createRecurringExpense,
    updateRecurringExpense,
    generateRecurringOccurrences,
    registerRecurringPayment,
    createPayrollProfile,
    updatePayrollProfile,
    listPayrollCompensationHistory,
    changePayrollCompensation,
    createPayrollBatch,
    registerPayrollBatchPayment,
    generatePayrollPeriods,
    registerPayrollPayment,
    registerContainerPurchase,
    registerModificationCost,
    createExpenseAttachment,
    deleteExpenseAttachment,
    getExpenseAttachmentSignedUrl,
    getMonthlyFinancialSummary,
    getInventoryCost,
    closeFinancialMonth,
    listExpenseCategories: () => repository.listExpenseCategories(),
    listExpenses: (filters?: FinanceExpenseFilters) => repository.listExpenses(filters),
    listRecurringExpenses: () => repository.listRecurringExpenses(),
    listRecurringOccurrences: (startDate?: string, endDate?: string) => repository.listRecurringOccurrences(startDate, endDate),
    listPayrollProfiles: () => repository.listPayrollProfiles(),
    listPayrollPeriods: (startDate?: string, endDate?: string) => repository.listPayrollPeriods(startDate, endDate),
    listPayrollBatches,
    listInventoryCosts: () => repository.listInventoryCosts(),
    listInventoryReferences: () => repository.listInventoryReferences(),
    listRentalReferences: () => repository.listRentalReferences(),
    listSaleReferences: () => repository.listSaleReferences(),
    listModificationProjectReferences,
    listExpenseAttachments,
  };
};

export const financeService = createFinanceService();
export type FinanceService = ReturnType<typeof createFinanceService>;
