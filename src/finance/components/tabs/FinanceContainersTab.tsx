import React, { useEffect, useMemo, useState } from 'react';
import { Factory, Loader2, PackagePlus, Plus, Search } from 'lucide-react';
import { formatCurrency, formatLocalDate } from '../../../lib/utils';
import { useContainerCosts } from '../../hooks/useContainerCosts';
import { UseFinanceModuleResult } from '../../hooks/useFinanceModule';
import { FinanceExpenseAttachmentType, FinanceInventoryCost } from '../../types';
import {
  Chip,
  EmptyState,
  Field,
  FinanceCard,
  FinancialMetricCard,
  getToday,
  inputClass,
  mutedInputClass,
  numberFromInput,
  SlideOverPanel,
} from '../shared';

type ContainerPanel =
  | null
  | { type: 'purchase' }
  | { type: 'cost'; inventoryItemId?: string }
  | { type: 'detail'; inventoryItemId: string };

export const FinanceContainersTab: React.FC<{
  finance: UseFinanceModuleResult;
  onSuccess: (message: string) => void;
}> = ({ finance: financeModule, onSuccess }) => {
  const finance = useContainerCosts(financeModule);
  const [containerSearch, setContainerSearch] = useState('');
  const [panel, setPanel] = useState<ContainerPanel>(null);
  const [purchaseFile, setPurchaseFile] = useState<File | null>(null);
  const [costFile, setCostFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<FinanceExpenseAttachmentType>('PAYMENT_RECEIPT');

  const [purchaseForm, setPurchaseForm] = useState({
    product_type: '20 DC' as '20 DC' | '40 DC' | '40 HC' | 'Oficina',
    physical_number: '',
    condition: 'Usado' as 'Nuevo' | 'Usado',
    initial_location: 'Patio principal',
    acquisition_amount: '',
    acquisition_date: getToday(),
    supplier_name: '',
    acquisition_payment_method: '',
    acquisition_reference: '',
    notes: '',
    has_freight: true,
    freight_amount: '',
    freight_date: getToday(),
    freight_supplier_name: '',
  });
  const [costForm, setCostForm] = useState({
    concept: '',
    amount: '',
    expenseDate: getToday(),
    categoryId: '',
    inventoryItemId: '',
    modificationProjectId: '',
    supplierName: '',
    description: '',
    status: 'PAID' as 'PAID' | 'PENDING',
    paymentDate: getToday(),
  });

  useEffect(() => {
    if (!costForm.categoryId) {
      const preferred =
        finance.categories.find(item => ['MODIFICATION', 'LOGISTICS', 'INVENTORY'].includes(item.summaryBucket)) ||
        finance.categories[0];
      if (preferred) {
        setCostForm(current => ({ ...current, categoryId: preferred.id }));
      }
    }
  }, [costForm.categoryId, finance.categories]);

  const filteredCosts = useMemo(() => {
    const query = containerSearch.trim().toLowerCase();
    return finance.inventoryCosts.filter((item: FinanceInventoryCost) => !query || item.internal_id.toLowerCase().includes(query) || item.product_type.toLowerCase().includes(query));
  }, [containerSearch, finance.inventoryCosts]);

  const selectedCost =
    panel?.type === 'detail' ? finance.costMap.get(panel.inventoryItemId) || null : null;
  const selectedCostExpenses = selectedCost ? finance.getCostExpenses(selectedCost.inventory_item_id) : [];

  const handlePurchase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const result = await finance.registerContainerPurchase({
        product_type: purchaseForm.product_type,
        physical_number: purchaseForm.physical_number || undefined,
        condition: purchaseForm.condition,
        initial_location: purchaseForm.initial_location || undefined,
        acquisition_amount: numberFromInput(purchaseForm.acquisition_amount),
        acquisition_date: purchaseForm.acquisition_date,
        supplier_name: purchaseForm.supplier_name || undefined,
        acquisition_payment_method: purchaseForm.acquisition_payment_method || undefined,
        acquisition_reference: purchaseForm.acquisition_reference || undefined,
        freight_amount: purchaseForm.has_freight ? numberFromInput(purchaseForm.freight_amount) : undefined,
        freight_date: purchaseForm.has_freight ? purchaseForm.freight_date : undefined,
        freight_supplier_name: purchaseForm.has_freight ? purchaseForm.freight_supplier_name || undefined : undefined,
        notes: purchaseForm.notes || undefined,
      });

      if (purchaseFile) {
        await finance.uploadExpenseAttachment({
          expenseId: result.acquisitionExpense.id,
          file: purchaseFile,
          documentType,
        });
      }

      setPanel(null);
      onSuccess(purchaseFile ? 'Compra y comprobante registrados.' : 'Compra de container registrada.');
    } catch {}
  };

  const handleCost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const expense = await finance.registerModificationCost({
        concept: costForm.concept,
        amount: numberFromInput(costForm.amount),
        expenseDate: costForm.expenseDate,
        categoryId: costForm.categoryId,
        inventoryItemId: costForm.inventoryItemId || undefined,
        modificationProjectId: costForm.modificationProjectId || undefined,
        supplierName: costForm.supplierName || undefined,
        description: costForm.description || undefined,
        status: costForm.status,
        paymentDate: costForm.status === 'PAID' ? costForm.paymentDate : null,
      });

      if (costFile) {
        await finance.uploadExpenseAttachment({
          expenseId: expense.id,
          file: costFile,
          documentType,
        });
      }

      setPanel(null);
      onSuccess(costFile ? 'Costo y comprobante registrados.' : 'Costo de container registrado.');
    } catch {}
  };

  return (
    <div className="space-y-6">
      <FinanceCard title="Costos de containers" subtitle="Compra ocasional y costeo del activo.">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setPanel({ type: 'purchase' })}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white"
              >
                <PackagePlus size={16} />
                Registrar compra
              </button>
              <button
                type="button"
                onClick={() => setPanel({ type: 'cost' })}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-700"
              >
                <Plus size={16} />
                Registrar costo
              </button>
            </div>
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={containerSearch} onChange={event => setContainerSearch(event.target.value)} placeholder="Buscar container..." className={`${mutedInputClass} pl-11`} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Desde aqui puedes registrar compra y tambien agregar costos directos al activo o a un proyecto real de modificacion.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-1">
            <FinancialMetricCard label="Compra inventario" value={formatCurrency(financeModule.summary?.inventoryCost || 0)} />
            <FinancialMetricCard label="Logistica" value={formatCurrency(financeModule.summary?.logisticsCost || 0)} />
            <FinancialMetricCard label="Modificacion" value={formatCurrency(financeModule.summary?.modificationCost || 0)} />
          </div>
        </div>
      </FinanceCard>

      <FinanceCard title="Huella financiera por activo" subtitle={`${filteredCosts.length} activos visibles`}>
        <div className="space-y-3">
          {filteredCosts.length === 0 ? (
            <EmptyState message="Aun no hay costos acumulados por activo." />
          ) : (
            filteredCosts.map((item: FinanceInventoryCost) => (
              <button key={item.inventory_item_id} type="button" onClick={() => setPanel({ type: 'detail', inventoryItemId: item.inventory_item_id })} className="w-full rounded-2xl border border-slate-200 p-4 text-left">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-base font-black text-slate-900">{item.internal_id}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.product_type}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xl font-black text-slate-900">{formatCurrency(Number(item.accumulated_cost))}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Costo acumulado</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </FinanceCard>

      <SlideOverPanel open={panel?.type === 'purchase'} onClose={() => setPanel(null)} title="Registrar compra de container" subtitle="Alta del activo con compra y flete.">
        <form className="space-y-4" onSubmit={handlePurchase}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tipo *">
              <select value={purchaseForm.product_type} onChange={event => setPurchaseForm(current => ({ ...current, product_type: event.target.value as typeof current.product_type }))} className={inputClass}>
                <option value="20 DC">20 FT DC</option>
                <option value="40 DC">40 FT DC</option>
                <option value="40 HC">40 FT HC</option>
                <option value="Oficina">Oficina</option>
              </select>
            </Field>
            <Field label="Condicion *">
              <select value={purchaseForm.condition} onChange={event => setPurchaseForm(current => ({ ...current, condition: event.target.value as typeof current.condition }))} className={inputClass}>
                <option value="Nuevo">Nuevo</option>
                <option value="Usado">Usado</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Numero fisico"><input value={purchaseForm.physical_number} onChange={event => setPurchaseForm(current => ({ ...current, physical_number: event.target.value }))} className={inputClass} /></Field>
            <Field label="Ubicacion inicial *"><input value={purchaseForm.initial_location} onChange={event => setPurchaseForm(current => ({ ...current, initial_location: event.target.value }))} className={inputClass} /></Field>
          </div>
          <Field label="Proveedor"><input value={purchaseForm.supplier_name} onChange={event => setPurchaseForm(current => ({ ...current, supplier_name: event.target.value }))} className={inputClass} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fecha *"><input type="date" value={purchaseForm.acquisition_date} onChange={event => setPurchaseForm(current => ({ ...current, acquisition_date: event.target.value }))} className={inputClass} /></Field>
            <Field label="Costo de compra *"><input value={purchaseForm.acquisition_amount} onChange={event => setPurchaseForm(current => ({ ...current, acquisition_amount: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Metodo de pago"><input value={purchaseForm.acquisition_payment_method} onChange={event => setPurchaseForm(current => ({ ...current, acquisition_payment_method: event.target.value }))} className={inputClass} /></Field>
            <Field label="Referencia"><input value={purchaseForm.acquisition_reference} onChange={event => setPurchaseForm(current => ({ ...current, acquisition_reference: event.target.value }))} className={inputClass} /></Field>
          </div>
          <div className="flex gap-2">
            <Chip label="Flete si" active={purchaseForm.has_freight} onClick={() => setPurchaseForm(current => ({ ...current, has_freight: true }))} />
            <Chip label="Flete no" active={!purchaseForm.has_freight} onClick={() => setPurchaseForm(current => ({ ...current, has_freight: false }))} />
          </div>
          {purchaseForm.has_freight ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Flete"><input value={purchaseForm.freight_amount} onChange={event => setPurchaseForm(current => ({ ...current, freight_amount: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
                <Field label="Fecha flete"><input type="date" value={purchaseForm.freight_date} onChange={event => setPurchaseForm(current => ({ ...current, freight_date: event.target.value }))} className={inputClass} /></Field>
              </div>
              <Field label="Proveedor flete"><input value={purchaseForm.freight_supplier_name} onChange={event => setPurchaseForm(current => ({ ...current, freight_supplier_name: event.target.value }))} className={inputClass} /></Field>
            </>
          ) : null}
          <Field label="Comprobante">
            <input type="file" onChange={event => setPurchaseFile(event.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white" />
          </Field>
          {(purchaseFile || costFile) ? (
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
          <Field label="Notas"><textarea value={purchaseForm.notes} onChange={event => setPurchaseForm(current => ({ ...current, notes: event.target.value }))} rows={4} className={inputClass} /></Field>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">Compra</span><span className="font-black text-slate-900">{formatCurrency(numberFromInput(purchaseForm.acquisition_amount))}</span></div>
            <div className="mt-2 flex items-center justify-between"><span className="text-slate-500">Flete</span><span className="font-black text-slate-900">{formatCurrency(purchaseForm.has_freight ? numberFromInput(purchaseForm.freight_amount) : 0)}</span></div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2"><span className="font-black text-slate-700">Costo inicial</span><span className="text-lg font-black text-slate-900">{formatCurrency(numberFromInput(purchaseForm.acquisition_amount) + (purchaseForm.has_freight ? numberFromInput(purchaseForm.freight_amount) : 0))}</span></div>
          </div>
          <button type="submit" disabled={financeModule.saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:bg-slate-300">
            {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
            Registrar compra
          </button>
        </form>
      </SlideOverPanel>

      <SlideOverPanel open={panel?.type === 'detail' && !!selectedCost} onClose={() => setPanel(null)} title={selectedCost?.internal_id || 'Detalle financiero'} subtitle={selectedCost?.product_type}>
        {selectedCost ? (
          <div className="space-y-5">
            <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Costo acumulado</p>
              <p className="text-3xl font-black text-slate-900">{formatCurrency(Number(selectedCost.accumulated_cost))}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FinancialMetricCard label="Adquisicion" value={formatCurrency(Number(selectedCost.acquisition_cost))} />
                <FinancialMetricCard label="Logistica" value={formatCurrency(Number(selectedCost.logistics_cost))} />
                <FinancialMetricCard label="Modificacion" value={formatCurrency(Number(selectedCost.modification_cost))} />
              </div>
            </div>
            <button type="button" onClick={() => {
              setCostForm(current => ({ ...current, concept: '', amount: '', expenseDate: getToday(), inventoryItemId: selectedCost.inventory_item_id, modificationProjectId: '', supplierName: '', description: '', status: 'PAID', paymentDate: getToday() }));
              setCostFile(null);
              setPanel({ type: 'cost', inventoryItemId: selectedCost.inventory_item_id });
            }} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-700">
              <Plus size={16} />
              Registrar costo
            </button>
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Detalle</p>
              {selectedCostExpenses.length === 0 ? <EmptyState message="Aun no hay egresos ligados a este activo." /> : selectedCostExpenses.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">{item.concept}</p>
                    <p className="text-sm text-slate-500">{formatLocalDate(item.expenseDate)}</p>
                  </div>
                  <p className="text-sm font-black text-slate-900">{formatCurrency(Number(item.paidAmount ?? item.amount))}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </SlideOverPanel>

      <SlideOverPanel open={panel?.type === 'cost'} onClose={() => setPanel(null)} title="Nuevo costo" subtitle="Registro directo contra el activo o proyecto de modificacion.">
        <form className="space-y-4" onSubmit={handleCost}>
          <Field label="Container">
            <select value={costForm.inventoryItemId} onChange={event => setCostForm(current => ({ ...current, inventoryItemId: event.target.value }))} className={inputClass}>
              <option value="">Seleccionar...</option>
              {finance.inventoryReferences.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Proyecto de modificacion">
            <select value={costForm.modificationProjectId} onChange={event => setCostForm(current => ({ ...current, modificationProjectId: event.target.value }))} className={inputClass}>
              <option value="">Ninguno</option>
              {finance.modificationProjectReferences.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Concepto *"><input value={costForm.concept} onChange={event => setCostForm(current => ({ ...current, concept: event.target.value }))} className={inputClass} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Monto *"><input value={costForm.amount} onChange={event => setCostForm(current => ({ ...current, amount: event.target.value }))} inputMode="decimal" className={inputClass} /></Field>
            <Field label="Fecha *"><input type="date" value={costForm.expenseDate} onChange={event => setCostForm(current => ({ ...current, expenseDate: event.target.value }))} className={inputClass} /></Field>
          </div>
          <Field label="Categoria *">
            <select 
              value={costForm.categoryId} 
              onChange={event => setCostForm(current => ({ ...current, categoryId: event.target.value }))} 
              className={inputClass}
              disabled={finance.categories.length === 0}
            >
              {finance.categories.length === 0 ? (
                <option value="">No hay categorias disponibles</option>
              ) : (
                <option value="">Seleccionar categoria...</option>
              )}
              {finance.categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Proveedor"><input value={costForm.supplierName} onChange={event => setCostForm(current => ({ ...current, supplierName: event.target.value }))} className={inputClass} /></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Estado">
              <select value={costForm.status} onChange={event => setCostForm(current => ({ ...current, status: event.target.value as 'PAID' | 'PENDING' }))} className={inputClass}>
                <option value="PAID">Pagado</option>
                <option value="PENDING">Pendiente</option>
              </select>
            </Field>
            <Field label="Fecha de pago"><input type="date" value={costForm.paymentDate} onChange={event => setCostForm(current => ({ ...current, paymentDate: event.target.value }))} disabled={costForm.status !== 'PAID'} className={inputClass} /></Field>
          </div>
          <Field label="Comprobante">
            <input type="file" onChange={event => setCostFile(event.target.files?.[0] || null)} className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-900 file:px-4 file:py-3 file:text-sm file:font-bold file:text-white" />
          </Field>
          {(purchaseFile || costFile) ? (
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
          <Field label="Notas"><textarea value={costForm.description} onChange={event => setCostForm(current => ({ ...current, description: event.target.value }))} rows={4} className={inputClass} /></Field>
          <button type="submit" disabled={financeModule.saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white disabled:bg-slate-300">
            {financeModule.saving ? <Loader2 size={16} className="animate-spin" /> : <Factory size={16} />}
            Registrar costo
          </button>
        </form>
      </SlideOverPanel>

      {panel === null ? (
        <div className="fixed bottom-6 right-6 flex gap-3 md:hidden">
          <button type="button" onClick={() => setPanel({ type: 'cost' })} className="inline-flex h-14 min-w-14 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-slate-700 shadow-xl">
            + Costo
          </button>
          <button type="button" onClick={() => setPanel({ type: 'purchase' })} className="inline-flex h-14 min-w-14 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-xl">
            + Compra
          </button>
        </div>
      ) : null}
    </div>
  );
};
