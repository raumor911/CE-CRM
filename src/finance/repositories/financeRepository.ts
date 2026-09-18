import { supabase } from '../../lib/supabase';
import {
  FinanceEvent,
  FinanceExpense,
  FinanceExpenseAttachment,
  FinanceExpenseAttachmentDraft,
  FinanceExpenseAllocation,
  FinanceExpenseCategory,
  FinanceExpenseFilters,
  FinanceExpenseLink,
  FinanceInventoryCost,
  FinanceMonthPeriod,
  FinancePayrollBatch,
  FinancePayrollBatchItem,
  FinancePayrollBatchDraft,
  FinancePayrollCompensationHistory,
  FinancePayrollPeriod,
  FinancePayrollProfile,
  FinancePayrollProfileDraft,
  FinanceReferenceOption,
  FinanceRecurringExpense,
  FinanceRecurringExpenseDraft,
  FinanceRecurringOccurrence,
} from '../types';
import {
  mapExpenseCategoryFromDb,
  mapExpenseFromDb,
  mapExpenseLinkFromDb,
  mapExpenseLinkToDb,
  mapExpenseToDb,
  mapExpenseUpdateToDb,
} from './expenseMappers';

const buildMonthRange = (year?: number, month?: number) => {
  if (!year || !month) return null;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

export const financeRepository = {
  async listExpenseCategories(): Promise<FinanceExpenseCategory[]> {
    try {
      const { data, error } = await supabase
        .from('fin_expense_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase error loading categories:', error);
        throw error;
      }
      
      return (data || [])
        .map(row => mapExpenseCategoryFromDb(row as any))
        .filter(category => category.name.trim().length > 0)
        .sort((left, right) => {
          if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
          return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' });
        });
    } catch (err) {
      console.error('Error in listExpenseCategories:', err);
      throw err;
    }
  },

  async getExpenseCategory(id: string): Promise<FinanceExpenseCategory | null> {
    const { data, error } = await supabase
      .from('fin_expense_categories')
      .select('*')
      .eq('code', id)
      .single();

    if (error) throw error;
    return mapExpenseCategoryFromDb(data as any);
  },

  async getExpenseCategoryByCode(code: string): Promise<FinanceExpenseCategory | null> {
    const { data, error } = await supabase
      .from('fin_expense_categories')
      .select('*')
      .eq('code', code)
      .single();

    if (error) throw error;
    return mapExpenseCategoryFromDb(data as any);
  },

  async listExpenses(filters: FinanceExpenseFilters = {}): Promise<FinanceExpense[]> {
    let query = supabase.from('fin_expenses').select('*').order('expense_date', { ascending: false });
    const monthRange = buildMonthRange(filters.year, filters.month);

    if (monthRange) {
      query = query.gte('expense_date', monthRange.start).lte('expense_date', monthRange.end);
    }
    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status);
    }
    if (filters.nature && filters.nature !== 'ALL') {
      query = query.eq('nature_snapshot', filters.nature);
    }
    if (filters.categoryId && filters.categoryId !== 'ALL') {
      query = query.eq('category_code', filters.categoryId);
    }
    if (filters.sourceType && filters.sourceType !== 'ALL') {
      query = query.eq('origin', filters.sourceType);
    }
    if (filters.supplierName) {
      query = query.ilike('provider_name', `%${filters.supplierName}%`);
    }
    if (filters.query) {
      query = query.or(
        `concept.ilike.%${filters.query}%,provider_name.ilike.%${filters.query}%,reference.ilike.%${filters.query}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(row => mapExpenseFromDb(row as any));
  },

  async getExpenseById(id: string): Promise<FinanceExpense | null> {
    const { data, error } = await supabase
      .from('fin_expenses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapExpenseFromDb(data as any);
  },

  async createExpense(payload: FinanceExpense): Promise<FinanceExpense> {
    const { data, error } = await supabase
      .from('fin_expenses')
      .insert(mapExpenseToDb(payload))
      .select('*')
      .single();

    if (error) throw error;
    return mapExpenseFromDb(data as any);
  },

  async updateExpense(id: string, payload: Partial<FinanceExpense>): Promise<FinanceExpense> {
    const { data, error } = await supabase
      .from('fin_expenses')
      .update(mapExpenseUpdateToDb(payload))
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return mapExpenseFromDb(data as any);
  },

  async createExpenseLinks(
    rows: Array<Omit<FinanceExpenseLink, 'id' | 'createdAt'>>
  ): Promise<FinanceExpenseLink[]> {
    if (!rows.length) return [];
    const { data, error } = await supabase
      .from('fin_expense_links')
      .insert(rows.map(row => mapExpenseLinkToDb(row)))
      .select('*');

    if (error) throw error;
    return (data || []).map(row => mapExpenseLinkFromDb(row as any));
  },

  async listExpenseAllocations(expenseId: string): Promise<FinanceExpenseAllocation[]> {
    const { data, error } = await supabase
      .from('fin_expense_allocations')
      .select('*')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as FinanceExpenseAllocation[];
  },

  async createExpenseAllocation(
    payload: Omit<FinanceExpenseAllocation, 'id' | 'created_at'>
  ): Promise<FinanceExpenseAllocation> {
    const { data, error } = await supabase
      .from('fin_expense_allocations')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceExpenseAllocation;
  },

  async removeExpenseAllocation(id: string): Promise<void> {
    const { error } = await supabase.from('fin_expense_allocations').delete().eq('id', id);
    if (error) throw error;
  },

  async listRecurringExpenses(): Promise<FinanceRecurringExpense[]> {
    const { data, error } = await supabase
      .from('fin_recurring_expenses')
      .select('*')
      .order('next_due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as FinanceRecurringExpense[];
  },

  async createRecurringExpense(payload: FinanceRecurringExpenseDraft & Record<string, unknown>): Promise<FinanceRecurringExpense> {
    const { data, error } = await supabase
      .from('fin_recurring_expenses')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceRecurringExpense;
  },

  async updateRecurringExpense(id: string, payload: Record<string, unknown>): Promise<FinanceRecurringExpense> {
    const { data, error } = await supabase
      .from('fin_recurring_expenses')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceRecurringExpense;
  },

  async listRecurringOccurrences(startDate?: string, endDate?: string): Promise<FinanceRecurringOccurrence[]> {
    let query = supabase
      .from('fin_recurring_occurrences')
      .select('*')
      .order('due_date', { ascending: true });

    if (startDate) query = query.gte('due_date', startDate);
    if (endDate) query = query.lte('due_date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as FinanceRecurringOccurrence[];
  },

  async createRecurringOccurrences(rows: Array<Record<string, unknown>>): Promise<FinanceRecurringOccurrence[]> {
    if (!rows.length) return [];
    const { data, error } = await supabase
      .from('fin_recurring_occurrences')
      .upsert(rows, { onConflict: 'recurring_expense_id,due_date', ignoreDuplicates: true })
      .select('*');

    if (error) throw error;
    return (data || []) as FinanceRecurringOccurrence[];
  },

  async updateRecurringOccurrence(id: string, payload: Record<string, unknown>): Promise<FinanceRecurringOccurrence> {
    const { data, error } = await supabase
      .from('fin_recurring_occurrences')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceRecurringOccurrence;
  },

  async cancelPendingRecurringOccurrences(recurringExpenseId: string): Promise<void> {
    const { error } = await supabase
      .from('fin_recurring_occurrences')
      .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
      .eq('recurring_expense_id', recurringExpenseId)
      .eq('status', 'EXPECTED');
      
    if (error) throw error;
  },

  async listPayrollProfiles(): Promise<FinancePayrollProfile[]> {
    const { data, error } = await supabase
      .from('fin_payroll_profiles')
      .select('*')
      .order('person_name', { ascending: true });

    if (error) throw error;
    return (data || []) as FinancePayrollProfile[];
  },

  async createPayrollProfile(payload: FinancePayrollProfileDraft & Record<string, unknown>): Promise<FinancePayrollProfile> {
    const { data, error } = await supabase
      .from('fin_payroll_profiles')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayrollProfile;
  },

  async updatePayrollProfile(id: string, payload: Record<string, unknown>): Promise<FinancePayrollProfile> {
    const { data, error } = await supabase
      .from('fin_payroll_profiles')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayrollProfile;
  },

  async listPayrollPeriods(startDate?: string, endDate?: string): Promise<FinancePayrollPeriod[]> {
    let query = supabase
      .from('fin_payroll_periods')
      .select('*')
      .order('due_date', { ascending: true });

    if (startDate) query = query.gte('due_date', startDate);
    if (endDate) query = query.lte('due_date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as FinancePayrollPeriod[];
  },

  async listPayrollPeriodsByIds(ids: string[]): Promise<FinancePayrollPeriod[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from('fin_payroll_periods')
      .select('*')
      .in('id', ids)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data || []) as FinancePayrollPeriod[];
  },

  async createPayrollPeriods(rows: Array<Record<string, unknown>>): Promise<FinancePayrollPeriod[]> {
    if (!rows.length) return [];
    const { data, error } = await supabase
      .from('fin_payroll_periods')
      .upsert(rows, { onConflict: 'payroll_profile_id,period_start,period_end', ignoreDuplicates: true })
      .select('*');

    if (error) throw error;
    return (data || []) as FinancePayrollPeriod[];
  },

  async updatePayrollPeriod(id: string, payload: Record<string, unknown>): Promise<FinancePayrollPeriod> {
    const { data, error } = await supabase
      .from('fin_payroll_periods')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayrollPeriod;
  },

  async listPayrollBatches(startDate?: string, endDate?: string): Promise<FinancePayrollBatch[]> {
    let query = supabase
      .from('fin_payroll_batches')
      .select('*')
      .order('period_start', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('period_start', startDate);
    if (endDate) query = query.lte('period_end', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as FinancePayrollBatch[];
  },

  async getPayrollBatch(id: string): Promise<FinancePayrollBatch | null> {
    const { data, error } = await supabase
      .from('fin_payroll_batches')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data as FinancePayrollBatch | null) || null;
  },

  async createPayrollBatch(payload: FinancePayrollBatchDraft & Record<string, unknown>): Promise<FinancePayrollBatch> {
    const { data, error } = await supabase
      .from('fin_payroll_batches')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayrollBatch;
  },

  async updatePayrollBatch(id: string, payload: Record<string, unknown>): Promise<FinancePayrollBatch> {
    const { data, error } = await supabase
      .from('fin_payroll_batches')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayrollBatch;
  },

  async listPayrollBatchItems(payrollBatchId: string): Promise<FinancePayrollBatchItem[]> {
    const { data, error } = await supabase
      .from('fin_payroll_batch_items')
      .select('*')
      .eq('payroll_batch_id', payrollBatchId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as FinancePayrollBatchItem[];
  },

  async listPayrollBatchItemsForPeriods(payrollPeriodIds: string[]): Promise<FinancePayrollBatchItem[]> {
    if (!payrollPeriodIds.length) return [];
    const { data, error } = await supabase
      .from('fin_payroll_batch_items')
      .select('*')
      .in('payroll_period_id', payrollPeriodIds)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as FinancePayrollBatchItem[];
  },

  async createPayrollBatchItems(rows: Array<Record<string, unknown>>): Promise<FinancePayrollBatchItem[]> {
    if (!rows.length) return [];
    const { data, error } = await supabase
      .from('fin_payroll_batch_items')
      .insert(rows)
      .select('*');

    if (error) throw error;
    return (data || []) as FinancePayrollBatchItem[];
  },

  async updatePayrollBatchItem(id: string, payload: Record<string, unknown>): Promise<FinancePayrollBatchItem> {
    const { data, error } = await supabase
      .from('fin_payroll_batch_items')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayrollBatchItem;
  },

  async listPayrollCompensationHistory(payrollProfileId?: string): Promise<FinancePayrollCompensationHistory[]> {
    let query = supabase
      .from('fin_payroll_compensation_history')
      .select('*')
      .order('effective_from', { ascending: false })
      .order('created_at', { ascending: false });

    if (payrollProfileId) query = query.eq('payroll_profile_id', payrollProfileId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as FinancePayrollCompensationHistory[];
  },

  async getActivePayrollCompensation(payrollProfileId: string): Promise<FinancePayrollCompensationHistory | null> {
    const { data, error } = await supabase
      .from('fin_payroll_compensation_history')
      .select('*')
      .eq('payroll_profile_id', payrollProfileId)
      .is('effective_to', null)
      .order('effective_from', { ascending: false })
      .maybeSingle();

    if (error) throw error;
    return (data as FinancePayrollCompensationHistory | null) || null;
  },

  async createPayrollCompensationHistory(payload: Record<string, unknown>): Promise<FinancePayrollCompensationHistory> {
    const { data, error } = await supabase
      .from('fin_payroll_compensation_history')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayrollCompensationHistory;
  },

  async updatePayrollCompensationHistory(id: string, payload: Record<string, unknown>): Promise<FinancePayrollCompensationHistory> {
    const { data, error } = await supabase
      .from('fin_payroll_compensation_history')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinancePayrollCompensationHistory;
  },

  async getMonthPeriod(year: number, month: number): Promise<FinanceMonthPeriod | null> {
    const { data, error } = await supabase
      .from('fin_month_periods')
      .select('*')
      .eq('period_year', year)
      .eq('period_month', month)
      .maybeSingle();

    if (error) throw error;
    return (data as FinanceMonthPeriod | null) || null;
  },

  async getLatestClosedMonthPeriodBefore(year: number, month: number): Promise<FinanceMonthPeriod | null> {
    const periodKey = year * 100 + month;
    const { data, error } = await supabase
      .from('fin_month_periods')
      .select('*')
      .eq('status', 'CLOSED')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });

    if (error) throw error;

    const period = ((data || []) as FinanceMonthPeriod[]).find(
      item => item.period_year * 100 + item.period_month < periodKey
    );
    return period || null;
  },

  async createMonthPeriod(payload: Record<string, unknown>): Promise<FinanceMonthPeriod> {
    const { data, error } = await supabase
      .from('fin_month_periods')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceMonthPeriod;
  },

  async updateMonthPeriod(id: string, payload: Record<string, unknown>): Promise<FinanceMonthPeriod> {
    const { data, error } = await supabase
      .from('fin_month_periods')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceMonthPeriod;
  },

  async listInventoryCosts(): Promise<FinanceInventoryCost[]> {
    const { data, error } = await supabase
      .from('fin_v_inventory_costs')
      .select('*')
      .order('internal_id', { ascending: true });

    if (error) throw error;
    return (data || []) as FinanceInventoryCost[];
  },

  async getInventoryCost(inventoryItemId: string): Promise<FinanceInventoryCost | null> {
    const { data, error } = await supabase
      .from('fin_v_inventory_costs')
      .select('*')
      .eq('inventory_item_id', inventoryItemId)
      .maybeSingle();

    if (error) throw error;
    return (data as FinanceInventoryCost | null) || null;
  },

  async createEvent(payload: Omit<FinanceEvent, 'id' | 'created_at'>): Promise<FinanceEvent> {
    const { data, error } = await supabase
      .from('fin_events')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceEvent;
  },

  async listInventoryReferences(): Promise<Array<{ id: string; label: string }>> {
    const { data, error } = await supabase
      .from('inventory_products')
      .select('id, internal_id, product_type')
      .order('internal_id', { ascending: true });

    if (error) throw error;
    return (data || []).map((item: any) => ({
      id: item.id,
      label: `${item.internal_id} · ${item.product_type}`,
    }));
  },

  async listRentalReferences(): Promise<Array<{ id: string; label: string }>> {
    const { data, error } = await supabase
      .from('rentals')
      .select('id, customer_name, project_name')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data || []).map((item: any) => ({
      id: item.id,
      label: item.project_name ? `${item.customer_name} · ${item.project_name}` : item.customer_name,
    }));
  },

  async listSaleReferences(): Promise<Array<{ id: string; label: string }>> {
    const { data, error } = await supabase
      .from('leads')
      .select('id, lead_name, project_name')
      .eq('payment_confirmed', true)
      .order('contract_signed_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data || []).map((item: any) => ({
      id: item.id,
      label: item.project_name ? `${item.lead_name} · ${item.project_name}` : item.lead_name,
    }));
  },

  async listModificationProjectReferences(): Promise<FinanceReferenceOption[]> {
    const { data, error } = await supabase
      .from('leads')
      .select('id, lead_name, project_name, category, is_archived, last_activity')
      .in('category', ['Proyecto', '10 ft Modificado'])
      .or('is_archived.is.false,is_archived.is.null')
      .order('last_activity', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data || []).map((item: any) => ({
      id: item.id,
      label: item.project_name ? `${item.lead_name} · ${item.project_name}` : item.lead_name,
    }));
  },

  async listExpenseAttachments(expenseId: string): Promise<FinanceExpenseAttachment[]> {
    const { data, error } = await supabase
      .from('fin_expense_attachments')
      .select('*')
      .eq('expense_id', expenseId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as FinanceExpenseAttachment[];
  },

  async getExpenseAttachment(id: string): Promise<FinanceExpenseAttachment | null> {
    const { data, error } = await supabase
      .from('fin_expense_attachments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return (data as FinanceExpenseAttachment | null) || null;
  },

  async createExpenseAttachment(payload: FinanceExpenseAttachmentDraft & Record<string, unknown>): Promise<FinanceExpenseAttachment> {
    const { data, error } = await supabase
      .from('fin_expense_attachments')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as FinanceExpenseAttachment;
  },

  async deleteExpenseAttachment(id: string): Promise<void> {
    const { error } = await supabase
      .from('fin_expense_attachments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async uploadExpenseAttachmentFile(filePath: string, file: File, bucket = 'finance-documents'): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false });

    if (error) throw error;
  },

  async removeExpenseAttachmentFile(filePath: string, bucket = 'finance-documents'): Promise<void> {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) throw error;
  },

  async createExpenseAttachmentSignedUrl(filePath: string, expiresInSeconds = 300, bucket = 'finance-documents'): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds, { download: false });

    if (error) throw error;
    return data.signedUrl;
  },

  async registerInventoryProduct(payload: {
    product_type: string;
    physical_number?: string | null;
    condition: string;
    location: string;
    location_detail?: string | null;
    operational_status: string;
    available_for_sale: boolean;
    available_for_rent: boolean;
    available_for_modification: boolean;
    notes?: string | null;
  }): Promise<{ id: string; internal_id: string; product_type: string }> {
    const { data, error } = await supabase.rpc('register_inventory_product', {
      p_product_type: payload.product_type,
      p_physical_number: payload.physical_number || null,
      p_condition: payload.condition,
      p_location: payload.location,
      p_location_detail: payload.location_detail || null,
      p_operational_status: payload.operational_status,
      p_available_for_sale: payload.available_for_sale,
      p_available_for_rent: payload.available_for_rent,
      p_available_for_modification: payload.available_for_modification,
      p_notes: payload.notes || null,
      p_rental_id: null,
    });

    if (error) throw error;
    return data as { id: string; internal_id: string; product_type: string };
  },
};

export type FinanceRepository = typeof financeRepository;
