// "Hôm nay" cố định cho dữ liệu mẫu (spec mục 7.6) để các số "Còn N ngày" khớp thiết kế.
// Inject được để test không phụ thuộc ngày thật.
const MOCK_TODAY = new Date('2026-09-21T00:00:00');

let override: Date | null = null;

export function now(): Date {
  return override ?? MOCK_TODAY;
}

export function __setNowForTest(date: Date | null): void {
  override = date;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

export function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}
