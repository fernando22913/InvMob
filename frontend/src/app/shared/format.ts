const DEFAULT_LOCALE = 'es-CL';

export function formatCurrency(
  value: string | number | null | undefined,
  locale: string = DEFAULT_LOCALE
): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) {
    return String(value ?? '');
  }
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
  return `$${formatted}`;
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: string = DEFAULT_LOCALE
): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function formatDateTime(
  value: string | Date | null | undefined,
  locale: string = DEFAULT_LOCALE
): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
