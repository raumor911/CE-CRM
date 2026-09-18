import React, { useEffect, useState } from 'react';
import { ChevronRight, CircleDollarSign, FileClock, Loader2, Plus, RefreshCcw } from 'lucide-react';
import { formatCurrency, formatLocalDate } from '../../../lib/utils';
import { useRecurringExpenses } from '../../hooks/useRecurringExpenses';
import { UseFinanceModuleResult } from '../../hooks/useFinanceModule';
import { FinanceExpenseAttachmentType, FinanceRecurringOccurrence } from '../../types';
import {
  EmptyState,
  Field,
  FinanceCard,
  FinancialMetricCard,
  frequencyLabel,
  getToday,
  inputClass,
  numberFromInput,
  SlideOverPanel,
  StatusBadge,
} from '../shared';

type RecurringPanelState =
  | null
  | { type: 'form'; recurringId?: string }
  | { type: 'payment'; occurrenceId: string }
  | { type: 'detail'; recurringId: string };

export const FinanceRecurringTab: React.FC<{
  finance: UseFinanceModuleResult;
  periodLabel: string;
  onSuccess: (message: string) => void;
}> = ({ finance: financeModule, periodLabel, onSuccess }) => {
  const finance = useRecurringExpenses(financeModule);
  const [panel, setPanel] = useState<RecurringPanelState>(null);
  const [recurringFile, setRecurringFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<FinanceExpenseAttachmentType>('PAYMENT_RECEIPT');
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const [recurringForm, setRecurringForm] = useState({
    concept: '',
    expected_amount: '',
    category_code: null as string | null,
    frequency: 'MONTHLY' as 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'CUSTOM_DAYS',
    interval_count: '1',
    first_due_date: getToday(),
    provider_name: '',
    payment_method_default: '',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'PAUSED' | 'CANCELLED',
  });
  const [paymentForm, setPaymentForm] = useState({
    actual_amount: '',
    payment_date: getToday(),
    payment_method: '',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    // Removed category_code logic
  }, []);

  const selectedRecurring =
    panel?.type === 'detail' || panel?.type === 'form' ? finance.recurringMap.get(panel.recurringId || '') || null : null;
  const selectedOccurrence =
    panel?.type === 'payment'
      ? finance.allRecurringOccurrences.find((item: FinanceRecurringOccurrence) => item.id === panel.occurrenceId) || null
      : null;

  const openEdit = (recurringId: string) => {
    const selected = finance.recurringMap.get(recurringId);
    if (!selected) return;

    setRecurringForm({
      concept: selected.concept,
      expected_amount: String(selected.expected_amount),
      category_code: selected.category_code || null,
      frequency: selected.frequency,
      interval_count: String(selected.interval_count),
      first_due_date: selected.first_due_date,
      provider_name: selected.provider_name || '',
      payment_method_default: selected.payment_method_default || '',
      notes: selected.notes || '',
      status: selected.status,
    });
    setPanel({ type: 'form', recurringId });
  };

  const handleCreateOrUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const payload = {
        concept: recurringForm.concept,
        expected_amount: numberFromInput(recurringForm.expected_amount),
        category_code: recurringForm.category_code || null,
        frequency: recurringForm.frequency,
        interval_count: Math.max(1, numberFromInput(recurringForm.interval_count)),
        first_due_date: recurringForm.first_due_date,
        provider_name: recurringForm.provider_name || null,
        payment_method_default: recurringForm.payment_method_default || null,
        notes: recurringForm.notes || null,
        status: recurringForm.status,
      };

      if (panel?.type === 'form' && panel.recurringId) {
        await finance.updateRecurringExpense(panel.recurringId, payload as any);
        onSuccess('Recurrente actualizado.');
      } else {
        await finance.createRecurringExpense(payload as any);
        onSuccess('Recurrente creado.');
      }

      setPanel(null);
    } catch (error: any) {
      alert(error?.message || 'Ocurrió un error al guardar el recurrente.');
    }
  };

  const handleRegisterPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (panel?.type !== 'payment') return;

    try {
      const result = await finance.registerRecurringPayment(panel.occurrenceId, {
        actualAmount: numberFromInput(paymentForm.actual_amount),
        paymentDate: paymentForm.payment_date,
        paymentMethod: paymentForm.payment_method || null,
        reference: paymentForm.reference || null,
        notes: paymentForm.notes || null,
      });

      if (recurringFile) {
        await financeModule.uploadExpenseAttachment({
          expenseId: result.expense.id,
          file: recurringFile,
          documentType,
        });
      }

      setRecurringFile(null);
      setPanel(null);
      onSuccess(recurringFile ? 'Pago recurrente y comprobante registrados.' : 'Pago recurrente registrado.');
    } catch {}
  };

  return (
    <div className="space-y-6">
      <FinanceCard title="Recurrentes" subtitle={`Operacion por vencimientos para ${periodLabel}.`}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FinancialMetricCard
              label="Total mensual"
              value={formatCurrency(
                finance.recurringExpenses
                  .filter(item => item.status === 'ACTIVE' || item.status === 'PAUSED')
                  .reduce((sum, item) => sum + Number(item.expected_amount), 0)
              )}
              tone="neutral"
            />
            <FinancialMetricCard
              label="Configurados"
              value={`${finance.recurringExpenses.filter(item => item.status === 'ACTIVE' || item.status === 'PAUSED').length}`}
            />
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setPanel({ type: 'form' })}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white"
            >
              <Plus size={16} />
              Nuevo recurrente
            </button>
            <button
              type="button"
              onClick={() => finance.generateRecurringOccurrences().then(() => onSuccess('Vencimientos generados.')).catch(() => undefined)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-700"
            >
              {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
              Generar vencimientos
            </button>
          </div>
        </div>
      </FinanceCard>

      <FinanceCard title="Obligaciones del periodo" subtitle="Configuras una vez y operas pagos.">
        <div className="space-y-3">
          {finance.recurringExpenses.filter(item => item.status !== 'CANCELLED').length === 0 ? (
            <EmptyState message="Aun no hay recurrentes configurados o vigentes." />
          ) : (
            finance.recurringExpenses
              .filter(item => item.status !== 'CANCELLED')
              .map(item => {
                const current =
                  finance.recurringOccurrences.find(occurrence => occurrence.recurring_expense_id === item.id && occurrence.status === 'EXPECTED') ||
                  finance.recurringOccurrences.find(occurrence => occurrence.recurring_expense_id === item.id && occurrence.status !== 'CANCELLED');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPanel({ type: 'detail', recurringId: item.id })}
                  className="w-full rounded-2xl border border-slate-200 p-4 text-left"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-black text-slate-900">{item.concept}</p>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-sm text-slate-500">
                        {item.category_code ? (finance.categories.find(category => category.code === item.category_code)?.name || item.category_code) : 'Sin categoría'} · {frequencyLabel(item.frequency)}
                      </p>
                      <p className="text-sm text-slate-500">
                        {current
                          ? current.status === 'PAID'
                            ? `Pagado ${formatLocalDate(current.payment_date || current.due_date)}`
                            : `Vence ${formatLocalDate(current.due_date)}`
                          : `Proximo vencimiento ${formatLocalDate(item.next_due_date)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-black text-slate-900">{formatCurrency(Number(item.expected_amount))}</p>
                      {current?.status === 'EXPECTED' ? (
                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            setPaymentForm({
                              actual_amount: String(current.expected_amount),
                              payment_date: current.due_date,
                              payment_method: '',
                              reference: '',
                              notes: current.notes || '',
                            });
                            setRecurringFile(null);
                            setDocumentType('PAYMENT_RECEIPT');
                            setPanel({ type: 'payment', occurrenceId: current.id });
                          }}
                          className="rounded-xl border border-emerald-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700"
                        >
                          Registrar pago
                        </button>
                      ) : (
                        <ChevronRight size={18} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </FinanceCard>

      <SlideOverPanel open={panel?.type === 'form'} onClose={() => setPanel(null)} title={panel?.type === 'form' && panel.recurringId ? 'Editar recurrente' : 'Nuevo recurrente'} subtitle="Configuracion estable.">
        <form className="space-y-4" onSubmit={handleCreateOrUpdate}>
          <Field label="Nombre *"><input value={recurringForm.concept} onChange={event => setRecurringForm(current => ({ ...current, concept: event.target.value }))} className={inputClass} /></Field>

          <Field label="Categoría (opcional)">
            <select 
              value={recurringForm.category_code || ''} 
              onChange={event => setRecurringForm(current => ({ ...current, category_code: event.target.value || null }))} 
              className={inputClass}
              disabled={finance.categories.length === 0}
            >
              <option value="">
                {finance.categories.length === 0 ? 'Sin categoría' : 'Seleccionar categoría (opcional)...'}
              </option>
              {finance.categories.map(category => (
                <option key={category.code} value={category.code}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monto esperado *"><input value={recurringForm.expected_amount} onChange={event => setRecurringForm(current => ({ ...current, expected_amount: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
            <Field label="Periodicidad *">
              <select value={recurringForm.frequency} onChange={event => setRecurringForm(current => ({ ...current, frequency: event.target.value as typeof current.frequency }))} className={inputClass}>
                <option value="MONTHLY">Mensual</option>
                <option value="BIMONTHLY">Bimestral</option>
                <option value="QUARTERLY">Trimestral</option>
                <option value="SEMIANNUAL">Semestral</option>
                <option value="ANNUAL">Anual</option>
                <option value="CUSTOM_DAYS">Dias personalizados</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Intervalo"><input value={recurringForm.interval_count} onChange={event => setRecurringForm(current => ({ ...current, interval_count: event.target.value }))} inputMode="numeric" className={inputClass} /></Field>
            <Field label="Primer / proximo vencimiento"><input type="date" value={recurringForm.first_due_date} onChange={event => setRecurringForm(current => ({ ...current, first_due_date: event.target.value }))} className={inputClass} /></Field>
          </div>
          <Field label="Proveedor"><input value={recurringForm.provider_name} onChange={event => setRecurringForm(current => ({ ...current, provider_name: event.target.value }))} className={inputClass} /></Field>
          <Field label="Metodo por defecto"><input value={recurringForm.payment_method_default} onChange={event => setRecurringForm(current => ({ ...current, payment_method_default: event.target.value }))} className={inputClass} /></Field>
          <Field label="Estado">
            <select value={recurringForm.status} onChange={event => setRecurringForm(current => ({ ...current, status: event.target.value as typeof current.status }))} className={inputClass}>
              <option value="ACTIVE">Activo</option>
              <option value="PAUSED">Pausado</option>
              <option value="CANCELLED">Finalizado</option>
            </select>
          </Field>
          <Field label="Notas"><textarea value={recurringForm.notes} onChange={event => setRecurringForm(current => ({ ...current, notes: event.target.value }))} rows={4} className={inputClass} /></Field>
          <button type="submit" disabled={financeModule.saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:bg-slate-300">
            {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : <FileClock size={16} />}
            Guardar
          </button>
        </form>
      </SlideOverPanel>

      <SlideOverPanel
        open={panel?.type === 'payment'}
        onClose={() => setPanel(null)}
        title="Registrar pago"
        subtitle={selectedOccurrence ? finance.recurringMap.get(selectedOccurrence.recurring_expense_id)?.concept : undefined}
      >
        {selectedOccurrence ? (
          <form className="space-y-4" onSubmit={handleRegisterPayment}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Monto esperado</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(Number(selectedOccurrence.expected_amount))}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Monto pagado *"><input value={paymentForm.actual_amount} onChange={event => setPaymentForm(current => ({ ...current, actual_amount: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
              <Field label="Fecha *"><input type="date" value={paymentForm.payment_date} onChange={event => setPaymentForm(current => ({ ...current, payment_date: event.target.value }))} className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Metodo"><input value={paymentForm.payment_method} onChange={event => setPaymentForm(current => ({ ...current, payment_method: event.target.value }))} className={inputClass} /></Field>
              <Field label="Referencia"><input value={paymentForm.reference} onChange={event => setPaymentForm(current => ({ ...current, reference: event.target.value }))} className={inputClass} /></Field>
            </div>
            <Field label="Comprobante">
              <input type="file" onChange={event => setRecurringFile(event.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white" />
            </Field>
            {recurringFile ? (
              <Field label="Tipo de documento">
                <select value={documentType} onChange={event => setDocumentType(event.target.value as FinanceExpenseAttachmentType)} className={inputClass}>
                  <option value="PAYMENT_RECEIPT">Comprobante de pago</option>
                  <option value="INVOICE">Factura</option>
                  <option value="TICKET">Ticket</option>
                  <option value="PURCHASE_ORDER">Orden de compra</option>
                  <option value="OTHER">Otro</option>
                </select>
              </Field>
            ) : null}
            <Field label="Notas"><textarea value={paymentForm.notes} onChange={event => setPaymentForm(current => ({ ...current, notes: event.target.value }))} rows={4} className={inputClass} /></Field>
            <button type="submit" disabled={financeModule.saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:bg-slate-300">
              {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : <CircleDollarSign size={16} />}
              Registrar pago
            </button>
          </form>
        ) : null}
      </SlideOverPanel>

      <SlideOverPanel open={panel?.type === 'detail' && !!selectedRecurring} onClose={() => setPanel(null)} title={selectedRecurring?.concept || 'Detalle recurrente'} subtitle="Configuracion e historial">
        {selectedRecurring ? (
          <div className="space-y-5">
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-base font-black text-slate-900">{selectedRecurring.concept}</p>
                <StatusBadge status={selectedRecurring.status} />
              </div>
              <p className="text-sm text-slate-500">
                {selectedRecurring.category_code ? (finance.categories.find(category => category.code === selectedRecurring.category_code)?.name || selectedRecurring.category_code) : 'Sin categoría'} · {frequencyLabel(selectedRecurring.frequency)}
              </p>
              <p className="text-sm text-slate-500">Proximo vencimiento {formatLocalDate(selectedRecurring.next_due_date)}</p>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Historial</p>
              {(finance.recurringHistory.get(selectedRecurring.id) || []).length === 0 ? (
                <EmptyState message="Sin historial." />
              ) : (
                (finance.recurringHistory.get(selectedRecurring.id) || [])
                  .sort((a, b) => b.due_date.localeCompare(a.due_date))
                  .slice(0, 8)
                  .map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{formatLocalDate(item.due_date)}</p>
                        <p className="text-sm text-slate-500">{item.status}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">
                        {formatCurrency(Number(item.actual_amount ?? item.expected_amount))}
                      </p>
                    </div>
                  ))
              )}
            </div>
            <div className="flex flex-col gap-3">
              {cancelConfirmId === selectedRecurring.id ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-4">
                  <div>
                    <p className="text-sm font-black text-rose-900 uppercase tracking-wider">Cancelar recurrente</p>
                    <p className="text-base font-bold text-slate-900 mt-1">{selectedRecurring.concept}</p>
                    <p className="text-sm text-rose-800 mt-2">
                      Este recurrente dejará de generar obligaciones a partir de este momento y no aparecerá en periodos posteriores.
                    </p>
                    <p className="text-sm font-semibold text-rose-900 mt-2">
                      Esta acción no elimina pagos históricos.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCancelConfirmId(null)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      disabled={financeModule.saving}
                      onClick={() =>
                        finance
                          .cancelRecurringExpense(selectedRecurring.id)
                          .then(() => {
                            setCancelConfirmId(null);
                            setPanel(null);
                            onSuccess('Recurrente cancelado.');
                          })
                          .catch(() => undefined)
                      }
                      className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50 flex justify-center items-center"
                    >
                      {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : 'Cancelar recurrente'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button type="button" onClick={() => openEdit(selectedRecurring.id)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                    Editar configuracion
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      finance
                        .updateRecurringExpense(selectedRecurring.id, {
                          status: selectedRecurring.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                        })
                        .then(() => {
                          setPanel(null);
                          onSuccess(selectedRecurring.status === 'ACTIVE' ? 'Recurrente pausado.' : 'Recurrente reactivado.');
                        })
                        .catch(() => undefined)
                    }
                    className="rounded-2xl border border-amber-200 px-4 py-3 text-sm font-bold text-amber-700 hover:bg-amber-50"
                  >
                    {selectedRecurring.status === 'ACTIVE' ? 'Pausar recurrente' : 'Reactivar recurrente'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelConfirmId(selectedRecurring.id)}
                    className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50"
                  >
                    Cancelar recurrente
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </SlideOverPanel>
    </div>
  );
};
