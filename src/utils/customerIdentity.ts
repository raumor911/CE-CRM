import { Rental, ExistingRentalCustomer } from '../types';

export const cleanCustomerName = (name?: string | null): string =>
  (name || '')
    .trim()
    .replace(/\s+/g, ' ');

export const normalizeCustomerName = (
  name?: string | null
): string =>
  cleanCustomerName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX');

export const normalizeCustomerPhone = (
  phone?: string | null
): string => {
  const digits = (phone || '').replace(/\D/g, '');

  return digits.length > 10
    ? digits.slice(-10)
    : digits;
};

export const buildExistingCustomers = (
  rentals: Rental[]
): ExistingRentalCustomer[] => {
  const groups = new Map<string, ExistingRentalCustomer>();

  const orderedRentals = [...rentals].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() -
      new Date(a.updated_at).getTime()
  );

  orderedRentals.forEach(rental => {
    const normalizedName =
      normalizeCustomerName(rental.customer_name);

    if (!normalizedName) return;

    const key = `name:${normalizedName}`;
    const phone = rental.customer_phone?.trim() || null;
    const normalizedPhone = normalizeCustomerPhone(phone);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        normalizedName,
        customerName:
          cleanCustomerName(rental.customer_name),
        primaryPhone: phone,
        phones: phone ? [phone] : [],
        rentalCount: 1,
        activeRentalCount:
          rental.status === 'active' ? 1 : 0,
        lastRentalAt: rental.updated_at,
      });

      return;
    }

    existing.rentalCount += 1;

    if (rental.status === 'active') {
      existing.activeRentalCount += 1;
    }

    if (
      phone &&
      !existing.phones.some(
        currentPhone =>
          normalizeCustomerPhone(currentPhone) ===
          normalizedPhone
      )
    ) {
      existing.phones.push(phone);
    }
  });

  return Array.from(groups.values()).sort((a, b) =>
    a.customerName.localeCompare(
      b.customerName,
      'es-MX'
    )
  );
};
