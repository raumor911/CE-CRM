export type FinanceSummaryBucket =
  | 'OPERATING'
  | 'INVENTORY'
  | 'MODIFICATION'
  | 'LOGISTICS'
  | 'TAX'
  | 'EXTRAORDINARY';

export type FinanceExpenseNature =
  | 'OPERATING'
  | 'DIRECT_COST'
  | 'CAPEX'
  | 'TAX'
  | 'EXTRAORDINARY'
  | 'PAYROLL';

export type FinanceExpenseStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export type FinanceExpenseSourceType =
  | 'MANUAL'
  | 'RECURRING'
  | 'PAYROLL'
  | 'INVENTORY_PURCHASE'
  | 'MODIFICATION';

export type FinanceLinkEntityType =
  | 'INVENTORY_ITEM'
  | 'SALE'
  | 'RENTAL'
  | 'MODIFICATION_PROJECT'
  | 'OTHER'
  | 'PAYROLL_PROFILE'
  | 'RECURRING_EXPENSE';

export type FinanceAllocationEntityType =
  | 'INVENTORY_ITEM'
  | 'SALE'
  | 'RENTAL'
  | 'MODIFICATION_PROJECT';

export type FinanceRecurringFrequency =
  | 'MONTHLY'
  | 'BIMONTHLY'
  | 'QUARTERLY'
  | 'SEMIANNUAL'
  | 'ANNUAL'
  | 'CUSTOM_DAYS';

export type FinanceRecurringStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';
export type FinanceRecurringOccurrenceStatus = 'EXPECTED' | 'PAID' | 'CANCELLED';
export type FinancePayrollPeriodicity = 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'CUSTOM';
export type FinancePayrollBatchStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
export type FinancePayrollDifferenceTreatment = 'KEEP_PENDING' | 'ADJUST_PERIOD';
export type FinanceMonthStatus = 'OPEN' | 'CLOSED';
export type FinanceExpenseAttachmentType = 'INVOICE' | 'PAYMENT_RECEIPT' | 'TICKET' | 'PURCHASE_ORDER' | 'OTHER';

export interface FinanceExpenseCategory {
  id: string;
  code: string;
  name: string;
  nature: FinanceExpenseNature;
  summaryBucket: FinanceSummaryBucket;
  isOperatingCost: boolean;
  isDirectCost: boolean;
  isActive: boolean;
  sortOrder: number;
  description?: string | null;
}

export interface FinanceExpense {
  id: string;
  concept: string;
  amount: number;
  expenseDate: string;
  categoryId?: string | null;
  categoryNameSnapshot?: string | null;
  natureSnapshot?: FinanceExpenseNature | null;
  summaryBucketSnapshot?: FinanceSummaryBucket | null;
  isOperatingCost: boolean;
  status: FinanceExpenseStatus;
  paymentDate?: string | null;
  paidAmount?: number | null;
  supplierName?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  description?: string | null;
  receiptUrl?: string | null;
  sourceType: FinanceExpenseSourceType;
  correlationId: string;
  relatedSaleId?: string | null;
  relatedRentalId?: string | null;
  relatedInventoryItemId?: string | null;
  relatedModificationProjectId?: string | null;
  cancelledAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceExpenseLink {
  id: string;
  expenseId: string;
  entityType: FinanceLinkEntityType;
  entityId: string;
  linkRole: 'PRIMARY' | 'RELATED' | 'REFERENCE';
  allocatedAmount?: number | null;
  correlationId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface FinanceExpenseAllocation {
  id: string;
  expense_id: string;
  entity_type: FinanceAllocationEntityType;
  entity_id: string;
  allocated_amount: number;
  correlation_id: string;
  notes?: string | null;
  created_at: string;
}

export interface FinanceRecurringExpense {
  id: string;
  concept: string;
  expected_amount: number;
  category_code?: string | null;
  frequency: FinanceRecurringFrequency;
  interval_count: number;
  first_due_date: string;
  next_due_date: string;
  provider_name?: string | null;
  payment_method_default?: string | null;
  notes?: string | null;
  status: FinanceRecurringStatus;
  correlation_id: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceRecurringOccurrence {
  id: string;
  recurring_expense_id: string;
  due_date: string;
  expected_amount: number;
  actual_amount?: number | null;
  variance_amount?: number | null;
  status: FinanceRecurringOccurrenceStatus;
  payment_date?: string | null;
  paid_expense_id?: string | null;
  notes?: string | null;
  correlation_id: string;
  created_at: string;
  updated_at: string;
}

export interface FinancePayrollProfile {
  id: string;
  person_name: string;
  area: string;
  periodicity: FinancePayrollPeriodicity;
  current_period_amount: number;
  estimated_monthly_cost: number;
  active: boolean;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  correlation_id: string;
  created_at: string;
  updated_at: string;
}

export interface FinancePayrollPeriod {
  id: string;
  payroll_profile_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  expected_amount: number;
  actual_amount?: number | null;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  payment_date?: string | null;
  paid_expense_id?: string | null;
  notes?: string | null;
  correlation_id: string;
  created_at: string;
  updated_at: string;
}

export interface FinancePayrollBatch {
  id: string;
  period_start: string;
  period_end: string;
  expected_amount: number;
  paid_amount: number;
  payment_date?: string | null;
  status: FinancePayrollBatchStatus;
  financial_expense_id?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
  difference_amount?: number | null;
  difference_treatment?: FinancePayrollDifferenceTreatment | null;
  adjustment_reason?: string | null;
  adjustment_comment?: string | null;
  correlation_id: string;
  created_at: string;
  updated_at: string;
}

export interface FinancePayrollBatchItem {
  id: string;
  payroll_batch_id: string;
  payroll_period_id: string;
  expected_amount: number;
  paid_amount: number;
  created_at: string;
  updated_at: string;
}

export interface FinancePayrollCompensationHistory {
  id: string;
  payroll_profile_id: string;
  effective_from: string;
  effective_to?: string | null;
  payment_frequency: FinancePayrollPeriodicity;
  base_payment_amount: number;
  estimated_monthly_cost: number;
  change_reason?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface FinanceExpenseAttachment {
  id: string;
  expense_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  document_type: FinanceExpenseAttachmentType;
  created_by?: string | null;
  created_at: string;
}

export interface FinanceMonthPeriod {
  id: string;
  period_year: number;
  period_month: number;
  status: FinanceMonthStatus;
  opening_balance: number;
  collected_sales_income: number;
  collected_rental_income: number;
  total_income: number;
  operating_cost_paid: number;
  inventory_cost_paid: number;
  modification_cost_paid: number;
  logistics_cost_paid: number;
  tax_cost_paid: number;
  extraordinary_cost_paid: number;
  total_expenses_paid: number;
  net_cash_flow: number;
  closing_balance: number;
  pending_obligations_total: number;
  notes?: string | null;
  closed_at?: string | null;
  closed_by?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceInventoryCost {
  inventory_item_id: string;
  internal_id: string;
  product_type: string;
  acquisition_cost: number;
  logistics_cost: number;
  modification_cost: number;
  accumulated_cost: number;
}

export interface FinanceEvent {
  id: string;
  event_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  correlation_id?: string | null;
  payload: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
}

export interface FinanceCollectedIncomeItem {
  source_id: string;
  source_type: 'SALE' | 'RENTAL';
  label: string;
  amount: number;
  collected_at: string;
  notes?: string;
}

export interface FinanceCollectedIncomeResult {
  items: FinanceCollectedIncomeItem[];
  total: number;
  dataGapNotes: string[];
}

export interface FinanceReferenceOption {
  id: string;
  label: string;
}

export interface FinanceMonthlySummary {
  period: {
    year: number;
    month: number;
    label: string;
    startDate: string;
    endDate: string;
    status: FinanceMonthStatus;
  };
  openingBalance: number;
  salesCollected: number;
  rentalCollected: number;
  totalIncome: number;
  operatingCost: number;
  inventoryCost: number;
  modificationCost: number;
  logisticsCost: number;
  taxCost: number;
  extraordinaryCost: number;
  totalExpenses: number;
  netCashFlow: number;
  closingBalance: number;
  incomeToOperatingRatio: number | null;
  pendingObligations: number;
  dataGapNotes: string[];
}

export interface FinanceExpenseDraft {
  id?: string;
  concept: string;
  amount: number;
  expenseDate: string;
  categoryId?: string | null;
  status?: FinanceExpenseStatus;
  paymentDate?: string | null;
  paidAmount?: number | null;
  supplierName?: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  description?: string | null;
  receiptUrl?: string | null;
  sourceType?: FinanceExpenseSourceType;
  correlationId?: string;
  relatedSaleId?: string | null;
  relatedRentalId?: string | null;
  relatedInventoryItemId?: string | null;
  relatedModificationProjectId?: string | null;
  links?: Array<{
    entityType: FinanceLinkEntityType;
    entityId: string;
    linkRole?: 'PRIMARY' | 'RELATED' | 'REFERENCE';
    allocatedAmount?: number | null;
    notes?: string;
  }>;
}

export interface FinanceRecurringExpenseDraft {
  concept: string;
  expected_amount: number;
  category_code?: string | null;
  frequency: FinanceRecurringFrequency;
  interval_count?: number;
  first_due_date: string;
  next_due_date?: string;
  provider_name?: string | null;
  payment_method_default?: string | null;
  notes?: string | null;
  status?: FinanceRecurringStatus;
  correlation_id?: string;
}

export interface FinancePayrollProfileDraft {
  person_name: string;
  area: string;
  periodicity: FinancePayrollPeriodicity;
  current_period_amount: number;
  estimated_monthly_cost: number;
  active?: boolean;
  start_date: string;
  end_date?: string | null;
  notes?: string | null;
  correlation_id?: string;
}

export interface FinancePayrollBatchDraft {
  period_start: string;
  period_end: string;
  payroll_period_ids?: string[];
  correlation_id?: string;
}

export interface FinancePayrollBatchPaymentDraft {
  paid_amount: number;
  payment_date: string;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
  receipt_url?: string | null;
  difference_treatment?: FinancePayrollDifferenceTreatment | null;
  adjustment_reason?: string | null;
  adjustment_comment?: string | null;
}

export interface FinancePayrollCompensationChangeDraft {
  effective_from: string;
  payment_frequency: FinancePayrollPeriodicity;
  base_payment_amount: number;
  estimated_monthly_cost: number;
  change_reason?: string | null;
}

export interface FinanceExpenseAttachmentDraft {
  expense_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  document_type: FinanceExpenseAttachmentType;
}

export interface FinanceExpenseFilters {
  year?: number;
  month?: number;
  status?: FinanceExpenseStatus | 'ALL';
  nature?: FinanceExpenseNature | 'ALL';
  categoryId?: string | 'ALL';
  supplierName?: string;
  sourceType?: FinanceExpenseSourceType | 'ALL';
  query?: string;
}

export interface FinanceResourceErrors {
  summary?: string | null;
  categories?: string | null;
  expenses?: string | null;
  allExpenses?: string | null;
  recurringExpenses?: string | null;
  recurringOccurrences?: string | null;
  allRecurringOccurrences?: string | null;
  payrollProfiles?: string | null;
  payrollPeriods?: string | null;
  allPayrollPeriods?: string | null;
  payrollBatches?: string | null;
  inventoryCosts?: string | null;
  inventoryReferences?: string | null;
  rentalReferences?: string | null;
  saleReferences?: string | null;
  modificationProjectReferences?: string | null;
}
