let override: Date | null = null;

// Runtime dùng ngày thực của thiết bị. Test vẫn có thể cố định thời gian qua
// __setNowForTest để kết quả ổn định.
export function now(): Date {
  const value = override ? new Date(override) : new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

export function __setNowForTest(date: Date | null): void {
  override = date ? new Date(date) : null;
}

export function daysBetween(a: Date, b: Date): number {
  const start = new Date(a);
  const end = new Date(b);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export function parseISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}
