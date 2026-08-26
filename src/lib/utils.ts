import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const parseLocalDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  return new Date(year, month - 1, day);
};

export const formatLocalDate = (dateStr?: string | null): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return 'Sin registrar';
  return format(date, 'dd/MM/yyyy');
};

export const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return 'Sin registrar';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Sin registrar';
  return format(date, 'dd/MM/yyyy HH:mm');
};

export const formatShortDate = (dateStr?: string | null): string => {
  const date = parseLocalDate(dateStr);
  if (!date) return '-';
  return format(date, 'dd MMM', { locale: es });
};

export function normalizePhoneForWhatsApp(rawPhone: string | null | undefined): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '52' + digits;
  }
  return digits;
}

export function buildWhatsAppUrl(
  rawPhone: string | null | undefined,
  message?: string
): string {
  const phone = normalizePhoneForWhatsApp(rawPhone);
  if (!phone) return '';
  const base = `https://wa.me/${phone}`;
  if (message) {
    return `${base}?text=${encodeURIComponent(message)}`;
  }
  return base;
}
