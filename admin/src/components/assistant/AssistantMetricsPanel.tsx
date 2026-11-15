import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Coins, Gauge, MessagesSquare, ShieldCheck, Timer, Ban } from 'lucide-react';
import { assistantAdminApi } from '../../lib/api';
import { ApiError } from '../../lib/apiClient';
import { formatCount, formatPercent, formatSeconds, formatVnd, kindDistribution, tierDistribution } from '../../lib/format';
import { Select } from '../ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../ui/Feedback';
import { StatCard } from '../ui/StatCard';
import { Panel } from '../ui/Panel';
import { DistributionBar } from '../ui/DistributionBar';
import { DailyBarChart } from './DailyBarChart';

const DAY_OPTIONS = [7, 30, 90];
const DEFAULT_DAYS = 30;
// Nguong to mau canh bao -- chi anh huong hien thi, khong phai nguong nghiep vu.
const REFUSAL_WARN_RATE = 0.2;
const P90_WARN_MS = 10_000;

// F5: chi phi/ngay, luot hoi/ngay, do tre p50/p90, ty le tu choi, phan bo tang nguon. Khong co ty le "huu ich" (F4).
export function AssistantMetricsPanel() {
  const [days, setDays] = useState(DEFAULT_DAYS);
  const metrics = useQuery({
    queryKey: ['admin', 'assistant', 'metrics', days],
    queryFn: () => assistantAdminApi.metrics(days).then((res) => res.data),
  });
  const totals = metrics.data?.totals;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Số liệu vận hành</h2>
          <p className="text-xs text-muted">Ngày tính theo giờ UTC.</p>
        </div>
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
      {totals && totals.questions === 0 && <EmptyState label="Chưa có câu hỏi nào trong khoảng này" />}

      {metrics.data && totals && totals.questions > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={MessagesSquare} label="Lượt hỏi" value={formatCount(totals.questions)} />
            <StatCard icon={Coins} label="Chi phí ước tính" value={formatVnd(totals.costEstimateVnd)} tone="neutral" />
            <StatCard icon={Gauge} label="Độ trễ p50" value={formatSeconds(totals.p50LatencyMs)} tone="success" />
            <StatCard
              icon={Timer}
              label="Độ trễ p90"
              value={formatSeconds(totals.p90LatencyMs)}
              tone={totals.p90LatencyMs > P90_WARN_MS ? 'warn' : 'success'}
            />
            <StatCard
              icon={Ban}
              label="Tỉ lệ từ chối"
              value={formatPercent(totals.refusalRate)}
              tone={totals.refusalRate > REFUSAL_WARN_RATE ? 'warn' : 'neutral'}
            />
            <StatCard
              icon={ShieldCheck}
              label="Vi phạm hậu kiểm"
              value={formatCount(totals.guardViolations)}
              hint="Đã chặn bằng code"
              tone={totals.guardViolations > 0 ? 'warn' : 'success'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Câu trả lời lấy từ đâu" description="Nhãn tầng nguồn do code gán theo nguồn thật đã dùng.">
              <DistributionBar items={tierDistribution(metrics.data.breakdown)} />
            </Panel>
            <Panel title="Loại câu trả lời" description="Từ chối chỉ khi ngoài phạm vi chuyến đi hoặc nhằm làm điều nguy hại.">
              <DistributionBar items={kindDistribution(metrics.data.breakdown)} />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DailyBarChart
              title="Lượt hỏi theo ngày"
              points={metrics.data.daily.map((day) => ({ date: day.date, value: day.questions }))}
              formatValue={formatCount}
            />
            <DailyBarChart
              title="Chi phí theo ngày"
              points={metrics.data.daily.map((day) => ({ date: day.date, value: day.costEstimateVnd }))}
              formatValue={formatVnd}
              barClassName="bg-slate-400 group-hover:bg-slate-600"
            />
          </div>
        </>
      )}
    </section>
  );
}
