import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertOctagon, ArrowRight, BookCheck, FileText, Globe2, MapPin, MessagesSquare, Power, ShieldCheck, Timer } from 'lucide-react';
import { assistantAdminApi, dashboardApi } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { CONTENT_STATUS_LABEL, CONTENT_STATUS_TONE } from '../lib/labels';
import { formatCount, formatPercent, formatSeconds, tierDistribution } from '../lib/format';
import type { AssistantMetrics, ContentStatus } from '../lib/types';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/Feedback';
import { StatCard } from '../components/ui/StatCard';
import { Panel } from '../components/ui/Panel';
import { DistributionBar } from '../components/ui/DistributionBar';
import { DailyBarChart } from '../components/assistant/DailyBarChart';

const AI_WINDOW_DAYS = 7;
const KNOWLEDGE_GAP_LIMIT = 5;
const STATUS_ORDER: ContentStatus[] = ['published', 'pending_review', 'draft', 'superseded', 'archived'];

const errorMessage = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

// Ty le cau tra loi co nguon chinh thuc tren tong cau co tang nguon (khong tinh luot tu choi).
function officialShare(breakdown: AssistantMetrics['breakdown']) {
  const { official, web, general } = breakdown.sourceTier;
  const answered = official + web + general;
  return answered > 0 ? official / answered : 0;
}

function HeroBanner({ publishedCount, metrics, active }: { publishedCount: number; metrics?: AssistantMetrics; active?: boolean }) {
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  const highlights = [
    { label: 'Bài luật đang xuất bản', value: formatCount(publishedCount) },
    { label: `Lượt hỏi AI (${AI_WINDOW_DAYS} ngày)`, value: metrics ? formatCount(metrics.totals.questions) : '--' },
    { label: 'Trả lời có nguồn chính thức', value: metrics ? formatPercent(officialShare(metrics.breakdown)) : '--' },
  ];

  return (
    <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand to-sky-500 p-6 text-white shadow-card md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-xs font-medium uppercase tracking-wider text-blue-100 first-letter:uppercase">{today}</div>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">Hỗ trợ pháp lý cho người Việt đi nước ngoài</h2>
          <p className="mt-2 text-sm text-blue-100">
            Kho tri thức đã kiểm chứng, trợ lý AI có trích dẫn nguồn và hỗ trợ tại chỗ khi gặp sự cố.
          </p>
        </div>
        {active !== undefined && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
              active ? 'bg-white/15 ring-white/30' : 'bg-red-500/30 ring-red-200/50'
            }`}
          >
            <Power size={13} />
            {active ? 'Trợ lý AI đang hoạt động' : 'Trợ lý AI đang tắt'}
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {highlights.map((item) => (
          <div key={item.label} className="rounded-xl bg-white/10 p-4 ring-1 ring-inset ring-white/15">
            <div className="text-3xl font-semibold tabular-nums">{item.value}</div>
            <div className="mt-1 text-xs text-blue-100">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// Cau hoi AI chi tra loi duoc bang kien thuc chung --> danh sach viec can nhap them vao kho tri thuc.
function KnowledgeGapPanel() {
  const gaps = useQuery({
    queryKey: ['admin', 'assistant', 'messages', 'general', 'dashboard'],
    queryFn: () => assistantAdminApi.messages({ sourceTier: 'general', page: 1, limit: KNOWLEDGE_GAP_LIMIT }),
  });
  const items = gaps.data?.data ?? [];

  return (
    <Panel
      title="Câu hỏi chưa có nguồn chính thức"
      description="AI phải trả lời bằng kiến thức chung -- gợi ý nội dung cần bổ sung vào kho."
      actions={
        <Link to="/assistant" className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
          Xem tất cả <ArrowRight size={13} />
        </Link>
      }
    >
      {gaps.isLoading && <LoadingState />}
      {gaps.error && <ErrorState message={errorMessage(gaps.error, 'Không tải được nhật ký hỏi - đáp')} />}
      {gaps.data && items.length === 0 && <EmptyState label="Mọi câu hỏi gần đây đều có nguồn" />}
      {items.length > 0 && (
        <ol className="flex flex-col divide-y divide-line">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-start gap-3 py-2.5 text-sm">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-warn-tint text-[11px] font-semibold text-warn">
                {index + 1}
              </span>
              <span className="line-clamp-2 min-w-0 flex-1 text-ink" title={item.question}>
                {item.question || '(không có nội dung)'}
              </span>
              <span className="shrink-0 text-xs text-muted">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => dashboardApi.get().then((res) => res.data),
  });

  // So lieu AI tach query rieng: that bai doc lap ma khong chan phan noi dung o tren.
  const metrics = useQuery({
    queryKey: ['admin', 'assistant', 'metrics', AI_WINDOW_DAYS],
    queryFn: () => assistantAdminApi.metrics(AI_WINDOW_DAYS).then((res) => res.data),
  });
  const settings = useQuery({
    queryKey: ['admin', 'assistant', 'settings'],
    queryFn: () => assistantAdminApi.settings().then((res) => res.data),
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Tổng quan nội dung, vận hành và chất lượng trợ lý AI." />

      {isLoading && <LoadingState />}
      {error && <ErrorState message={errorMessage(error, 'Không tải được dữ liệu')} />}

      {data && (
        <div className="flex flex-col gap-6">
          <HeroBanner publishedCount={data.articlesByStatus.published} metrics={metrics.data} active={settings.data?.active} />

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={FileText} label="Tổng số bài luật" value={formatCount(data.articlesTotal)} />
            <StatCard icon={Globe2} label="Quốc gia" value={formatCount(data.countryCount)} tone="success" />
            <StatCard icon={MapPin} label="Điểm hỗ trợ" value={formatCount(data.locationCount)} tone="warn" />
            <StatCard
              icon={AlertOctagon}
              label="Job thất bại"
              value={formatCount(data.failedJobCount)}
              hint={data.failedJobCount > 0 ? 'Cần kiểm tra trang RAG Index' : 'Hệ thống ổn định'}
              tone={data.failedJobCount > 0 ? 'danger' : 'neutral'}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Bài luật theo trạng thái" description="Chỉ bài đã xuất bản và là bản hiện hành mới đến tay người dùng.">
              <DistributionBar
                items={STATUS_ORDER.map((status) => ({
                  key: status,
                  label: CONTENT_STATUS_LABEL[status],
                  value: data.articlesByStatus[status] ?? 0,
                  tone: CONTENT_STATUS_TONE[status],
                }))}
              />
            </Panel>

            <Panel
              title={`Câu trả lời AI lấy từ đâu (${AI_WINDOW_DAYS} ngày)`}
              description="Nhãn tầng nguồn do code gán theo nguồn thật đã dùng, không do mô hình tự khai."
            >
              {metrics.isLoading && <LoadingState />}
              {metrics.error && <ErrorState message={errorMessage(metrics.error, 'Không tải được số liệu AI')} />}
              {metrics.data && (
                <DistributionBar items={tierDistribution(metrics.data.breakdown)} emptyLabel="Chưa có câu hỏi nào" />
              )}
            </Panel>
          </div>

          {metrics.data && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={MessagesSquare} label="Lượt hỏi AI" value={formatCount(metrics.data.totals.questions)} hint={`${AI_WINDOW_DAYS} ngày gần nhất`} />
              <StatCard icon={BookCheck} label="Có nguồn chính thức" value={formatPercent(officialShare(metrics.data.breakdown))} tone="success" />
              <StatCard icon={ShieldCheck} label="Vi phạm hậu kiểm đã chặn" value={formatCount(metrics.data.totals.guardViolations)} tone="neutral" />
              <StatCard icon={Timer} label="Độ trễ trung vị" value={formatSeconds(metrics.data.totals.p50LatencyMs)} tone="neutral" />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {metrics.data && (
              <DailyBarChart
                title={`Lượt hỏi AI theo ngày (${AI_WINDOW_DAYS} ngày)`}
                points={metrics.data.daily.map((day) => ({ date: day.date, value: day.questions }))}
                formatValue={formatCount}
              />
            )}
            <KnowledgeGapPanel />
          </div>
        </div>
      )}
    </div>
  );
}
