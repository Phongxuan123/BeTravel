import { format as fnsFormat, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { parseISODate } from './date';

export function relativeTimeVi(iso: string): string {
  return formatDistanceToNow(new Date(iso), { locale: vi, addSuffix: true });
}

export function formatShortDate(iso: string): string {
  return fnsFormat(parseISODate(iso), 'dd/MM', { locale: vi });
}

export function formatFullDate(iso: string): string {
  return fnsFormat(parseISODate(iso), 'dd/MM/yyyy', { locale: vi });
}

export function formatWeekday(iso: string): string {
  return fnsFormat(parseISODate(iso), 'EEEE', { locale: vi });
}

export function formatTripRange(startIso: string, endIso: string): string {
  return `${formatShortDate(startIso)} – ${formatShortDate(endIso)}`;
}

export function tripDurationDays(startIso: string, endIso: string): number {
  const start = parseISODate(startIso);
  const end = parseISODate(endIso);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}
