type DailyPoint = { date: string; value: number };

type Props = {
  title: string;
  points: DailyPoint[];
  formatValue: (value: number) => string;
};

const CHART_HEIGHT_PX = 128;

/*
 * Bieu do cot don gian theo ngay (mot chuoi so lieu) bang CSS -- admin chua dung thu vien bieu
 * do nao, them dependency cho 2 bieu do cot la khong dang (KISS). Hover cot de xem gia tri;
 * bang an (sr-only) cho trinh doc man hinh.
 */
export function DailyBarChart({ title, points, formatValue }: Props) {
  const maxValue = Math.max(0, ...points.map((point) => point.value));
  const firstDate = points[0]?.date;
  const lastDate = points[points.length - 1]?.date;

  return (
    <figure className="rounded-lg border border-line bg-white p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-xs text-muted">Cao nhất: {formatValue(maxValue)}</span>
      </figcaption>

      <div className="flex items-end gap-0.5 border-b border-line" style={{ height: CHART_HEIGHT_PX }} aria-hidden="true">
        {points.map((point) => {
          const heightPercent = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
          return (
            <div key={point.date} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-brand group-hover:bg-brand-dark"
                style={{ height: `${heightPercent}%`, minHeight: point.value > 0 ? 2 : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-white group-hover:block">
                {point.date}: {formatValue(point.value)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>

      <table className="sr-only">
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
    </figure>
  );
}
