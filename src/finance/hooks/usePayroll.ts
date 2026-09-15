import { useMemo } from 'react';
import { formatLocalDate } from '../../lib/utils';
import { FinancePayrollPeriod } from '../types';
import { UseFinanceModuleResult } from './useFinanceModule';

type PayrollGroup = {
  key: string;
  periods: FinancePayrollPeriod[];
  amount: number;
  remainingAmount: number;
  label: string;
};

export const usePayroll = (finance: UseFinanceModuleResult) => {
  const pendingPayroll = useMemo(
    () => finance.payrollPeriods.filter((item: FinancePayrollPeriod) => item.status === 'PENDING'),
    [finance.payrollPeriods]
  );

  const paidPayroll = useMemo(
    () => finance.payrollPeriods.filter((item: FinancePayrollPeriod) => item.status === 'PAID'),
    [finance.payrollPeriods]
  );

  const pendingAmount = useMemo(
    () =>
      pendingPayroll.reduce(
        (sum: number, item: FinancePayrollPeriod) =>
          sum + Math.max(Number(item.expected_amount) - Number(item.actual_amount ?? 0), 0),
        0
      ),
    [pendingPayroll]
  );

  const paidAmount = useMemo(
    () =>
      paidPayroll.reduce(
        (sum: number, item: FinancePayrollPeriod) => sum + Number(item.actual_amount ?? item.expected_amount),
        0
      ),
    [paidPayroll]
  );

  const payrollHistory = useMemo(() => {
    const grouped = new Map<string, FinancePayrollPeriod[]>();
    finance.allPayrollPeriods.forEach((item: FinancePayrollPeriod) => {
      const current = grouped.get(item.payroll_profile_id) || [];
      current.push(item);
      grouped.set(item.payroll_profile_id, current);
    });
    return grouped;
  }, [finance.allPayrollPeriods]);

  const payrollGroups = useMemo(() => {
    const grouped = new Map<string, PayrollGroup>();

    finance.payrollPeriods.forEach((item: FinancePayrollPeriod) => {
      const key = `${item.period_start}-${item.period_end}-${item.due_date}`;
      const current = grouped.get(key) || {
        key,
        periods: [],
        amount: 0,
        remainingAmount: 0,
        label: `${formatLocalDate(item.period_start)} - ${formatLocalDate(item.period_end)}`,
      };

      current.periods.push(item);
      current.amount += Number(item.expected_amount);
      current.remainingAmount += Math.max(Number(item.expected_amount) - Number(item.actual_amount ?? 0), 0);
      grouped.set(key, current);
    });

    return Array.from(grouped.values()).sort((a, b) => a.periods[0].due_date.localeCompare(b.periods[0].due_date));
  }, [finance.payrollPeriods]);

  const activeProfiles = useMemo(() => finance.payrollProfiles.filter(item => item.active), [finance.payrollProfiles]);
  const inactiveProfiles = useMemo(() => finance.payrollProfiles.filter(item => !item.active), [finance.payrollProfiles]);
  const profileMap = useMemo(
    () => new Map(finance.payrollProfiles.map(item => [item.id, item] as const)),
    [finance.payrollProfiles]
  );

  return useMemo(
    () => ({
      pendingPayroll,
      paidPayroll,
      pendingAmount,
      paidAmount,
      payrollHistory,
      payrollGroups,
      activeProfiles,
      inactiveProfiles,
      profileMap,
      payrollProfiles: finance.payrollProfiles,
      payrollBatches: finance.payrollBatches,
      createPayrollProfile: finance.createPayrollProfile,
      updatePayrollProfile: finance.updatePayrollProfile,
      generatePayrollPeriods: finance.generatePayrollPeriods,
      createPayrollBatch: finance.createPayrollBatch,
      registerPayrollBatchPayment: finance.registerPayrollBatchPayment,
      listPayrollCompensationHistory: finance.listPayrollCompensationHistory,
      changePayrollCompensation: finance.changePayrollCompensation,
      uploadExpenseAttachment: finance.uploadExpenseAttachment,
      categories: finance.categories,
    }),
    [
      activeProfiles,
      finance.categories,
      finance.changePayrollCompensation,
      finance.createPayrollBatch,
      finance.createPayrollProfile,
      finance.generatePayrollPeriods,
      finance.listPayrollCompensationHistory,
      finance.payrollBatches,
      finance.payrollProfiles,
      finance.registerPayrollBatchPayment,
      finance.updatePayrollProfile,
      finance.uploadExpenseAttachment,
      inactiveProfiles,
      paidAmount,
      paidPayroll,
      pendingAmount,
      pendingPayroll,
      payrollGroups,
      payrollHistory,
      profileMap,
    ]
  );
};
