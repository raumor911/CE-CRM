import {
  FinanceExpense,
  FinanceExpenseCategory,
  FinanceExpenseLink,
  FinanceExpenseSourceType,
  FinanceExpenseStatus,
  FinanceExpenseNature,
  FinanceSummaryBucket,
  FinanceLinkEntityType,
} from '../types';

type FinanceExpenseCategoryRow = {
  id?: string;
  code?: string | null;
  name?: string | null;
  nature?: FinanceExpenseNature | null;
  summary_bucket?: FinanceSummaryBucket | null;
  is_operating_cost?: boolean | null;
  is_direct_cost?: boolean | null;
  is_active?: boolean | null;
  sort_order?: number | null;
  description?: string | null;
};

type FinanceExpenseRow = {
  id: string;
  concept: string;
  amount: number;
  expense_date: string;
  category_code?: string | null;
  category_name_snapshot?: string | null;
  nature_snapshot?: FinanceExpenseNature | null;
  summary_bucket_snapshot?: FinanceSummaryBucket | null;
  is_operating_cost: boolean;
  status: FinanceExpenseStatus;
  payment_date?: string | null;
  paid_amount?: number | null;
  provider_name?: string | null;
  payment_method?: string | null;
  reference?: string | null;
  notes?: string | null;
  receipt_url?: string | null;
  origin: FinanceExpenseSourceType;
  correlation_id: string;
  related_sale_id?: string | null;
  related_rental_id?: string | null;
  related_inventory_item_id?: string | null;
  related_modification_project_id?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

type FinanceExpenseLinkRow = {
  id: string;
  expense_id: string;
  entity_type: FinanceLinkEntityType;
  entity_id: string;
  link_role: 'PRIMARY' | 'RELATED' | 'REFERENCE';
  allocated_amount?: number | null;
  correlation_id?: string | null;
  notes?: string | null;
  created_at: string;
};

export const mapExpenseCategoryFromDb = (row: FinanceExpenseCategoryRow): FinanceExpenseCategory => ({
  id: row.id || row.code?.trim() || 'UNKNOWN',
  code: row.code?.trim() || row.id || 'UNKNOWN',
  name: row.name?.trim() || 'Sin categoria',
  nature: row.nature ?? 'OPERATING',
  summaryBucket: row.summary_bucket ?? 'OPERATING',
  isOperatingCost: Boolean(row.is_operating_cost),
  isDirectCost: Boolean(row.is_direct_cost),
  isActive: row.is_active !== false,
  sortOrder: Number.isFinite(row.sort_order) ? Number(row.sort_order) : 999,
  description: row.description ?? null,
});

export const mapExpenseFromDb = (row: FinanceExpenseRow): FinanceExpense => ({
  id: row.id,
  concept: row.concept,
  amount: Number(row.amount),
  expenseDate: row.expense_date,
  categoryId: row.category_code ?? null,
  categoryNameSnapshot: row.category_name_snapshot ?? 'Sin categoría',
  natureSnapshot: row.nature_snapshot ?? 'OPERATING',
  summaryBucketSnapshot: row.summary_bucket_snapshot ?? 'OPERATING',
  isOperatingCost: row.is_operating_cost,
  status: row.status,
  paymentDate: row.payment_date ?? null,
  paidAmount: row.paid_amount ?? null,
  supplierName: row.provider_name ?? null,
  paymentMethod: row.payment_method ?? null,
  reference: row.reference ?? null,
  description: row.notes ?? null,
  receiptUrl: row.receipt_url ?? null,
  sourceType: row.origin,
  correlationId: row.correlation_id,
  relatedSaleId: row.related_sale_id ?? null,
  relatedRentalId: row.related_rental_id ?? null,
  relatedInventoryItemId: row.related_inventory_item_id ?? null,
  relatedModificationProjectId: row.related_modification_project_id ?? null,
  cancelledAt: row.cancelled_at ?? null,
  createdBy: row.created_by ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapExpenseToDb = (expense: FinanceExpense) => ({
  id: expense.id,
  concept: expense.concept,
  amount: expense.amount,
  expense_date: expense.expenseDate,
  category_code: expense.categoryId,
  category_name_snapshot: expense.categoryNameSnapshot,
  nature_snapshot: expense.natureSnapshot,
  summary_bucket_snapshot: expense.summaryBucketSnapshot,
  is_operating_cost: expense.isOperatingCost,
  status: expense.status,
  payment_date: expense.paymentDate ?? null,
  paid_amount: expense.paidAmount ?? null,
  provider_name: expense.supplierName ?? null,
  payment_method: expense.paymentMethod ?? null,
  reference: expense.reference ?? null,
  notes: expense.description ?? null,
  receipt_url: expense.receiptUrl ?? null,
  origin: expense.sourceType,
  correlation_id: expense.correlationId,
  related_sale_id: expense.relatedSaleId ?? null,
  related_rental_id: expense.relatedRentalId ?? null,
  related_inventory_item_id: expense.relatedInventoryItemId ?? null,
  related_modification_project_id: expense.relatedModificationProjectId ?? null,
  cancelled_at: expense.cancelledAt ?? null,
  created_by: expense.createdBy ?? null,
  created_at: expense.createdAt,
  updated_at: expense.updatedAt,
});

export const mapExpenseUpdateToDb = (expense: Partial<FinanceExpense>) => ({
  ...(expense.concept !== undefined ? { concept: expense.concept } : {}),
  ...(expense.amount !== undefined ? { amount: expense.amount } : {}),
  ...(expense.expenseDate !== undefined ? { expense_date: expense.expenseDate } : {}),
  ...(expense.categoryId !== undefined ? { category_code: expense.categoryId } : {}),
  ...(expense.categoryNameSnapshot !== undefined ? { category_name_snapshot: expense.categoryNameSnapshot } : {}),
  ...(expense.natureSnapshot !== undefined ? { nature_snapshot: expense.natureSnapshot } : {}),
  ...(expense.summaryBucketSnapshot !== undefined ? { summary_bucket_snapshot: expense.summaryBucketSnapshot } : {}),
  ...(expense.isOperatingCost !== undefined ? { is_operating_cost: expense.isOperatingCost } : {}),
  ...(expense.status !== undefined ? { status: expense.status } : {}),
  ...(expense.paymentDate !== undefined ? { payment_date: expense.paymentDate } : {}),
  ...(expense.paidAmount !== undefined ? { paid_amount: expense.paidAmount } : {}),
  ...(expense.supplierName !== undefined ? { provider_name: expense.supplierName } : {}),
  ...(expense.paymentMethod !== undefined ? { payment_method: expense.paymentMethod } : {}),
  ...(expense.reference !== undefined ? { reference: expense.reference } : {}),
  ...(expense.description !== undefined ? { notes: expense.description } : {}),
  ...(expense.receiptUrl !== undefined ? { receipt_url: expense.receiptUrl } : {}),
  ...(expense.sourceType !== undefined ? { origin: expense.sourceType } : {}),
  ...(expense.correlationId !== undefined ? { correlation_id: expense.correlationId } : {}),
  ...(expense.relatedSaleId !== undefined ? { related_sale_id: expense.relatedSaleId } : {}),
  ...(expense.relatedRentalId !== undefined ? { related_rental_id: expense.relatedRentalId } : {}),
  ...(expense.relatedInventoryItemId !== undefined ? { related_inventory_item_id: expense.relatedInventoryItemId } : {}),
  ...(expense.relatedModificationProjectId !== undefined
    ? { related_modification_project_id: expense.relatedModificationProjectId }
    : {}),
  ...(expense.cancelledAt !== undefined ? { cancelled_at: expense.cancelledAt } : {}),
  ...(expense.createdBy !== undefined ? { created_by: expense.createdBy } : {}),
  ...(expense.createdAt !== undefined ? { created_at: expense.createdAt } : {}),
  ...(expense.updatedAt !== undefined ? { updated_at: expense.updatedAt } : {}),
});

export const mapExpenseLinkFromDb = (row: FinanceExpenseLinkRow): FinanceExpenseLink => ({
  id: row.id,
  expenseId: row.expense_id,
  entityType: row.entity_type,
  entityId: row.entity_id,
  linkRole: row.link_role,
  allocatedAmount: row.allocated_amount ?? null,
  correlationId: row.correlation_id ?? null,
  notes: row.notes ?? null,
  createdAt: row.created_at,
});

export const mapExpenseLinkToDb = (link: Omit<FinanceExpenseLink, 'id' | 'createdAt'>) => ({
  expense_id: link.expenseId,
  entity_type: link.entityType,
  entity_id: link.entityId,
  link_role: link.linkRole,
  allocated_amount: link.allocatedAmount ?? null,
  correlation_id: link.correlationId ?? null,
  notes: link.notes ?? null,
});
