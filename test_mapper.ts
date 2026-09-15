import { mapExpenseCategoryFromDb } from './src/finance/repositories/expenseMappers';

const row = {
  code: 'OP_PAYROLL',
  name: 'Nomina',
  nature: 'PAYROLL' as any,
  summary_bucket: 'OPERATING' as any,
  is_operating_cost: true,
  is_active: true,
  sort_order: 35,
  description: 'test'
};

try {
  console.log(mapExpenseCategoryFromDb(row as any));
} catch (e) {
  console.log('Error in mapper:', e);
}
