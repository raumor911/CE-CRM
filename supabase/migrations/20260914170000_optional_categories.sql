-- Hacer opcional expense_category_id en fin_expenses
ALTER TABLE public.fin_expenses ALTER COLUMN expense_category_id DROP NOT NULL;

-- Hacer opcional expense_category_id en fin_recurring_expenses
ALTER TABLE public.fin_recurring_expenses ALTER COLUMN expense_category_id DROP NOT NULL;
