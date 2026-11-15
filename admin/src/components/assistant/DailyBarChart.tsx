type DailyPoint = { date: string; value: number };

type Props = {
  title: string;
  points: DailyPoint[];
  formatValue: (value: number) => string;
  barClassName?: string;
};

const CHART_HEIGHT_PX = 160;
const GRID_FRACTIONS = [1, 0.5];

// "2026-11-14" --> "14/11": nhan truc ngan gon, de doc khi trinh chieu.
const shortDate = (isoDate: string | undefined) => (isoDate ? isoDate.slice(5).split('-').reverse().join('/') : '');

/*
 * Bieu do cot don gian theo ngay (mot chuoi so lieu) bang CSS -- admin chua dung thu vien bieu
 * do nao, them dependency cho vai bieu do cot la khong dang (KISS). Hover cot de xem gia tri;
 * bang an (sr-only) cho trinh doc man hinh.
 */
export function DailyBarChart({ title, points, formatValue, barClassName = 'bg-brand group-hover:bg-brand-dark' }: Props) {
  const maxValue = Math.max(0, ...points.map((point) => point.value));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const middlePoint = points[Math.floor(points.length / 2)];

  return (
    <figure className="rounded-xl border border-line bg-white p-5 shadow-card">
      <figcaption className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-xs text-muted">
          Tổng <span className="font-semibold text-ink">{formatValue(total)}</span> · cao nhất {formatValue(maxValue)}
        </span>
      </figcaption>

      <div className="relative" style={{ height: CHART_HEIGHT_PX }} aria-hidden="true">
        {maxValue > 0 &&
          GRID_FRACTIONS.map((fraction) => (
            <div
              key={fraction}
              className="absolute inset-x-0 border-t border-dashed border-line"
              style={{ bottom: `${fraction * 100}%` }}
            >
              <span className="absolute -top-2 right-0 bg-white pl-1 text-[10px] text-muted">
                {formatValue(maxValue * fraction)}
              </span>
            </div>
          ))}
        <div className="absolute inset-0 flex items-end gap-1 border-b border-line">
          {points.map((point) => {
            const heightPercent = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
            return (
              <div key={point.date} className="group relative flex h-full flex-1 items-end">
                <div
                  className={`w-full rounded-t-md transition-colors ${barClassName}`}
                  style={{ height: `${heightPercent}%`, minHeight: point.value > 0 ? 3 : 0 }}
                />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white shadow group-hover:block">
                  {shortDate(point.date)}: {formatValue(point.value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-1.5 flex justify-between text-xs text-muted" aria-hidden="true">
        <span>{shortDate(points[0]?.date)}</span>
        {points.length > 2 && <span>{shortDate(middlePoint?.date)}</span>}
        <span>{shortDate(points[points.length - 1]?.date)}</span>
      </div>

      {/* Boc div sr-only: the table bo qua height/overflow nen tu no van keo dai trang. */}
      <div className="sr-only">
        <table>
          <caption>{title}</caption>
          <tbody>
            {points.map((point) => (
              <tr key={point.date}>
                <th scope="row">{point.date}</th>
                <td>{formatValue(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
