import { useQuery } from '@tanstack/react-query';
import { FileText, Globe2, MapPin, AlertOctagon } from 'lucide-react';
import { dashboardApi } from '../lib/api';
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

function StatCard({ icon: Icon, label, value, tone = 'brand' }: { icon: typeof FileText; label: string; value: number; tone?: 'brand' | 'danger' }) {
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
        </div>
      )}
    </div>
  );
}
