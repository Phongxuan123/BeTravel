import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assistantAdminApi } from '../../lib/api';
import { ApiError } from '../../lib/apiClient';
import { Select } from '../ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../ui/Feedback';
import { DailyBarChart } from './DailyBarChart';

const DAY_OPTIONS = [7, 30, 90];
const DEFAULT_DAYS = 30;

const formatVnd = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} đ`;
const formatCount = (value: number) => value.toLocaleString('vi-VN');
const formatSeconds = (ms: number) => `${(ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} s`;
const formatPercent = (rate: number) => `${(rate * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="text-xl font-semibold text-ink">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

// F5: chi phi/ngay, luot hoi/ngay, do tre p50/p90, ty le tu choi. Khong co ty le "huu ich" (F4).
export function AssistantMetricsPanel() {
  const [days, setDays] = useState(DEFAULT_DAYS);
  const metrics = useQuery({
    queryKey: ['admin', 'assistant', 'metrics', days],
    queryFn: () => assistantAdminApi.metrics(days).then((res) => res.data),
  });

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Số liệu vận hành (ngày theo UTC)</h2>
        <div className="w-40">
          <Select label="Khoảng thời gian" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {DAY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} ngày
              </option>
            ))}
          </Select>
        </div>
      </div>

      {metrics.isLoading && <LoadingState />}
      {metrics.error && (
        <ErrorState message={metrics.error instanceof ApiError ? metrics.error.message : 'Không tải được số liệu'} />
      )}
      {metrics.data && metrics.data.totals.questions === 0 && <EmptyState label="Chưa có câu hỏi nào trong khoảng này" />}

      {metrics.data && metrics.data.totals.questions > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <Stat label="Lượt hỏi" value={formatCount(metrics.data.totals.questions)} />
            <Stat label="Chi phí ước tính" value={formatVnd(metrics.data.totals.costEstimateVnd)} />
            <Stat label="Độ trễ p50" value={formatSeconds(metrics.data.totals.p50LatencyMs)} />
            <Stat label="Độ trễ p90" value={formatSeconds(metrics.data.totals.p90LatencyMs)} />
            <Stat label="Tỉ lệ từ chối" value={formatPercent(metrics.data.totals.refusalRate)} />
            <Stat label="Vi phạm hậu kiểm" value={formatCount(metrics.data.totals.guardViolations)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <DailyBarChart
              title="Chi phí theo ngày"
              points={metrics.data.daily.map((day) => ({ date: day.date, value: day.costEstimateVnd }))}
              formatValue={formatVnd}
            />
            <DailyBarChart
              title="Lượt hỏi theo ngày"
              points={metrics.data.daily.map((day) => ({ date: day.date, value: day.questions }))}
              formatValue={formatCount}
            />
          </div>
        </>
      )}
    </section>
  );
}
