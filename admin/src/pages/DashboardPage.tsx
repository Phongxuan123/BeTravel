import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, Globe2, MapPin, AlertOctagon, MessagesSquare, TriangleAlert, Clock, MessageSquareWarning } from 'lucide-react';
import { dashboardApi, analyticsApi } from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { LoadingState, ErrorState } from '../components/ui/Feedback';
import { ApiError } from '../lib/apiClient';
import type { ContentStatus } from '../lib/types';

const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: 'Bản nháp',
  pending_review: 'Chờ duyệt',
  published: 'Đã xuất bản',
  superseded: 'Đã thay thế',
  archived: 'Lưu trữ',
};

function StatCard({ icon: Icon, label, value, tone = 'brand' }: { icon: typeof FileText; label: string; value: number | string; tone?: 'brand' | 'danger' }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${tone === 'danger' ? 'bg-danger-tint text-danger' : 'bg-blue-50 text-brand'}`}>
          <Icon size={18} />
        </div>
        <div>
          <div className="text-xl font-semibold text-ink">{value}</div>
          <div className="text-xs text-muted">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => dashboardApi.get().then((res) => res.data),
  });

  // So lieu AI rieng (B5) -- tu ai_events, 7 ngay gan nhat. Query rieng vi co
  // the that bai doc lap (vi du chua co du lieu chat nao) ma khong chan phan
  // dashboard noi dung o tren.
  const analytics = useQuery({
    queryKey: ['admin', 'analytics', 'overview'],
    queryFn: () => analyticsApi.overview(7).then((res) => res.data),
  });

  return (
    <div>
      <PageHeader title="Dashboard" description="Tổng quan nội dung và vận hành." />

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}

      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard icon={FileText} label="Tổng số bài luật" value={data.articlesTotal} />
            <StatCard icon={Globe2} label="Quốc gia" value={data.countryCount} />
            <StatCard icon={MapPin} label="Điểm hỗ trợ" value={data.locationCount} />
            <StatCard icon={AlertOctagon} label="Job thất bại" value={data.failedJobCount} tone={data.failedJobCount > 0 ? 'danger' : 'brand'} />
          </div>

          <div className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Bài luật theo trạng thái</h2>
            <div className="flex flex-col gap-2">
              {(Object.entries(data.articlesByStatus) as [ContentStatus, number][]).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{STATUS_LABEL[status]}</span>
                  <span className="font-medium text-ink">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-ink">Trợ lý AI (7 ngày gần nhất)</h2>

            {analytics.isLoading && <LoadingState />}
            {analytics.error && (
              <ErrorState message={analytics.error instanceof ApiError ? analytics.error.message : 'Không tải được số liệu AI'} />
            )}

            {analytics.data && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <StatCard icon={MessagesSquare} label="Lượt chat" value={analytics.data.totalChats} />
                  <StatCard
                    icon={TriangleAlert}
                    label="Tỉ lệ fallback"
                    value={`${Math.round(analytics.data.fallbackRate * 100)}%`}
                    tone={analytics.data.fallbackRate > 0.3 ? 'danger' : 'brand'}
                  />
                  <StatCard icon={Clock} label="Độ trễ TB (ms)" value={analytics.data.avgLatencyMs} />
                  <Link to="/feedback">
                    <StatCard
                      icon={MessageSquareWarning}
                      label="Feedback chờ xử lý"
                      value={analytics.data.pendingFeedbackCount}
                      tone={analytics.data.pendingFeedbackCount > 0 ? 'danger' : 'brand'}
                    />
                  </Link>
                </div>

                {analytics.data.topFallbackQuestions.length > 0 && (
                  <div className="rounded-lg border border-line bg-white p-4">
                    <h3 className="mb-1 text-sm font-semibold text-ink">Top câu hỏi bị fallback</h3>
                    <p className="mb-3 text-xs text-muted">
                      Danh sách việc cần nhập liệu bổ sung -- những câu hỏi này AI chưa có đủ nguồn để trả lời.
                    </p>
                    <div className="flex flex-col gap-2">
                      {analytics.data.topFallbackQuestions.map((q, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="truncate text-ink" title={q.question}>
                            {q.question}
                          </span>
                          <span className="ml-3 shrink-0 font-medium text-muted">{q.count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
