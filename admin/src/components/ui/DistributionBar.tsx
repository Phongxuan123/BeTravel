import type { Tone } from '../../lib/labels';

export type DistributionItem = { key: string; label: string; value: number; tone: Tone };

const FILL_TONE: Record<Tone, string> = {
  brand: 'bg-brand',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
  neutral: 'bg-slate-400',
};

const formatShare = (value: number, total: number) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';

/*
 * Phan bo mot tong theo nhom: thanh xep chong o tren (nhin mot lan thay ty trong) + danh sach
 * so lieu ben duoi (doc chinh xac). Ve bang CSS, khong them thu vien bieu do (Rule 9 KISS).
 */
export function DistributionBar({ items, emptyLabel = 'Chưa có dữ liệu' }: { items: DistributionItem[]; emptyLabel?: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        {items
          .filter((item) => item.value > 0)
          .map((item) => (
            <div
              key={item.key}
              className={FILL_TONE[item.tone]}
              style={{ width: `${(item.value / total) * 100}%` }}
              title={`${item.label}: ${item.value}`}
            />
          ))}
      </div>

      <ul className="mt-4 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3 text-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${FILL_TONE[item.tone]}`} />
            <span className="min-w-0 flex-1 truncate text-ink">{item.label}</span>
            <span className="font-semibold tabular-nums text-ink">{item.value.toLocaleString('vi-VN')}</span>
            <span className="w-10 text-right text-xs tabular-nums text-muted">{formatShare(item.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
