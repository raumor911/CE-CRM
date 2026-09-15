import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarRange,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import { formatCurrency, formatLocalDate } from '../../../lib/utils';
import { usePayroll } from '../../hooks/usePayroll';
import { UseFinanceModuleResult } from '../../hooks/useFinanceModule';
import {
  FinanceExpenseAttachmentType,
  FinancePayrollBatch,
  FinancePayrollCompensationHistory,
  FinancePayrollDifferenceTreatment,
  FinancePayrollPeriod,
  FinancePayrollProfile,
} from '../../types';
import {
  Chip,
  EmptyState,
  Field,
  FinanceCard,
  FinancialMetricCard,
  getToday,
  inputClass,
  numberFromInput,
  periodicityLabel,
  SlideOverPanel,
  StatusBadge,
  mutedInputClass,
} from '../shared';

type PayrollView = 'overview' | 'personnel';
type PayrollPanel =
  | null
  | { type: 'profile-create' }
  | { type: 'profile-edit'; profileId: string }
  | { type: 'detail'; profileId: string }
  | { type: 'compensation'; profileId: string }
  | { type: 'batch-create' }
  | { type: 'batch-payment'; batchId: string; periodIds: string[] };

type CompensationState = {
  loading: boolean;
  items: FinancePayrollCompensationHistory[];
};

export const FinancePayrollTab: React.FC<{
  finance: UseFinanceModuleResult;
  periodLabel: string;
  onSuccess: (message: string) => void;
}> = ({ finance: financeModule, periodLabel, onSuccess }) => {
  const finance = usePayroll(financeModule);
  const [payrollView, setPayrollView] = useState<PayrollView>('overview');
  const [panel, setPanel] = useState<PayrollPanel>(null);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelFilter, setPersonnelFilter] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [compensationHistory, setCompensationHistory] = useState<Record<string, CompensationState>>({});
  const [batchDraft, setBatchDraft] = useState<FinancePayrollBatch | null>(null);
  const [batchPeriods, setBatchPeriods] = useState<FinancePayrollPeriod[]>([]);
  const [payrollFile, setPayrollFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<FinanceExpenseAttachmentType>('PAYMENT_RECEIPT');

  const [profileForm, setProfileForm] = useState({
    person_name: '',
    area: '',
    periodicity: 'BIWEEKLY' as 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'CUSTOM',
    current_period_amount: '',
    estimated_monthly_cost: '',
    start_date: getToday(),
    end_date: '',
    active: true,
    notes: '',
  });
  const [compensationForm, setCompensationForm] = useState({
    effective_from: getToday(),
    payment_frequency: 'BIWEEKLY' as 'MONTHLY' | 'BIWEEKLY' | 'WEEKLY' | 'CUSTOM',
    base_payment_amount: '',
    estimated_monthly_cost: '',
    change_reason: '',
  });
  const [batchPaymentForm, setBatchPaymentForm] = useState({
    paid_amount: '',
    payment_date: getToday(),
    payment_method: '',
    reference: '',
    notes: '',
    difference_treatment: '' as '' | FinancePayrollDifferenceTreatment,
    adjustment_reason: '',
    adjustment_comment: '',
  });

  const selectedProfile =
    panel?.type === 'detail' || panel?.type === 'profile-edit' || panel?.type === 'compensation'
      ? finance.profileMap.get(panel.profileId) || null
      : null;

  const selectedBatch =
    panel?.type === 'batch-payment'
      ? batchDraft && batchDraft.id === panel.batchId
        ? batchDraft
        : finance.payrollBatches.find((item: FinancePayrollBatch) => item.id === panel.batchId) || null
      : null;
  const selectedCompensationState = selectedProfile ? compensationHistory[selectedProfile.id] : undefined;

  const filteredProfiles = useMemo(() => {
    const query = personnelSearch.trim().toLowerCase();
    const list = personnelFilter === 'ACTIVE' ? finance.activeProfiles : finance.inactiveProfiles;

    return list.filter((item: FinancePayrollProfile) => {
      const matchesQuery =
        !query ||
        item.person_name.toLowerCase().includes(query) ||
        item.area.toLowerCase().includes(query) ||
        (item.notes || '').toLowerCase().includes(query);
      return matchesQuery;
    });
  }, [finance.activeProfiles, finance.inactiveProfiles, personnelFilter, personnelSearch]);

  const groupedPending = useMemo(
    () => finance.payrollGroups.filter((group: { remainingAmount: number }) => group.remainingAmount > 0),
    [finance.payrollGroups]
  );

  useEffect(() => {
    if (!selectedProfile) return;
    if (selectedCompensationState?.loading || selectedCompensationState?.items.length) return;

    setCompensationHistory(current => ({
      ...current,
      [selectedProfile.id]: { loading: true, items: current[selectedProfile.id]?.items || [] },
    }));

    finance
      .listPayrollCompensationHistory(selectedProfile.id)
      .then((items: FinancePayrollCompensationHistory[]) => {
        setCompensationHistory(current => ({
          ...current,
          [selectedProfile.id]: { loading: false, items },
        }));
      })
      .catch(() => {
        setCompensationHistory(current => ({
          ...current,
          [selectedProfile.id]: { loading: false, items: [] },
        }));
      });
  }, [finance.listPayrollCompensationHistory, selectedCompensationState?.items.length, selectedCompensationState?.loading, selectedProfile]);

  const openCreateProfile = () => {
    setProfileForm({
      person_name: '',
      area: '',
      periodicity: 'BIWEEKLY',
      current_period_amount: '',
      estimated_monthly_cost: '',
      start_date: getToday(),
      end_date: '',
      active: true,
      notes: '',
    });
    setPanel({ type: 'profile-create' });
  };

  const openEditProfile = (profile: FinancePayrollProfile) => {
    setProfileForm({
      person_name: profile.person_name,
      area: profile.area,
      periodicity: profile.periodicity,
      current_period_amount: String(profile.current_period_amount),
      estimated_monthly_cost: String(profile.estimated_monthly_cost),
      start_date: profile.start_date,
      end_date: profile.end_date || '',
      active: profile.active,
      notes: profile.notes || '',
    });
    setPanel({ type: 'profile-edit', profileId: profile.id });
  };

  const openCompensation = (profile: FinancePayrollProfile) => {
    setCompensationForm({
      effective_from: getToday(),
      payment_frequency: profile.periodicity,
      base_payment_amount: String(profile.current_period_amount),
      estimated_monthly_cost: String(profile.estimated_monthly_cost),
      change_reason: '',
    });
    setPanel({ type: 'compensation', profileId: profile.id });
  };

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const payload = {
        person_name: profileForm.person_name,
        area: profileForm.area,
        periodicity: profileForm.periodicity,
        current_period_amount: numberFromInput(profileForm.current_period_amount),
        estimated_monthly_cost: numberFromInput(profileForm.estimated_monthly_cost),
        start_date: profileForm.start_date,
        end_date: profileForm.active ? null : profileForm.end_date || null,
        active: profileForm.active,
        notes: profileForm.notes || null,
      };

      if (panel?.type === 'profile-edit') {
        await finance.updatePayrollProfile(panel.profileId, payload);
        onSuccess(profileForm.active ? 'Perfil actualizado.' : 'Empleado dado de baja sin perder historico.');
      } else {
        await finance.createPayrollProfile(payload);
        onSuccess('Alta de personal registrada.');
      }

      setPanel(null);
    } catch (error: any) {
      alert(error?.message || 'Ocurrió un error al guardar el perfil.');
    }
  };

  const handleChangeCompensation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (panel?.type !== 'compensation') return;

    try {
      await finance.changePayrollCompensation(panel.profileId, {
        effective_from: compensationForm.effective_from,
        payment_frequency: compensationForm.payment_frequency,
        base_payment_amount: numberFromInput(compensationForm.base_payment_amount),
        estimated_monthly_cost: numberFromInput(compensationForm.estimated_monthly_cost),
        change_reason: compensationForm.change_reason || null,
      });

      const refreshed = await finance.listPayrollCompensationHistory(panel.profileId);
      setCompensationHistory(current => ({
        ...current,
        [panel.profileId]: { loading: false, items: refreshed },
      }));
      setPanel({ type: 'detail', profileId: panel.profileId });
      onSuccess('Condiciones salariales actualizadas sin modificar periodos historicos.');
    } catch (error: any) {
      alert(error?.message || 'Ocurrió un error al actualizar las condiciones.');
    }
  };

  const prepareBatchForGroup = async (group: { periods: FinancePayrollPeriod[] }) => {
    const first = group.periods[0];
    const pendingPeriods = group.periods.filter(item => item.status === 'PENDING');
    const draft = await finance.createPayrollBatch({
      period_start: first.period_start,
      period_end: first.period_end,
      payroll_period_ids: pendingPeriods.map(item => item.id),
    });

    setBatchDraft(draft.batch);
    setBatchPeriods(draft.periods);
    setBatchPaymentForm({
      paid_amount: String(draft.batch.expected_amount),
      payment_date: first.due_date,
      payment_method: '',
      reference: '',
      notes: '',
      difference_treatment: '',
      adjustment_reason: '',
      adjustment_comment: '',
    });
    setPayrollFile(null);
    setDocumentType('PAYMENT_RECEIPT');
    setPanel({ type: 'batch-payment', batchId: draft.batch.id, periodIds: pendingPeriods.map(item => item.id) });
  };

  const batchExpectedAmount = Number(selectedBatch?.expected_amount || 0);
  const batchDifference = numberFromInput(batchPaymentForm.paid_amount) - batchExpectedAmount;
  const hasDifference = batchDifference !== 0;

  const handleRegisterBatchPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBatch) return;

    try {
      const result = await finance.registerPayrollBatchPayment(selectedBatch.id, {
        paid_amount: numberFromInput(batchPaymentForm.paid_amount),
        payment_date: batchPaymentForm.payment_date,
        payment_method: batchPaymentForm.payment_method || null,
        reference: batchPaymentForm.reference || null,
        notes: batchPaymentForm.notes || null,
        difference_treatment: hasDifference ? batchPaymentForm.difference_treatment || null : null,
        adjustment_reason:
          hasDifference && batchPaymentForm.difference_treatment === 'ADJUST_PERIOD'
            ? batchPaymentForm.adjustment_reason || null
            : null,
        adjustment_comment:
          hasDifference && batchPaymentForm.difference_treatment === 'ADJUST_PERIOD'
            ? batchPaymentForm.adjustment_comment || null
            : null,
      });

      if (payrollFile) {
        await finance.uploadExpenseAttachment({
          expenseId: result.expense.id,
          file: payrollFile,
          documentType,
        });
      }

      setBatchDraft(result.batch);
      setPanel(null);
      onSuccess(payrollFile ? 'Pago consolidado y comprobante registrados.' : 'Pago consolidado de nomina registrado.');
    } catch (error: any) {
      alert(error?.message || 'Ocurrió un error al registrar el pago de nómina.');
    }
  };

  return (
    <div className="space-y-6">
      {payrollView === 'overview' ? (
        <>
          <FinanceCard title="Nomina" subtitle={`Operacion del periodo ${periodLabel}.`}>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-1">
                <FinancialMetricCard
                  label="Costo mensual estimado"
                  value={formatCurrency(finance.payrollProfiles.reduce((sum: number, item: FinancePayrollProfile) => sum + Number(item.estimated_monthly_cost), 0))}
                />
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  El flujo principal ahora registra la nomina como un solo egreso consolidado por periodo.
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button type="button" onClick={() => setPayrollView('personnel')} className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                    Ver personal
                  </button>
                </div>
                <button type="button" onClick={openCreateProfile} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-700">
                  <Plus size={16} />
                  Alta de personal
                </button>
              </div>
            </div>
          </FinanceCard>

          {finance.payrollBatches.length > 0 ? (
            <FinanceCard title="Lotes recientes" subtitle="Seguimiento de pagos consolidados.">
              <div className="space-y-3">
                {finance.payrollBatches.map((batch: FinancePayrollBatch) => (
                  <div key={batch.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {formatLocalDate(batch.period_start)} - {formatLocalDate(batch.period_end)}
                        </p>
                        <p className="text-sm text-slate-500">
                          Esperado {formatCurrency(Number(batch.expected_amount))} · Pagado {formatCurrency(Number(batch.paid_amount))}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={batch.status} />
                        {batch.difference_amount ? (
                          <span className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
                            Diferencia {formatCurrency(Number(batch.difference_amount))}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </FinanceCard>
          ) : null}
        </>
      ) : (
        <FinanceCard title="Personal" subtitle="ABC de nomina separado del pago.">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button type="button" onClick={() => setPayrollView('overview')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                <ArrowLeft size={16} />
                Volver
              </button>
              <div className="relative min-w-[18rem]">
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={personnelSearch} onChange={event => setPersonnelSearch(event.target.value)} placeholder="Buscar persona..." className={`${mutedInputClass} pl-11`} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip label={`Activos ${finance.activeProfiles.length}`} active={personnelFilter === 'ACTIVE'} onClick={() => setPersonnelFilter('ACTIVE')} />
              <Chip label={`Inactivos ${finance.inactiveProfiles.length}`} active={personnelFilter === 'INACTIVE'} onClick={() => setPersonnelFilter('INACTIVE')} />
              <button type="button" onClick={openCreateProfile} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">
                <Plus size={16} />
                Alta
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {filteredProfiles.length === 0 ? (
              <EmptyState message="No hay perfiles para esta busqueda." />
            ) : (
              filteredProfiles.map((item: FinancePayrollProfile) => (
                <button key={item.id} type="button" onClick={() => setPanel({ type: 'detail', profileId: item.id })} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-left">
                  <div>
                    <p className="text-base font-black text-slate-900">{item.person_name}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.area}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {periodicityLabel(item.periodicity)} · {formatCurrency(Number(item.current_period_amount))} / periodo
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Costo mensual estimado {formatCurrency(Number(item.estimated_monthly_cost))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={item.active ? 'ACTIVE' : 'PAUSED'} />
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </button>
              ))
            )}
          </div>
        </FinanceCard>
      )}

      <SlideOverPanel open={panel?.type === 'profile-create' || panel?.type === 'profile-edit'} onClose={() => setPanel(null)} title={panel?.type === 'profile-edit' ? 'Editar personal' : 'Alta de personal'} subtitle="ABC de nomina.">
        <form className="space-y-4" onSubmit={handleSaveProfile}>
          <Field label="Nombre *"><input value={profileForm.person_name} onChange={event => setProfileForm(current => ({ ...current, person_name: event.target.value }))} className={inputClass} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Area *"><input value={profileForm.area} onChange={event => setProfileForm(current => ({ ...current, area: event.target.value }))} className={inputClass} /></Field>
            <Field label="Periodicidad *">
              <select value={profileForm.periodicity} onChange={event => setProfileForm(current => ({ ...current, periodicity: event.target.value as typeof current.periodicity }))} className={inputClass}>
                <option value="MONTHLY">Mensual</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="WEEKLY">Semanal</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pago por periodo *"><input value={profileForm.current_period_amount} onChange={event => setProfileForm(current => ({ ...current, current_period_amount: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
            <Field label="Costo mensual estimado *"><input value={profileForm.estimated_monthly_cost} onChange={event => setProfileForm(current => ({ ...current, estimated_monthly_cost: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fecha de inicio"><input type="date" value={profileForm.start_date} onChange={event => setProfileForm(current => ({ ...current, start_date: event.target.value }))} className={inputClass} /></Field>
            <Field label="Estado">
              <select value={profileForm.active ? 'ACTIVE' : 'INACTIVE'} onChange={event => setProfileForm(current => ({ ...current, active: event.target.value === 'ACTIVE' }))} className={inputClass}>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Dar de baja</option>
              </select>
            </Field>
          </div>
          {!profileForm.active ? <Field label="Fecha efectiva de baja"><input type="date" value={profileForm.end_date} onChange={event => setProfileForm(current => ({ ...current, end_date: event.target.value }))} className={inputClass} /></Field> : null}
          <Field label="Notas"><textarea value={profileForm.notes} onChange={event => setProfileForm(current => ({ ...current, notes: event.target.value }))} rows={4} className={inputClass} /></Field>
          <button type="submit" disabled={financeModule.saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:bg-slate-300">
            {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : <BriefcaseBusiness size={16} />}
            Guardar
          </button>
        </form>
      </SlideOverPanel>

      <SlideOverPanel open={panel?.type === 'compensation' && !!selectedProfile} onClose={() => setPanel(selectedProfile ? { type: 'detail', profileId: selectedProfile.id } : null)} title="Modificar condiciones" subtitle={selectedProfile?.person_name}>
        {selectedProfile ? (
          <form className="space-y-4" onSubmit={handleChangeCompensation}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Pago actual</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(Number(selectedProfile.current_period_amount))}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nuevo pago"><input value={compensationForm.base_payment_amount} onChange={event => setCompensationForm(current => ({ ...current, base_payment_amount: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
              <Field label="Costo mensual"><input value={compensationForm.estimated_monthly_cost} onChange={event => setCompensationForm(current => ({ ...current, estimated_monthly_cost: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Aplicar desde *"><input type="date" value={compensationForm.effective_from} onChange={event => setCompensationForm(current => ({ ...current, effective_from: event.target.value }))} className={inputClass} /></Field>
              <Field label="Periodicidad">
                <select value={compensationForm.payment_frequency} onChange={event => setCompensationForm(current => ({ ...current, payment_frequency: event.target.value as typeof current.payment_frequency }))} className={inputClass}>
                  <option value="MONTHLY">Mensual</option>
                  <option value="BIWEEKLY">Quincenal</option>
                  <option value="WEEKLY">Semanal</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </Field>
            </div>
            <Field label="Motivo">
              <input value={compensationForm.change_reason} onChange={event => setCompensationForm(current => ({ ...current, change_reason: event.target.value }))} className={inputClass} />
            </Field>
            <button type="submit" disabled={financeModule.saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:bg-slate-300">
              {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : <CircleDollarSign size={16} />}
              Guardar cambio
            </button>
          </form>
        ) : null}
      </SlideOverPanel>

      <SlideOverPanel open={panel?.type === 'detail' && !!selectedProfile} onClose={() => setPanel(null)} title={selectedProfile?.person_name || 'Detalle'} subtitle={selectedProfile?.area}>
        {selectedProfile ? (
          <div className="space-y-5">
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-black text-slate-900">{selectedProfile.person_name}</p>
                  <p className="text-sm text-slate-500">{selectedProfile.area}</p>
                </div>
                <StatusBadge status={selectedProfile.active ? 'ACTIVE' : 'PAUSED'} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FinancialMetricCard label="Pago actual" value={formatCurrency(Number(selectedProfile.current_period_amount))} />
                <FinancialMetricCard label="Costo mensual" value={formatCurrency(Number(selectedProfile.estimated_monthly_cost))} />
              </div>
              <p className="text-sm text-slate-500">
                Desde {formatLocalDate(selectedProfile.start_date)}
                {selectedProfile.end_date ? ` · Baja ${formatLocalDate(selectedProfile.end_date)}` : ''}
              </p>
              {selectedProfile.notes ? <p className="text-sm text-slate-500">{selectedProfile.notes}</p> : null}
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Historial salarial</p>
              {compensationHistory[selectedProfile.id]?.loading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">Cargando historial salarial...</div>
              ) : (compensationHistory[selectedProfile.id]?.items || []).length === 0 ? (
                <EmptyState message="Sin historial salarial registrado." />
              ) : (
                (compensationHistory[selectedProfile.id]?.items || [])
                  .sort((a, b) => b.effective_from.localeCompare(a.effective_from))
                  .map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {formatLocalDate(item.effective_from)}
                          {item.effective_to ? ` - ${formatLocalDate(item.effective_to)}` : ' - Vigente'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {periodicityLabel(item.payment_frequency)} · {item.change_reason || 'Sin motivo'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{formatCurrency(Number(item.base_payment_amount))}</p>
                        <p className="text-sm text-slate-500">{formatCurrency(Number(item.estimated_monthly_cost))} / mes</p>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Historial de periodos</p>
              {(finance.payrollHistory.get(selectedProfile.id) || []).length === 0 ? (
                <EmptyState message="Sin periodos registrados." />
              ) : (
                (finance.payrollHistory.get(selectedProfile.id) || [])
                  .sort((a, b) => b.due_date.localeCompare(a.due_date))
                  .slice(0, 8)
                  .map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {formatLocalDate(item.period_start)} - {formatLocalDate(item.period_end)}
                        </p>
                        <p className="text-sm text-slate-500">Vence {formatLocalDate(item.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={item.status} />
                        <p className="mt-2 text-sm font-black text-slate-900">
                          {formatCurrency(Number(item.actual_amount ?? item.expected_amount))}
                        </p>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button type="button" onClick={() => openCompensation(selectedProfile)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                Modificar condiciones
              </button>
              <button type="button" onClick={() => openEditProfile(selectedProfile)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                Editar ficha / baja
              </button>
            </div>
          </div>
        ) : null}
      </SlideOverPanel>

      <SlideOverPanel open={panel?.type === 'batch-create'} onClose={() => setPanel(null)} title="Registrar pago de nomina" subtitle="Selecciona el periodo a consolidar.">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Catalyst crea un solo egreso `OP_PAYROLL` por lote y vincula exactamente las obligaciones cubiertas.
          </div>
          {groupedPending.length === 0 ? (
            <EmptyState message="No hay obligaciones pendientes para este periodo." />
          ) : (
            groupedPending.map(group => (
              <div key={group.key} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">{group.label}</p>
                    <p className="text-sm text-slate-500">Vence {formatLocalDate(group.periods[0].due_date)}</p>
                  </div>
                  <p className="text-sm font-black text-slate-900">{formatCurrency(group.remainingAmount)}</p>
                </div>
                <div className="space-y-2">
                  {group.periods.map((period: FinancePayrollPeriod) => (
                    <div key={period.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{finance.profileMap.get(period.payroll_profile_id)?.person_name || 'Personal'}</p>
                        <p className="text-sm text-slate-500">{finance.profileMap.get(period.payroll_profile_id)?.area || 'Sin area'}</p>
                      </div>
                      <p className="text-sm font-black text-slate-900">
                        {formatCurrency(Math.max(Number(period.expected_amount) - Number(period.actual_amount ?? 0), 0))}
                      </p>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => prepareBatchForGroup(group).catch(() => undefined)} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white">
                  <CalendarRange size={16} />
                  Continuar con este periodo
                </button>
              </div>
            ))
          )}
        </div>
      </SlideOverPanel>

      <SlideOverPanel open={panel?.type === 'batch-payment' && !!selectedBatch} onClose={() => setPanel(null)} title="Pago consolidado de nomina" subtitle={selectedBatch ? `${formatLocalDate(selectedBatch.period_start)} - ${formatLocalDate(selectedBatch.period_end)}` : undefined}>
        {selectedBatch ? (
          <form className="space-y-4" onSubmit={handleRegisterBatchPayment}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Esperado</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{formatCurrency(batchExpectedAmount)}</p>
            </div>

            <div className="space-y-2">
              {batchPeriods.map((period: FinancePayrollPeriod) => (
                <div key={period.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{finance.profileMap.get(period.payroll_profile_id)?.person_name || 'Personal'}</p>
                    <p className="text-sm text-slate-500">{formatLocalDate(period.period_start)} - {formatLocalDate(period.period_end)}</p>
                  </div>
                  <p className="text-sm font-black text-slate-900">
                    {formatCurrency(Math.max(Number(period.expected_amount) - Number(period.actual_amount ?? 0), 0))}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Monto pagado *"><input value={batchPaymentForm.paid_amount} onChange={event => setBatchPaymentForm(current => ({ ...current, paid_amount: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
              <Field label="Fecha *"><input type="date" value={batchPaymentForm.payment_date} onChange={event => setBatchPaymentForm(current => ({ ...current, payment_date: event.target.value }))} className={inputClass} /></Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Metodo"><input value={batchPaymentForm.payment_method} onChange={event => setBatchPaymentForm(current => ({ ...current, payment_method: event.target.value }))} className={inputClass} /></Field>
              <Field label="Referencia"><input value={batchPaymentForm.reference} onChange={event => setBatchPaymentForm(current => ({ ...current, reference: event.target.value }))} className={inputClass} /></Field>
            </div>

            {hasDifference ? (
              <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Diferencia</p>
                  <p className="mt-2 text-lg font-black text-amber-900">{formatCurrency(batchDifference)}</p>
                </div>
                <Field label="Como deseas tratar la diferencia?">
                  <div className="grid grid-cols-1 gap-2">
                    <button type="button" onClick={() => setBatchPaymentForm(current => ({ ...current, difference_treatment: 'KEEP_PENDING' }))} className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${batchPaymentForm.difference_treatment === 'KEEP_PENDING' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                      Mantener pendiente
                    </button>
                    <button type="button" onClick={() => setBatchPaymentForm(current => ({ ...current, difference_treatment: 'ADJUST_PERIOD' }))} className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold ${batchPaymentForm.difference_treatment === 'ADJUST_PERIOD' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                      Ajustar obligacion del periodo
                    </button>
                  </div>
                </Field>
                {batchPaymentForm.difference_treatment === 'ADJUST_PERIOD' ? (
                  <>
                    <Field label="Motivo *">
                      <select value={batchPaymentForm.adjustment_reason} onChange={event => setBatchPaymentForm(current => ({ ...current, adjustment_reason: event.target.value }))} className={inputClass}>
                        <option value="">Seleccionar...</option>
                        <option value="inasistencia">Inasistencia</option>
                        <option value="ajuste extraordinario">Ajuste extraordinario</option>
                        <option value="alta/baja durante periodo">Alta/baja durante periodo</option>
                        <option value="otro">Otro</option>
                      </select>
                    </Field>
                    <Field label="Comentario *">
                      <textarea value={batchPaymentForm.adjustment_comment} onChange={event => setBatchPaymentForm(current => ({ ...current, adjustment_comment: event.target.value }))} rows={4} className={inputClass} />
                    </Field>
                  </>
                ) : null}
              </div>
            ) : null}

            <Field label="Comprobante">
              <input type="file" onChange={event => setPayrollFile(event.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white" />
            </Field>
            {payrollFile ? (
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

            <Field label="Notas"><textarea value={batchPaymentForm.notes} onChange={event => setBatchPaymentForm(current => ({ ...current, notes: event.target.value }))} rows={4} className={inputClass} /></Field>

            <button type="submit" disabled={financeModule.saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:bg-slate-300">
              {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : <CalendarRange size={16} />}
              Registrar pago consolidado
            </button>
          </form>
        ) : null}
      </SlideOverPanel>
    </div>
  );
};
