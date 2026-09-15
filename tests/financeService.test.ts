/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapExpenseFromDb,
  mapExpenseLinkFromDb,
  mapExpenseLinkToDb,
  mapExpenseToDb,
} from '../src/finance/repositories/expenseMappers';
import { createFinanceService } from '../src/finance/services/financeService';

test('getMonthlyFinancialSummary consolidates incomes, expenses and data gap notes', async () => {
  const repository = {
    getMonthPeriod: async () => ({
      id: 'period-1',
      period_year: 2026,
      period_month: 9,
      status: 'OPEN',
      opening_balance: 1000,
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
      closing_balance: 0,
      pending_obligations_total: 0,
      created_at: '',
      updated_at: '',
    }),
    getLatestClosedMonthPeriodBefore: async () => null,
    createMonthPeriod: async () => {
      throw new Error('Should not create month period when it already exists');
    },
    listExpenses: async () => ([
      {
        id: 'exp-1',
        concept: 'Operacion',
        amount: 200,
        expenseDate: '2026-09-10',
        categoryId: 'cat-operating',
        categoryNameSnapshot: 'Operacion',
        natureSnapshot: 'OPERATING',
        summaryBucketSnapshot: 'OPERATING',
        isOperatingCost: true,
        status: 'PAID',
        paymentDate: '2026-09-10',
        paidAmount: 180,
        sourceType: 'MANUAL',
        correlationId: 'corr-1',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'exp-2',
        concept: 'Compra',
        amount: 300,
        expenseDate: '2026-09-11',
        categoryId: 'cat-inventory',
        categoryNameSnapshot: 'Inventario',
        natureSnapshot: 'CAPEX',
        summaryBucketSnapshot: 'INVENTORY',
        isOperatingCost: false,
        status: 'PAID',
        paymentDate: '2026-09-11',
        paidAmount: 300,
        sourceType: 'INVENTORY_PURCHASE',
        correlationId: 'corr-2',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'exp-3',
        concept: 'Pendiente',
        amount: 90,
        expenseDate: '2026-09-12',
        categoryId: 'cat-operating',
        categoryNameSnapshot: 'Operacion',
        natureSnapshot: 'OPERATING',
        summaryBucketSnapshot: 'OPERATING',
        isOperatingCost: true,
        status: 'PENDING',
        sourceType: 'MANUAL',
        correlationId: 'corr-3',
        createdAt: '',
        updatedAt: '',
      },
    ]),
    listRecurringExpenses: async () => ([
      {
        id: 'rec-1',
        expected_amount: 50,
        status: 'ACTIVE'
      },
    ]),
    listPayrollProfiles: async () => ([
      {
        id: 'profile-1',
        estimated_monthly_cost: 120,
        active: true
      },
    ]),
  };

  const salesAdapter = {
    getCollectedSalesIncome: async () => ({
      items: [],
      total: 800,
      dataGapNotes: ['Ventas: solo considera ingresos efectivamente confirmados.'],
    }),
  };

  const rentalAdapter = {
    getCollectedRentalIncome: async () => ({
      items: [],
      total: 400,
      dataGapNotes: ['Rentas: se usa expected_amount como proxy del monto cobrado.'],
    }),
  };

  const service = createFinanceService({
    repository: repository as any,
    salesAdapter: salesAdapter as any,
    rentalAdapter: rentalAdapter as any,
  });

  const summary = await service.getMonthlyFinancialSummary(2026, 9);

  assert.equal(summary.totalIncome, 1200);
  assert.equal(summary.operatingCost, 180);
  assert.equal(summary.inventoryCost, 300);
  assert.equal(summary.totalExpenses, 740);
  assert.equal(summary.netCashFlow, 460);
  assert.equal(summary.closingBalance, 1460);
  assert.equal(summary.pendingObligations, 260);
  assert.deepEqual(summary.dataGapNotes, [
    'Ventas: solo considera ingresos efectivamente confirmados.',
    'Rentas: se usa expected_amount como proxy del monto cobrado.',
  ]);
});

test('allocateExpense reverts allocation when concurrent total exceeds expense amount', async () => {
  let removedAllocationId: string | null = null;
  let allocationReads = 0;

  const repository = {
    getExpenseById: async () => ({
      id: 'exp-1',
      concept: 'Compra',
      amount: 100,
      expenseDate: '2026-09-10',
      categoryId: 'cat-inventory',
      categoryNameSnapshot: 'Inventario',
      natureSnapshot: 'CAPEX',
      summaryBucketSnapshot: 'INVENTORY',
      isOperatingCost: false,
      status: 'PAID',
      paymentDate: '2026-09-10',
      paidAmount: 100,
      sourceType: 'MANUAL',
      correlationId: 'corr-1',
      createdAt: '',
      updatedAt: '',
    }),
    listExpenseAllocations: async () => {
      allocationReads += 1;
      if (allocationReads === 1) return [];
      return [
        {
          id: 'existing-allocation',
          expense_id: 'exp-1',
          entity_type: 'INVENTORY_ITEM',
          entity_id: 'item-1',
          allocated_amount: 60,
          correlation_id: 'corr-2',
          created_at: '',
        },
        {
          id: 'new-allocation',
          expense_id: 'exp-1',
          entity_type: 'SALE',
          entity_id: 'sale-1',
          allocated_amount: 50,
          correlation_id: 'corr-3',
          created_at: '',
        },
      ];
    },
    createExpenseAllocation: async () => ({
      id: 'new-allocation',
      expense_id: 'exp-1',
      entity_type: 'SALE',
      entity_id: 'sale-1',
      allocated_amount: 50,
      correlation_id: 'corr-3',
      created_at: '',
    }),
    removeExpenseAllocation: async (id: string) => {
      removedAllocationId = id;
    },
    createEvent: async () => ({
      id: 'event-1',
      event_type: 'FIN_COST_ALLOCATED',
      payload: {},
      created_at: '',
    }),
  };

  const service = createFinanceService({ repository: repository as any });

  await assert.rejects(
    () => service.allocateExpense('exp-1', 'SALE', 'sale-1', 50),
    /Conflicto de asignacion detectado/
  );
  assert.equal(removedAllocationId, 'new-allocation');
});

test('createExpense generates explicit id, null payment_date for pending, and reference links', async () => {
  const createdExpenses: Array<Record<string, unknown>> = [];
  const createdLinks: Array<Record<string, unknown>> = [];
  const createdEvents: Array<Record<string, unknown>> = [];

  const repository = {
    getExpenseCategory: async (id: string) => ({
      id,
      code: 'OPERATING',
      name: 'Operacion general',
      nature: 'OPERATING',
      summaryBucket: 'OPERATING',
      isOperatingCost: true,
      isDirectCost: false,
      isActive: true,
      sortOrder: 10,
    }),
    createExpense: async (payload: Record<string, unknown>) => {
      createdExpenses.push(payload);
      return payload as any;
    },
    createExpenseLinks: async (rows: Array<Record<string, unknown>>) => {
      createdLinks.push(...rows);
      return rows as any;
    },
    createEvent: async (payload: Record<string, unknown>) => {
      createdEvents.push(payload);
      return { id: 'event-1', ...payload, created_at: '' } as any;
    },
  };

  const service = createFinanceService({ repository: repository as any });

  const expense = await service.createExpense(
    {
      concept: 'Material electrico oficina',
      amount: 12500,
      expenseDate: '2026-09-11',
      categoryId: 'cat-1',
      status: 'PENDING',
      paymentDate: null,
      supplierName: 'Proveedor ABC',
      paymentMethod: 'TRANSFER',
      reference: 'SPEI-123',
      description: 'Compra rapida',
      links: [
        {
          entityType: 'INVENTORY_ITEM',
          entityId: 'inventory-1',
          linkRole: 'REFERENCE',
        },
      ],
    },
    { userId: 'user-1' }
  );

  assert.equal(createdExpenses.length, 1);
  assert.equal(typeof createdExpenses[0].id, 'string');
  assert.ok((createdExpenses[0].id as string).length > 10);
  assert.equal(createdExpenses[0].paymentDate, null);
  assert.equal(createdExpenses[0].sourceType, 'MANUAL');
  assert.equal(createdExpenses[0].createdBy, 'user-1');
  assert.equal(typeof createdExpenses[0].createdAt, 'string');
  assert.equal(typeof createdExpenses[0].updatedAt, 'string');
  assert.equal(createdLinks.length, 1);
  assert.equal(createdLinks[0].linkRole, 'REFERENCE');
  assert.equal(createdLinks[0].expenseId, expense.id);
  assert.equal(createdEvents.length, 1);
  assert.equal(createdEvents[0].event_type, 'FIN_EXPENSE_CREATED');
});

test('expense mappers use canonical expense contract in both directions', () => {
  const domainExpense = {
    id: 'expense-1',
    concept: 'Pago de energia',
    amount: 1450,
    expenseDate: '2026-09-14',
    categoryId: 'cat-1',
    categoryNameSnapshot: 'Electricidad',
    natureSnapshot: 'OPERATING' as const,
    summaryBucketSnapshot: 'OPERATING' as const,
    isOperatingCost: true,
    status: 'PAID' as const,
    paymentDate: '2026-09-14',
    paidAmount: 1450,
    supplierName: 'CFE',
    paymentMethod: 'TRANSFER',
    reference: 'SPEI-445',
    description: 'Factura septiembre',
    receiptUrl: null,
    sourceType: 'MANUAL' as const,
    correlationId: 'corr-1',
    relatedSaleId: null,
    relatedRentalId: null,
    relatedInventoryItemId: null,
    relatedModificationProjectId: null,
    cancelledAt: null,
    createdBy: 'user-1',
    createdAt: '2026-09-14T12:00:00.000Z',
    updatedAt: '2026-09-14T12:00:00.000Z',
  };

  const dbExpense = mapExpenseToDb(domainExpense);
  assert.equal(dbExpense.category_code, 'cat-1');
  assert.equal(dbExpense.provider_name, 'CFE');
  assert.equal(dbExpense.notes, 'Factura septiembre');
  assert.equal(dbExpense.origin, 'MANUAL');
  assert.equal(dbExpense.created_by, 'user-1');
  assert.equal('expense_category_id' in dbExpense, false);
  assert.equal('supplier_name' in dbExpense, false);
  assert.equal('description' in dbExpense, false);
  assert.equal('source_type' in dbExpense, false);

  const roundTripExpense = mapExpenseFromDb(dbExpense as any);
  assert.equal(roundTripExpense.categoryId, 'cat-1');
  assert.equal(roundTripExpense.supplierName, 'CFE');
  assert.equal(roundTripExpense.description, 'Factura septiembre');
  assert.equal(roundTripExpense.sourceType, 'MANUAL');
  assert.equal(roundTripExpense.createdBy, 'user-1');

  const dbLink = mapExpenseLinkToDb({
    expenseId: 'expense-1',
    entityType: 'INVENTORY_ITEM',
    entityId: 'inventory-1',
    linkRole: 'REFERENCE',
    allocatedAmount: null,
    correlationId: 'corr-1',
    notes: null,
  });
  assert.equal(dbLink.link_role, 'REFERENCE');
  assert.equal(dbLink.expense_id, 'expense-1');

  const roundTripLink = mapExpenseLinkFromDb({
    id: 'link-1',
    expense_id: 'expense-1',
    entity_type: 'INVENTORY_ITEM',
    entity_id: 'inventory-1',
    link_role: 'REFERENCE',
    allocated_amount: null,
    correlation_id: 'corr-1',
    notes: null,
    created_at: '2026-09-14T12:00:00.000Z',
  });
  assert.equal(roundTripLink.linkRole, 'REFERENCE');
  assert.equal(roundTripLink.expenseId, 'expense-1');
});

test('getMonthlyFinancialSummary counts payroll cash once from fin_expenses', async () => {
  const repository = {
    getMonthPeriod: async () => ({
      id: 'period-1',
      period_year: 2026,
      period_month: 9,
      status: 'OPEN',
      opening_balance: 0,
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
      closing_balance: 0,
      pending_obligations_total: 0,
      created_at: '',
      updated_at: '',
    }),
    getLatestClosedMonthPeriodBefore: async () => null,
    createMonthPeriod: async () => {
      throw new Error('Should not create month period when it already exists');
    },
    listExpenses: async () => ([
      {
        id: 'exp-payroll',
        concept: 'Nomina consolidada',
        amount: 38500,
        expenseDate: '2026-09-30',
        categoryId: 'cat-payroll',
        categoryNameSnapshot: 'Nomina operativa',
        natureSnapshot: 'PAYROLL',
        summaryBucketSnapshot: 'OPERATING',
        isOperatingCost: true,
        status: 'PAID',
        paymentDate: '2026-09-30',
        paidAmount: 38500,
        sourceType: 'PAYROLL',
        correlationId: 'corr-payroll',
        createdAt: '',
        updatedAt: '',
      },
    ]),
    listRecurringExpenses: async () => [],
    listPayrollProfiles: async () => ([
      {
        id: 'profile-1',
        estimated_monthly_cost: 20000,
        active: true,
      },
      {
        id: 'profile-2',
        estimated_monthly_cost: 18500,
        active: true,
      }
    ]),
  };

  const service = createFinanceService({
    repository: repository as any,
    salesAdapter: { getCollectedSalesIncome: async () => ({ items: [], total: 0, dataGapNotes: [] }) } as any,
    rentalAdapter: { getCollectedRentalIncome: async () => ({ items: [], total: 0, dataGapNotes: [] }) } as any,
  });

  const summary = await service.getMonthlyFinancialSummary(2026, 9);
  assert.equal(summary.totalExpenses, 38500);
  assert.equal(summary.operatingCost, 38500);
  assert.equal(summary.pendingObligations, 38500);
});

test('getMonthlyFinancialSummary does not create a new open month when record is missing', async () => {
  let createMonthPeriodCalled = false;

  const repository = {
    getMonthPeriod: async () => null,
    getLatestClosedMonthPeriodBefore: async () => ({
      id: 'period-8',
      period_year: 2026,
      period_month: 8,
      status: 'CLOSED',
      opening_balance: 1000,
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
      closing_balance: 2500,
      pending_obligations_total: 0,
      created_at: '',
      updated_at: '',
    }),
    createMonthPeriod: async () => {
      createMonthPeriodCalled = true;
      throw new Error('Should not persist month period during summary read');
    },
    listExpenses: async () => [],
    listRecurringExpenses: async () => [],
    listPayrollProfiles: async () => [],
  };

  const service = createFinanceService({
    repository: repository as any,
    salesAdapter: { getCollectedSalesIncome: async () => ({ items: [], total: 0, dataGapNotes: [] }) } as any,
    rentalAdapter: { getCollectedRentalIncome: async () => ({ items: [], total: 0, dataGapNotes: [] }) } as any,
  });

  const summary = await service.getMonthlyFinancialSummary(2026, 9);
  assert.equal(createMonthPeriodCalled, false);
  assert.equal(summary.openingBalance, 2500);
  assert.equal(summary.period.status, 'OPEN');
});

test('createPayrollBatch groups pending payroll periods into one batch', async () => {
  const createdBatches: Array<Record<string, unknown>> = [];
  const createdItems: Array<Record<string, unknown>> = [];

  const repository = {
    listPayrollPeriods: async () => ([
      {
        id: 'period-1',
        payroll_profile_id: 'profile-1',
        period_start: '2026-09-16',
        period_end: '2026-09-30',
        due_date: '2026-09-30',
        expected_amount: 9000,
        actual_amount: 0,
        status: 'PENDING',
        correlation_id: 'corr-1',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'period-2',
        payroll_profile_id: 'profile-2',
        period_start: '2026-09-16',
        period_end: '2026-09-30',
        due_date: '2026-09-30',
        expected_amount: 12000,
        actual_amount: 0,
        status: 'PENDING',
        correlation_id: 'corr-2',
        created_at: '',
        updated_at: '',
      },
    ]),
    listPayrollPeriodsByIds: async () => [],
    listPayrollBatches: async () => [],
    createPayrollBatch: async (payload: Record<string, unknown>) => {
      createdBatches.push(payload);
      return {
        id: 'batch-1',
        ...payload,
        created_at: '',
        updated_at: '',
      };
    },
    createPayrollBatchItems: async (rows: Array<Record<string, unknown>>) => {
      createdItems.push(...rows);
      return rows.map((row, index) => ({
        id: `item-${index + 1}`,
        ...row,
        created_at: '',
        updated_at: '',
      }));
    },
    createEvent: async () => ({ id: 'event-1', event_type: 'FIN_PAYROLL_BATCH_CREATED', payload: {}, created_at: '' }),
  };

  const service = createFinanceService({ repository: repository as any });
  const result = await service.createPayrollBatch({
    period_start: '2026-09-16',
    period_end: '2026-09-30',
  });

  assert.equal(Number(result.batch.expected_amount), 21000);
  assert.equal(createdBatches.length, 1);
  assert.equal(createdItems.length, 2);
  assert.deepEqual(
    createdItems.map(item => [item.payroll_period_id, item.expected_amount]),
    [
      ['period-1', 9000],
      ['period-2', 12000],
    ]
  );
});

test('registerPayrollBatchPayment creates one expense and keeps remaining balance pending', async () => {
  const createdExpenses: Array<Record<string, unknown>> = [];
  const updatedPeriods: Array<{ id: string; payload: Record<string, unknown> }> = [];
  let updatedBatchPayload: Record<string, unknown> | null = null;

  const repository = {
    getExpenseCategory: async (id: string) => ({
      id,
      code: 'OP_PAYROLL',
      name: 'Nomina operativa',
      nature: 'PAYROLL',
      summaryBucket: 'OPERATING',
      isOperatingCost: true,
      isDirectCost: false,
      isActive: true,
      sortOrder: 10,
    }),
    getPayrollBatch: async () => ({
      id: 'batch-1',
      period_start: '2026-09-16',
      period_end: '2026-09-30',
      expected_amount: 21000,
      paid_amount: 0,
      status: 'PENDING',
      correlation_id: 'batch-corr',
      created_at: '',
      updated_at: '',
    }),
    listPayrollBatchItems: async () => ([
      {
        id: 'item-1',
        payroll_batch_id: 'batch-1',
        payroll_period_id: 'period-1',
        expected_amount: 9000,
        paid_amount: 0,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'item-2',
        payroll_batch_id: 'batch-1',
        payroll_period_id: 'period-2',
        expected_amount: 12000,
        paid_amount: 0,
        created_at: '',
        updated_at: '',
      },
    ]),
    listPayrollPeriodsByIds: async () => ([
      {
        id: 'period-1',
        payroll_profile_id: 'profile-1',
        period_start: '2026-09-16',
        period_end: '2026-09-30',
        due_date: '2026-09-30',
        expected_amount: 9000,
        actual_amount: 0,
        status: 'PENDING',
        notes: null,
        correlation_id: 'corr-1',
        created_at: '',
        updated_at: '',
      },
      {
        id: 'period-2',
        payroll_profile_id: 'profile-2',
        period_start: '2026-09-16',
        period_end: '2026-09-30',
        due_date: '2026-09-30',
        expected_amount: 12000,
        actual_amount: 0,
        status: 'PENDING',
        notes: null,
        correlation_id: 'corr-2',
        created_at: '',
        updated_at: '',
      },
    ]),
    getExpenseCategoryByCode: async (code: string) => {
      if (code === 'OP_PAYROLL') {
        return {
          id: 'cat-payroll',
          code: 'OP_PAYROLL',
          name: 'Nomina operativa',
          nature: 'PAYROLL',
          summaryBucket: 'OPERATING',
          isOperatingCost: true,
          isDirectCost: false,
          isActive: true,
          sortOrder: 10,
        };
      }
      return null;
    },
    createExpense: async (payload: Record<string, unknown>) => {
      createdExpenses.push(payload);
      return {
        id: 'expense-1',
        ...payload,
        created_at: '',
        updated_at: '',
      };
    },
    createExpenseLinks: async () => [],
    createEvent: async () => ({ id: 'event-1', event_type: 'FIN_EXPENSE_CREATED', payload: {}, created_at: '' }),
    updatePayrollBatchItem: async () => ({ id: 'item', created_at: '', updated_at: '' }),
    updatePayrollPeriod: async (id: string, payload: Record<string, unknown>) => {
      updatedPeriods.push({ id, payload });
      return {
        id,
        ...payload,
        created_at: '',
        updated_at: '',
      };
    },
    updatePayrollBatch: async (_id: string, payload: Record<string, unknown>) => {
      updatedBatchPayload = payload;
      return {
        id: 'batch-1',
        period_start: '2026-09-16',
        period_end: '2026-09-30',
        expected_amount: 21000,
        ...payload,
        correlation_id: 'batch-corr',
        created_at: '',
        updated_at: '',
      };
    },
  };

  const service = createFinanceService({ repository: repository as any });
  const result = await service.registerPayrollBatchPayment('batch-1', {
    paid_amount: 20000,
    payment_date: '2026-09-30',
    payment_method: 'Transferencia',
    difference_treatment: 'KEEP_PENDING',
  });

  assert.equal(createdExpenses.length, 1);
  assert.equal(createdExpenses[0].amount, 20000);
  assert.equal(result.expense.sourceType, 'PAYROLL');
  assert.equal(updatedPeriods.length, 2);
  assert.equal(updatedPeriods[0].payload.status, 'PAID');
  assert.equal(updatedPeriods[1].payload.status, 'PENDING');
  assert.equal(updatedPeriods[1].payload.actual_amount, 11000);
  assert.equal(updatedBatchPayload?.status, 'PARTIAL');
  assert.equal(updatedBatchPayload?.financial_expense_id, createdExpenses[0].id);
});

test('registerPayrollBatchPayment requires reason and comment for explicit adjustment', async () => {
  const repository = {
    getPayrollBatch: async () => ({
      id: 'batch-1',
      period_start: '2026-09-16',
      period_end: '2026-09-30',
      expected_amount: 10000,
      paid_amount: 0,
      status: 'PENDING',
      correlation_id: 'batch-corr',
      created_at: '',
      updated_at: '',
    }),
    listPayrollBatchItems: async () => ([
      {
        id: 'item-1',
        payroll_batch_id: 'batch-1',
        payroll_period_id: 'period-1',
        expected_amount: 10000,
        paid_amount: 0,
        created_at: '',
        updated_at: '',
      },
    ]),
    listPayrollPeriodsByIds: async () => ([
      {
        id: 'period-1',
        payroll_profile_id: 'profile-1',
        period_start: '2026-09-16',
        period_end: '2026-09-30',
        due_date: '2026-09-30',
        expected_amount: 10000,
        actual_amount: 0,
        status: 'PENDING',
        notes: null,
        correlation_id: 'corr-1',
        created_at: '',
        updated_at: '',
      },
    ]),
  };

  const service = createFinanceService({ repository: repository as any });
  await assert.rejects(
    () =>
      service.registerPayrollBatchPayment('batch-1', {
        paid_amount: 9000,
        payment_date: '2026-09-30',
        difference_treatment: 'ADJUST_PERIOD',
      }),
    /exige motivo y comentario/
  );
});

test('changePayrollCompensation versions active compensation without altering history', async () => {
  const updatedHistory: Array<{ id: string; payload: Record<string, unknown> }> = [];
  let updatedProfilePayload: Record<string, unknown> | null = null;

  const repository = {
    listPayrollProfiles: async () => ([
      {
        id: 'profile-1',
        person_name: 'Juan Perez',
        area: 'Produccion',
        periodicity: 'BIWEEKLY',
        current_period_amount: 9000,
        estimated_monthly_cost: 18000,
        start_date: '2026-06-01',
        active: true,
        correlation_id: 'corr-1',
        created_at: '',
        updated_at: '',
      },
    ]),
    getActivePayrollCompensation: async () => ({
      id: 'comp-1',
      payroll_profile_id: 'profile-1',
      effective_from: '2026-06-01',
      effective_to: null,
      payment_frequency: 'BIWEEKLY',
      base_payment_amount: 9000,
      estimated_monthly_cost: 18000,
      change_reason: 'Alta',
      created_at: '',
    }),
    updatePayrollCompensationHistory: async (id: string, payload: Record<string, unknown>) => {
      updatedHistory.push({ id, payload });
      return { id, ...payload };
    },
    createPayrollCompensationHistory: async (payload: Record<string, unknown>) => ({
      id: 'comp-2',
      ...payload,
      created_at: '',
    }),
    updatePayrollProfile: async (_id: string, payload: Record<string, unknown>) => {
      updatedProfilePayload = payload;
      return {
        id: 'profile-1',
        ...payload,
        created_at: '',
        updated_at: '',
      };
    },
    createEvent: async () => ({ id: 'event-1', event_type: 'FIN_PAYROLL_COMPENSATION_CHANGED', payload: {}, created_at: '' }),
  };

  const service = createFinanceService({ repository: repository as any });
  await service.changePayrollCompensation('profile-1', {
    effective_from: '2026-10-01',
    payment_frequency: 'BIWEEKLY',
    base_payment_amount: 10000,
    estimated_monthly_cost: 20000,
    change_reason: 'Ajuste salarial',
  });

  assert.equal(updatedHistory[0].id, 'comp-1');
  assert.equal(updatedHistory[0].payload.effective_to, '2026-09-30');
  assert.equal(updatedProfilePayload?.current_period_amount, 10000);
  assert.equal(updatedProfilePayload?.estimated_monthly_cost, 20000);
});

test('createExpenseAttachment stores file path and delete removes only attachment assets', async () => {
  const uploads: Array<{ filePath: string; file: File }> = [];
  let deletedAttachmentId: string | null = null;
  let removedFilePath: string | null = null;

  const repository = {
    getExpenseById: async () => ({
      id: 'expense-1',
      concept: 'Pago',
      amount: 100,
      expenseDate: '2026-09-30',
      categoryId: 'cat-op',
      categoryNameSnapshot: 'Operacion',
      natureSnapshot: 'OPERATING',
      summaryBucketSnapshot: 'OPERATING',
      isOperatingCost: true,
      status: 'PAID',
      sourceType: 'MANUAL',
      correlationId: 'corr-1',
      createdAt: '',
      updatedAt: '',
    }),
    uploadExpenseAttachmentFile: async (filePath: string, file: File) => {
      uploads.push({ filePath, file });
    },
    createExpenseAttachment: async (payload: Record<string, unknown>) => ({
      id: 'att-1',
      ...payload,
      created_at: '',
    }),
    getExpenseAttachment: async () => ({
      id: 'att-1',
      expense_id: 'expense-1',
      file_path: uploads[0]?.filePath || 'expense-1/test.pdf',
      file_name: 'Factura.pdf',
      mime_type: 'application/pdf',
      document_type: 'INVOICE',
      created_at: '',
    }),
    removeExpenseAttachmentFile: async (filePath: string) => {
      removedFilePath = filePath;
    },
    deleteExpenseAttachment: async (attachmentId: string) => {
      deletedAttachmentId = attachmentId;
    },
    createEvent: async () => ({ id: 'event-1', event_type: 'FIN_EXPENSE_ATTACHMENT_CREATED', payload: {}, created_at: '' }),
  };

  const file = new File(['invoice'], 'Factura septiembre.pdf', { type: 'application/pdf' });
  const service = createFinanceService({ repository: repository as any });

  const attachment = await service.createExpenseAttachment({
    expenseId: 'expense-1',
    file,
    documentType: 'INVOICE',
  });

  assert.equal(uploads.length, 1);
  assert.match(uploads[0].filePath, /^expense-1\/\d+_Factura_septiembre\.pdf$/);
  assert.equal(attachment.file_name, 'Factura septiembre.pdf');

  await service.deleteExpenseAttachment('att-1');
  assert.equal(removedFilePath, uploads[0].filePath);
  assert.equal(deletedAttachmentId, 'att-1');
});
