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

export const getDaysAgo = (dateStr?: string | null): number => {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 0;
  const diffTime = Math.abs(new Date().getTime() - date.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isToday = (dateStr?: string | null): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

export const isOverdue = (dateStr?: string | null, daysThreshold: number = 7): boolean => {
  return getDaysAgo(dateStr) >= daysThreshold;
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
