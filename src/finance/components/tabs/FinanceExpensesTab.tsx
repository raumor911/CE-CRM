import React, { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, FileText, Filter, Loader2, Paperclip, Plus, Search } from 'lucide-react';
import { formatCurrency, formatLocalDate } from '../../../lib/utils';
import { useExpenses } from '../../hooks/useExpenses';
import { UseFinanceModuleResult } from '../../hooks/useFinanceModule';
import { FinanceExpense, FinanceExpenseAttachment, FinanceExpenseAttachmentType, FinanceExpenseNature } from '../../types';
import {
  Chip,
  dayLabel,
  EmptyState,
  Field,
  FinanceCard,
  FinancialMetricCard,
  inputClass,
  mutedInputClass,
  numberFromInput,
  SlideOverPanel,
  StatusBadge,
  natureLabel,
  getToday,
} from '../shared';

type ExpenseLinkMode = 'NONE' | 'INVENTORY_ITEM' | 'SALE' | 'RENTAL' | 'MODIFICATION_PROJECT' | 'OTHER';
type ExpenseFormErrors = Partial<
  Record<'concept' | 'amount' | 'expenseDate' | 'category' | 'paymentDate' | 'linkedEntityId' | 'otherDescription', string>
>;

const attachmentTypes: Array<{ value: FinanceExpenseAttachmentType; label: string }> = [
  { value: 'INVOICE', label: 'Factura' },
  { value: 'PAYMENT_RECEIPT', label: 'Comprobante de pago' },
  { value: 'TICKET', label: 'Ticket' },
  { value: 'PURCHASE_ORDER', label: 'Orden de compra' },
  { value: 'OTHER', label: 'Otro' },
];

const paymentMethodOptions = [
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'OTHER', label: 'Otro' },
] as const;

const paymentMethodLabel = (value?: string | null) =>
  paymentMethodOptions.find(option => option.value === value)?.label || value || 'Sin metodo';

const getReferenceLabel = (mode: ExpenseLinkMode) =>
  ({
    INVENTORY_ITEM: 'Container *',
    SALE: 'Venta *',
    RENTAL: 'Renta *',
    MODIFICATION_PROJECT: 'Proyecto de modificacion *',
    OTHER: 'Descripcion *',
    NONE: 'Seleccionar',
  })[mode];

const buildExpenseDescription = (description: string, otherDescription: string) => {
  const trimmedBaseDescription = description.trim();
  const trimmedOtherDescription = otherDescription.trim();
  if (!trimmedOtherDescription) return trimmedBaseDescription || null;
  return [trimmedBaseDescription, `Referencia contextual: ${trimmedOtherDescription}`].filter(Boolean).join('\n\n');
};

const getLinkedEntityMeta = (expense: FinanceExpense, finance: ReturnType<typeof useExpenses>) => {
  if (expense.relatedInventoryItemId) {
    const found = finance.inventoryReferences.find(item => item.id === expense.relatedInventoryItemId);
    return found ? `Container · ${found.label}` : 'Container vinculado';
  }
  if (expense.relatedSaleId) {
    const found = finance.saleReferences.find(item => item.id === expense.relatedSaleId);
    return found ? `Venta · ${found.label}` : 'Venta vinculada';
  }
  if (expense.relatedRentalId) {
    const found = finance.rentalReferences.find(item => item.id === expense.relatedRentalId);
    return found ? `Renta · ${found.label}` : 'Renta vinculada';
  }
  if (expense.relatedModificationProjectId) {
    const found = finance.modificationProjectReferences.find(item => item.id === expense.relatedModificationProjectId);
    return found ? `Proyecto · ${found.label}` : 'Proyecto de modificacion vinculado';
  }
  return null;
};

export const FinanceExpensesTab: React.FC<{
  finance: UseFinanceModuleResult;
  periodLabel: string;
  onSuccess: (message: string) => void;
}> = ({ finance: financeModule, periodLabel, onSuccess }) => {
  const finance = useExpenses(financeModule);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseStatus, setExpenseStatus] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [expenseCategory, setExpenseCategory] = useState<'ALL' | string>('ALL');
  const [expenseNature, setExpenseNature] = useState<'ALL' | FinanceExpenseNature>('ALL');
  const [showMoreExpenseFilters, setShowMoreExpenseFilters] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<FinanceExpenseAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentType, setAttachmentType] = useState<FinanceExpenseAttachmentType>('PAYMENT_RECEIPT');
    const [formErrors, setFormErrors] = useState<ExpenseFormErrors>({});
    const [submitError, setSubmitError] = useState<string | null>(null);

  const [expenseForm, setExpenseForm] = useState({
    concept: '',
    amount: '',
    expenseDate: getToday(),
    categoryId: null as string | null,
    supplierName: '',
    paymentMethod: '',
    reference: '',
    description: '',
    status: 'PENDING' as 'PENDING' | 'PAID',
    paymentDate: '',
    link_mode: 'NONE' as ExpenseLinkMode,
    linkedEntityId: '',
    otherDescription: '',
    document_type: 'PAYMENT_RECEIPT' as FinanceExpenseAttachmentType,
  });
  const [expenseFile, setExpenseFile] = useState<File | null>(null);

  useEffect(() => {
    if (!selectedExpenseId) {
      setAttachments([]);
      return;
    }

    setAttachmentsLoading(true);
    finance
      .listExpenseAttachments(selectedExpenseId)
      .then(setAttachments)
      .catch(() => undefined)
        .finally(() => setAttachmentsLoading(false));
    }, [finance.listExpenseAttachments, selectedExpenseId]);

  const activeExpenses = finance.activeExpenses;
  const pendingExpenseAmount = useMemo(
    () =>
      activeExpenses
        .filter((item: FinanceExpense) => item.status === 'PENDING')
        .reduce((sum: number, item: FinanceExpense) => sum + Number(item.amount), 0),
    [activeExpenses]
  );

  const filteredExpenses = useMemo(() => {
    const query = expenseSearch.trim().toLowerCase();

    return activeExpenses.filter((item: FinanceExpense) => {
      const matchesQuery =
        !query ||
        item.concept.toLowerCase().includes(query) ||
          (item.supplierName || '').toLowerCase().includes(query) ||
        (item.reference || '').toLowerCase().includes(query);

      const matchesStatus = expenseStatus === 'ALL' || item.status === expenseStatus;
        const matchesCategory = expenseCategory === 'ALL' || item.categoryId === expenseCategory;
        const matchesNature = expenseNature === 'ALL' || item.natureSnapshot === expenseNature;

      return matchesQuery && matchesStatus && matchesCategory && matchesNature;
    });
  }, [activeExpenses, expenseCategory, expenseNature, expenseSearch, expenseStatus]);

  const expenseGroups = useMemo(() => {
    const groups = new Map<string, FinanceExpense[]>();
    filteredExpenses.forEach((item: FinanceExpense) => {
        const current = groups.get(item.expenseDate) || [];
      current.push(item);
        groups.set(item.expenseDate, current);
    });
    return Array.from(groups.entries());
  }, [filteredExpenses]);

    const selectedExpense = selectedExpenseId ? finance.expenseById.get(selectedExpenseId) || null : null;
    const categoriesLoading = financeModule.loading && finance.categories.length === 0 && !financeModule.resourceErrors.categories;
    const categoriesError = financeModule.resourceErrors.categories;
  const selectedCategory = finance.categories.find(category => category.id === expenseForm.categoryId) || null;

    const referenceOptions = expenseForm.link_mode === 'INVENTORY_ITEM'
      ? finance.inventoryReferences
      : expenseForm.link_mode === 'SALE'
        ? finance.saleReferences
        : expenseForm.link_mode === 'RENTAL'
          ? finance.rentalReferences
          : expenseForm.link_mode === 'MODIFICATION_PROJECT'
            ? finance.modificationProjectReferences
            : [];

  const refreshAttachments = async (expenseId: string) => {
    setAttachmentsLoading(true);
    try {
      setAttachments(await finance.listExpenseAttachments(expenseId));
    } finally {
      setAttachmentsLoading(false);
    }
  };

    const resetForm = () => {
      setExpenseForm({
      concept: '',
      amount: '',
      expenseDate: getToday(),
      categoryId: null,
      supplierName: '',
      paymentMethod: '',
      reference: '',
      description: '',
      status: 'PENDING',
      paymentDate: '',
      link_mode: 'NONE',
      linkedEntityId: '',
      otherDescription: '',
      document_type: 'PAYMENT_RECEIPT',
    });
      setFormErrors({});
      setSubmitError(null);
    setExpenseFile(null);
  };

  const handleCreateExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
      setSubmitError(null);

      const nextErrors: ExpenseFormErrors = {};
      const amount = numberFromInput(expenseForm.amount);
      const requiresLinkedEntity = ['INVENTORY_ITEM', 'SALE', 'RENTAL', 'MODIFICATION_PROJECT'].includes(expenseForm.link_mode);

      if (!expenseForm.concept.trim()) nextErrors.concept = 'Captura el concepto del egreso.';
      if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = 'Ingresa un monto mayor a cero.';
    if (!expenseForm.expenseDate) nextErrors.expenseDate = 'Selecciona la fecha del egreso.';
    if (expenseForm.status === 'PAID' && !expenseForm.paymentDate) {
      nextErrors.paymentDate = 'La fecha de pago es obligatoria cuando el egreso esta pagado.';
      }
    if (requiresLinkedEntity && !expenseForm.linkedEntityId) {
      nextErrors.linkedEntityId = 'Selecciona la entidad relacionada antes de registrar el egreso.';
      }
    if (expenseForm.link_mode === 'OTHER' && !expenseForm.otherDescription.trim()) {
      nextErrors.otherDescription = 'Describe a que corresponde el egreso.';
      }
      if (expenseForm.link_mode === 'MODIFICATION_PROJECT' && !referenceOptions.length) {
      nextErrors.linkedEntityId = 'Todavia no hay proyectos de modificacion disponibles para vincular.';
      }

      setFormErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) return;

    try {
      const relationId = expenseForm.linkedEntityId || null;
        const expenseId = crypto.randomUUID();
      const created = await finance.createExpense({
        id: expenseId,
        concept: expenseForm.concept,
        amount,
        expenseDate: expenseForm.expenseDate,
        categoryId: expenseForm.categoryId || null,
        supplierName: expenseForm.supplierName || null,
        paymentMethod: expenseForm.paymentMethod || null,
        reference: expenseForm.reference || null,
        description: buildExpenseDescription(
          expenseForm.description,
          expenseForm.link_mode === 'OTHER' ? expenseForm.otherDescription : ''
        ),
        status: expenseForm.status,
        paymentDate: expenseForm.status === 'PAID' ? expenseForm.paymentDate : null,
        paidAmount: expenseForm.status === 'PAID' ? amount : null,
        relatedInventoryItemId: expenseForm.link_mode === 'INVENTORY_ITEM' ? relationId : null,
        relatedSaleId: expenseForm.link_mode === 'SALE' ? relationId : null,
        relatedRentalId: expenseForm.link_mode === 'RENTAL' ? relationId : null,
        relatedModificationProjectId: expenseForm.link_mode === 'MODIFICATION_PROJECT' ? relationId : null,
        links:
          requiresLinkedEntity && relationId
            ? [
                {
                  entityType:
                    expenseForm.link_mode === 'INVENTORY_ITEM'
                      ? 'INVENTORY_ITEM'
                      : expenseForm.link_mode === 'SALE'
                        ? 'SALE'
                        : expenseForm.link_mode === 'RENTAL'
                          ? 'RENTAL'
                          : 'MODIFICATION_PROJECT',
                  entityId: relationId,
                  linkRole: 'REFERENCE',
                },
              ]
            : undefined,
      });

        let successMessage = 'Egreso registrado correctamente.';
      if (expenseFile) {
          try {
            await finance.uploadExpenseAttachment({
              expenseId: created.id,
              file: expenseFile,
              documentType: expenseForm.document_type,
            });
          } catch {
            successMessage = 'Egreso registrado correctamente. No fue posible cargar el comprobante.';
          }
      }

      resetForm();
      setIsCreateOpen(false);
        onSuccess(successMessage);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'No fue posible registrar el egreso.');
      }
  };

  const handleViewAttachment = async (attachmentId: string) => {
    const url = await finance.getExpenseAttachmentSignedUrl(attachmentId);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleUploadExtraAttachment = async () => {
    if (!selectedExpenseId || !attachmentFile) return;
    await finance.uploadExpenseAttachment({
      expenseId: selectedExpenseId,
      file: attachmentFile,
      documentType: attachmentType,
    });
    setAttachmentFile(null);
    await refreshAttachments(selectedExpenseId);
    onSuccess('Adjunto cargado.');
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedExpenseId) return;
    await finance.deleteExpenseAttachment(attachmentId);
    await refreshAttachments(selectedExpenseId);
    onSuccess('Adjunto eliminado.');
  };

  return (
    <div className="space-y-6">
      <FinanceCard title="Egresos" subtitle={`Captura frecuente para ${periodLabel}.`}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white"
              >
                <Plus size={16} />
                Registrar egreso
              </button>
            </div>
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={expenseSearch}
                onChange={event => setExpenseSearch(event.target.value)}
                placeholder="Buscar concepto o proveedor..."
                className={`${mutedInputClass} pl-11`}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip label="Todos" active={expenseStatus === 'ALL'} onClick={() => setExpenseStatus('ALL')} />
              <Chip label="Pagados" active={expenseStatus === 'PAID'} onClick={() => setExpenseStatus('PAID')} />
              <Chip label="Pendientes" active={expenseStatus === 'PENDING'} onClick={() => setExpenseStatus('PENDING')} />
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
                <select
                  value={expenseCategory}
                  onChange={event => setExpenseCategory(event.target.value)}
                  className={mutedInputClass}
                  disabled={categoriesLoading || !!categoriesError || finance.categories.length === 0}
                >
                  <option value="ALL">
                    {categoriesLoading
                      ? 'Cargando categorias...'
                      : categoriesError
                        ? 'No fue posible cargar las categorias'
                        : finance.categories.length === 0
                          ? 'No hay categorias disponibles'
                          : 'Categoria'}
                  </option>
                  {finance.categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              <select
                value={expenseNature}
                onChange={event => setExpenseNature(event.target.value as 'ALL' | FinanceExpenseNature)}
                className={mutedInputClass}
              >
                <option value="ALL">Naturaleza</option>
                <option value="OPERATING">Operacion</option>
                <option value="DIRECT_COST">Directo</option>
                <option value="CAPEX">Capex</option>
                <option value="PAYROLL">Nomina</option>
                <option value="TAX">Impuesto</option>
                <option value="EXTRAORDINARY">Extraordinario</option>
              </select>
              <button
                type="button"
                onClick={() => setShowMoreExpenseFilters(current => !current)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700"
              >
                <Filter size={16} />
                Mas filtros
              </button>
            </div>
            {showMoreExpenseFilters ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {filteredExpenses.length} registros visibles
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-1">
            <FinancialMetricCard label="Pagados" value={formatCurrency(financeModule.summary?.totalExpenses || 0)} />
            <FinancialMetricCard label="Pendientes" value={formatCurrency(pendingExpenseAmount)} tone="danger" />
            <FinancialMetricCard label="Registros" value={`${activeExpenses.length}`} />
          </div>
        </div>
      </FinanceCard>

      <FinanceCard title="Bitacora del periodo" subtitle={`${filteredExpenses.length} egresos visibles`}>
        <div className="space-y-6">
          {expenseGroups.length === 0 ? (
            <EmptyState message="No hay egresos con estos filtros." />
          ) : (
            expenseGroups.map(([date, items]: [string, FinanceExpense[]]) => (
              <div key={date} className="space-y-3">
                <div className="border-b border-slate-200 pb-2 text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                  {dayLabel(date)}
                </div>
                {items.map((item: FinanceExpense) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedExpenseId(item.id)}
                    className="w-full rounded-2xl border border-slate-200 p-4 text-left"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base font-black text-slate-900">{item.concept}</h4>
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
                          <span>{item.categoryNameSnapshot || 'Sin categoría'}</span>
                          <span>{natureLabel(item.natureSnapshot)}</span>
                        </div>
                        <p className="text-sm text-slate-500">
                          {[item.supplierName, item.paymentMethod ? paymentMethodLabel(item.paymentMethod) : null].filter(Boolean).join(' · ') || 'Sin proveedor / metodo'}
                        </p>
                        {item.reference ? <p className="text-sm text-slate-500">Referencia: {item.reference}</p> : null}
                      </div>
                      <div className="flex flex-col items-start gap-3 md:items-end">
                        <p className="text-xl font-black text-slate-900">
                          {formatCurrency(Number(item.paidAmount ?? item.amount))}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                            Ver detalle
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </FinanceCard>

      <SlideOverPanel open={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Nuevo egreso" subtitle="Captura rapida.">
        <form className="space-y-4" onSubmit={handleCreateExpense}>
          <Field label="Concepto *">
              <div className="space-y-2">
                <input
                  value={expenseForm.concept}
                  onChange={event => {
                    setExpenseForm(current => ({ ...current, concept: event.target.value }));
                    setFormErrors(current => ({ ...current, concept: undefined }));
                  }}
                  className={inputClass}
                />
                {formErrors.concept ? <p className="text-sm text-rose-600">{formErrors.concept}</p> : null}
              </div>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monto *">
                <div className="space-y-2">
                  <input
                    value={expenseForm.amount}
                    onChange={event => {
                      setExpenseForm(current => ({ ...current, amount: event.target.value }));
                      setFormErrors(current => ({ ...current, amount: undefined }));
                    }}
                    inputMode="decimal"
                    className={inputClass}
                  />
                  {formErrors.amount ? <p className="text-sm text-rose-600">{formErrors.amount}</p> : null}
                </div>
            </Field>
            <Field label="Fecha *">
                <div className="space-y-2">
                  <input
                    type="date"
                    value={expenseForm.expenseDate}
                    onChange={event => {
                      setExpenseForm(current => ({ ...current, expenseDate: event.target.value }));
                      setFormErrors(current => ({ ...current, expenseDate: undefined }));
                    }}
                    className={inputClass}
                  />
                  {formErrors.expenseDate ? <p className="text-sm text-rose-600">{formErrors.expenseDate}</p> : null}
                </div>
            </Field>
          </div>

          <Field label="Categoría (opcional)">
              <div className="space-y-2">
                {categoriesError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-semibold text-rose-700">Categoría opcional no disponible</p>
                    <button
                      type="button"
                      onClick={() => financeModule.refresh()}
                      className="mt-3 rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-rose-700"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <select
                    value={expenseForm.categoryId || ''}
                    onChange={event => {
                        setExpenseForm(current => ({ ...current, categoryId: event.target.value || null }));
                    }}
                    className={inputClass}
                    disabled={categoriesLoading || finance.categories.length === 0}
                  >
                    <option value="">
                      {categoriesLoading
                        ? 'Cargando categorías...'
                        : finance.categories.length === 0
                          ? 'Sin categoría'
                          : 'Seleccionar categoría (opcional)...'}
                    </option>
                    {finance.categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
          </Field>



            <div className={`grid grid-cols-1 gap-4 ${expenseForm.status === 'PAID' ? 'sm:grid-cols-2' : ''}`}>
            <Field label="Estado">
                <select
                  value={expenseForm.status}
                  onChange={event =>
                    setExpenseForm(current => ({
                      ...current,
                      status: event.target.value as 'PENDING' | 'PAID',
                      paymentDate: event.target.value === 'PAID' ? current.paymentDate : '',
                    }))
                  }
                  className={inputClass}
                >
                <option value="PENDING">Pendiente</option>
                <option value="PAID">Pagado</option>
              </select>
            </Field>
              {expenseForm.status === 'PAID' ? (
                <Field label="Fecha de pago *">
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={expenseForm.paymentDate}
                      onChange={event => {
                        setExpenseForm(current => ({ ...current, paymentDate: event.target.value }));
                        setFormErrors(current => ({ ...current, paymentDate: undefined }));
                      }}
                      className={inputClass}
                    />
                    {formErrors.paymentDate ? <p className="text-sm text-rose-600">{formErrors.paymentDate}</p> : null}
                  </div>
                </Field>
              ) : null}
          </div>

          <Field label="Proveedor">
            <input value={expenseForm.supplierName} onChange={event => setExpenseForm(current => ({ ...current, supplierName: event.target.value }))} className={inputClass} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Metodo de pago">
                <select
                  value={expenseForm.paymentMethod}
                  onChange={event => setExpenseForm(current => ({ ...current, paymentMethod: event.target.value }))}
                  className={inputClass}
                >
                  <option value="">Seleccionar...</option>
                  {paymentMethodOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
            </Field>
            <Field label="Referencia">
              <input value={expenseForm.reference} onChange={event => setExpenseForm(current => ({ ...current, reference: event.target.value }))} className={inputClass} />
            </Field>
          </div>

          <Field label="Esto corresponde a">
            <div className="grid grid-cols-1 gap-2">
              {[
                ['NONE', 'Ninguno'],
                  ['INVENTORY_ITEM', 'Container CE'],
                ['SALE', 'Venta'],
                ['RENTAL', 'Renta'],
                  ['MODIFICATION_PROJECT', 'Proyecto de modificacion'],
                  ['OTHER', 'Otros'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                    onClick={() => {
                      setExpenseForm(current => ({
                        ...current,
                        link_mode: value as ExpenseLinkMode,
                        linkedEntityId: '',
                        otherDescription: value === 'OTHER' ? current.otherDescription : '',
                      }));
                      setFormErrors(current => ({
                        ...current,
                        linkedEntityId: undefined,
                        otherDescription: undefined,
                      }));
                    }}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${
                    expenseForm.link_mode === value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

            {expenseForm.link_mode !== 'NONE' && expenseForm.link_mode !== 'OTHER' ? (
              <Field
                label={getReferenceLabel(expenseForm.link_mode)}
                helper={
                  expenseForm.link_mode === 'MODIFICATION_PROJECT' && referenceOptions.length === 0
                    ? 'Gap identificado: todavia no existe un proyecto de modificacion disponible para vincular en este entorno.'
                    : undefined
                }
              >
                <div className="space-y-2">
                  <select
                    value={expenseForm.linkedEntityId}
                    onChange={event => {
                      setExpenseForm(current => ({ ...current, linkedEntityId: event.target.value }));
                      setFormErrors(current => ({ ...current, linkedEntityId: undefined }));
                    }}
                    className={inputClass}
                    disabled={referenceOptions.length === 0}
                  >
                    <option value="">
                      {referenceOptions.length === 0 ? 'No hay opciones disponibles' : 'Seleccionar...'}
                    </option>
                    {referenceOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.linkedEntityId ? <p className="text-sm text-rose-600">{formErrors.linkedEntityId}</p> : null}
                </div>
              </Field>
            ) : null}

            {expenseForm.link_mode === 'OTHER' ? (
              <Field label={getReferenceLabel(expenseForm.link_mode)}>
                <div className="space-y-2">
                  <input
                    value={expenseForm.otherDescription}
                    onChange={event => {
                      setExpenseForm(current => ({ ...current, otherDescription: event.target.value }));
                      setFormErrors(current => ({ ...current, otherDescription: undefined }));
                    }}
                    className={inputClass}
                  />
                  {formErrors.otherDescription ? <p className="text-sm text-rose-600">{formErrors.otherDescription}</p> : null}
                </div>
              </Field>
          ) : null}

          <Field label="Comprobante" helper="Se sube a Storage y solo se guarda la ruta del archivo.">
            <input
              type="file"
              onChange={event => setExpenseFile(event.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white"
            />
          </Field>

          {expenseFile ? (
            <Field label="Tipo de documento">
              <select value={expenseForm.document_type} onChange={event => setExpenseForm(current => ({ ...current, document_type: event.target.value as FinanceExpenseAttachmentType }))} className={inputClass}>
                {attachmentTypes.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Notas">
            <textarea value={expenseForm.description} onChange={event => setExpenseForm(current => ({ ...current, description: event.target.value }))} rows={4} className={inputClass} />
          </Field>

            {submitError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submitError || 'No fue posible registrar el egreso.'}
              </div>
            ) : null}

            <button type="submit" disabled={financeModule.saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:bg-slate-300">
            {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : <CircleDollarSign size={16} />}
              {financeModule.saving ? 'Registrando...' : 'Registrar egreso'}
          </button>
        </form>
      </SlideOverPanel>

      <SlideOverPanel
        open={!!selectedExpense}
        onClose={() => setSelectedExpenseId(null)}
        title={selectedExpense?.concept || 'Detalle del egreso'}
        subtitle={selectedExpense ? formatLocalDate(selectedExpense.expenseDate) : undefined}
      >
        {selectedExpense ? (
          <div className="space-y-5">
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-base font-black text-slate-900">{selectedExpense.concept}</p>
                  <p className="text-sm text-slate-500">
                    {selectedExpense.categoryNameSnapshot || 'Sin categoría'} · {natureLabel(selectedExpense.natureSnapshot)}
                  </p>
                </div>
                <StatusBadge status={selectedExpense.status} />
              </div>
              <FinancialMetricCard label="Monto" value={formatCurrency(Number(selectedExpense.paidAmount ?? selectedExpense.amount))} />
              <div className="space-y-2 text-sm text-slate-500">
                <p>Proveedor: {selectedExpense.supplierName || 'Sin proveedor'}</p>
                <p>Metodo: {paymentMethodLabel(selectedExpense.paymentMethod)}</p>
                <p>Referencia: {selectedExpense.reference || 'Sin referencia'}</p>
                <p>Pago: {selectedExpense.paymentDate ? formatLocalDate(selectedExpense.paymentDate) : 'Pendiente'}</p>
                {getLinkedEntityMeta(selectedExpense, finance) ? <p>{getLinkedEntityMeta(selectedExpense, finance)}</p> : null}
                {selectedExpense.description ? <p>Notas: {selectedExpense.description}</p> : null}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Comprobantes</p>
                <button
                  type="button"
                  onClick={() => finance.cancelExpense(selectedExpense.id).then(() => {
                    setSelectedExpenseId(null);
                    onSuccess(`Egreso "${selectedExpense.concept}" cancelado.`);
                  }).catch(() => undefined)}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-rose-600"
                >
                  Cancelar egreso
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Adjuntar archivo">
                    <input
                      type="file"
                      onChange={event => setAttachmentFile(event.target.files?.[0] || null)}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white"
                    />
                  </Field>
                  <Field label="Tipo de documento">
                    <select value={attachmentType} onChange={event => setAttachmentType(event.target.value as FinanceExpenseAttachmentType)} className={inputClass}>
                      {attachmentTypes.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    disabled={!attachmentFile || financeModule.saving}
                    onClick={() => handleUploadExtraAttachment().catch(() => undefined)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-700 disabled:opacity-50"
                  >
                    <Paperclip size={16} />
                    Cargar adjunto
                  </button>
                </div>
              </div>

              {attachmentsLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Cargando adjuntos...
                </div>
              ) : attachments.length === 0 ? (
                <EmptyState message="Todavia no hay comprobantes cargados." />
              ) : (
                attachments.map((attachment: FinanceExpenseAttachment) => (
                  <div key={attachment.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-slate-400" />
                        <div>
                          <p className="text-sm font-black text-slate-900">{attachment.file_name}</p>
                          <p className="text-sm text-slate-500">
                            {attachment.document_type} · {formatLocalDate(attachment.created_at.slice(0, 10))}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleViewAttachment(attachment.id).catch(() => undefined)} className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-700">
                          Ver
                        </button>
                        <button type="button" onClick={() => handleDeleteAttachment(attachment.id).catch(() => undefined)} className="rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-rose-600">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </SlideOverPanel>

    </div>
  );
};
