-- Ejecutar este archivo COMPLETO en el SQL Editor de Supabase
-- Contiene las tablas necesarias para el módulo de finanzas que te faltan en tu base de datos y sus políticas de seguridad (RLS).

-- 1. TABLA: Lotes de nómina (fin_payroll_batches)
create table if not exists public.fin_payroll_batches (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  expected_amount numeric(14,2) not null default 0 check (expected_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  payment_date date null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED')),
  financial_expense_id uuid null references public.fin_expenses(id) on delete set null,
  payment_method text null,
  reference text null,
  notes text null,
  difference_amount numeric(14,2) null default 0,
  difference_treatment text null check (difference_treatment in ('KEEP_PENDING', 'ADJUST_PERIOD')),
  adjustment_reason text null,
  adjustment_comment text null,
  correlation_id uuid not null default gen_random_uuid(),
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_fin_payroll_batches_period_range on public.fin_payroll_batches(period_start, period_end);
create index if not exists idx_fin_payroll_batches_status on public.fin_payroll_batches(status);
create index if not exists idx_fin_payroll_batches_expense on public.fin_payroll_batches(financial_expense_id);

-- Habilitar RLS y políticas
ALTER TABLE public.fin_payroll_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select a usuarios autenticados en batches" ON public.fin_payroll_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir insert a usuarios autenticados en batches" ON public.fin_payroll_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir update a usuarios autenticados en batches" ON public.fin_payroll_batches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- 2. TABLA: Elementos del lote de nómina (fin_payroll_batch_items)
create table if not exists public.fin_payroll_batch_items (
  id uuid primary key default gen_random_uuid(),
  payroll_batch_id uuid not null references public.fin_payroll_batches(id) on delete cascade,
  payroll_period_id uuid not null references public.fin_payroll_periods(id) on delete cascade,
  expected_amount numeric(14,2) not null default 0 check (expected_amount >= 0),
  paid_amount numeric(14,2) not null default 0 check (paid_amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (payroll_batch_id, payroll_period_id)
);

create index if not exists idx_fin_payroll_batch_items_period on public.fin_payroll_batch_items(payroll_period_id);

-- Habilitar RLS y políticas
ALTER TABLE public.fin_payroll_batch_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select a usuarios autenticados en batch items" ON public.fin_payroll_batch_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir insert a usuarios autenticados en batch items" ON public.fin_payroll_batch_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir update a usuarios autenticados en batch items" ON public.fin_payroll_batch_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- 3. TABLA: Historial de compensación (fin_payroll_compensation_history)
create table if not exists public.fin_payroll_compensation_history (
  id uuid primary key default gen_random_uuid(),
  payroll_profile_id uuid not null references public.fin_payroll_profiles(id) on delete cascade,
  effective_from date not null,
  effective_to date null,
  payment_frequency text not null check (payment_frequency in ('MONTHLY', 'BIWEEKLY', 'WEEKLY', 'CUSTOM')),
  base_payment_amount numeric(14,2) not null check (base_payment_amount > 0),
  estimated_monthly_cost numeric(14,2) not null check (estimated_monthly_cost > 0),
  change_reason text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_fin_payroll_comp_history_profile on public.fin_payroll_compensation_history(payroll_profile_id, effective_from desc);

create unique index if not exists uq_fin_payroll_comp_history_active on public.fin_payroll_compensation_history(payroll_profile_id) where effective_to is null;

-- Insertar historial de salarios para los perfiles ya existentes
insert into public.fin_payroll_compensation_history (
  payroll_profile_id, effective_from, effective_to, payment_frequency,
  base_payment_amount, estimated_monthly_cost, change_reason, created_by, created_at
)
select
  profile.id, profile.start_date, profile.end_date, profile.periodicity,
  profile.current_period_amount, profile.estimated_monthly_cost, coalesce(profile.notes, 'Backfill inicial'),
  profile.created_by, coalesce(profile.created_at, timezone('utc', now()))
from public.fin_payroll_profiles profile
where not exists (
  select 1 from public.fin_payroll_compensation_history history where history.payroll_profile_id = profile.id
);

-- Habilitar RLS y políticas
ALTER TABLE public.fin_payroll_compensation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select a usuarios autenticados en historial" ON public.fin_payroll_compensation_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir insert a usuarios autenticados en historial" ON public.fin_payroll_compensation_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir update a usuarios autenticados en historial" ON public.fin_payroll_compensation_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


-- 4. TABLA: Adjuntos de egresos (fin_expense_attachments)
create table if not exists public.fin_expense_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.fin_expenses(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  document_type text not null check (document_type in ('INVOICE', 'PAYMENT_RECEIPT', 'TICKET', 'PURCHASE_ORDER', 'OTHER')),
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_fin_expense_attachments_expense on public.fin_expense_attachments(expense_id, created_at);

-- Habilitar RLS y políticas
ALTER TABLE public.fin_expense_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select a usuarios autenticados en attachments" ON public.fin_expense_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir insert a usuarios autenticados en attachments" ON public.fin_expense_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Permitir update a usuarios autenticados en attachments" ON public.fin_expense_attachments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir delete a usuarios autenticados en attachments" ON public.fin_expense_attachments FOR DELETE TO authenticated USING (true);


-- 5. Insertar Categoría especial de nómina
insert into public.fin_expense_categories (
  code, name, nature, summary_bucket, is_operating_cost, is_active, sort_order, description
)
values (
  'OP_PAYROLL', 'Nomina operativa', 'PAYROLL', 'OPERATING', true, true, 35, 'Salida real de caja por pago consolidado o individual de nomina.'
)
on conflict (code) do update
set
  name = excluded.name, nature = excluded.nature, summary_bucket = excluded.summary_bucket,
  is_operating_cost = excluded.is_operating_cost, is_active = excluded.is_active,
  sort_order = excluded.sort_order, description = excluded.description;


-- 6. Configurar Bucket de Storage (Archivos)
insert into storage.buckets (id, name, public)
values ('finance-documents', 'finance-documents', false)
on conflict (id) do nothing;

create policy if not exists "finance_documents_select_authenticated" on storage.objects for select to authenticated using (bucket_id = 'finance-documents');
create policy if not exists "finance_documents_insert_authenticated" on storage.objects for insert to authenticated with check (bucket_id = 'finance-documents');
create policy if not exists "finance_documents_delete_authenticated" on storage.objects for delete to authenticated using (bucket_id = 'finance-documents');
