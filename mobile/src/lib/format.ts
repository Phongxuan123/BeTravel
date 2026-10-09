import { format as fnsFormat } from 'date-fns';
import { vi } from 'date-fns/locale';
import { parseISODate } from './date';

export function formatShortDate(iso: string): string {
  return fnsFormat(parseISODate(iso), 'dd/MM', { locale: vi });
}

export function formatFullDate(iso: string): string {
  return fnsFormat(parseISODate(iso), 'dd/MM/yyyy', { locale: vi });
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Ngày dd/MM/yyyy cho chuỗi đã đủ YYYY-MM-DD; chuỗi đang gõ dở thì giữ nguyên để không báo sai ngày. */
export function formatDateIfComplete(iso: string): string {
  const complete = ISO_DATE.test(iso) && !Number.isNaN(parseISODate(iso).getTime());
  return complete ? formatFullDate(iso) : iso;
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
