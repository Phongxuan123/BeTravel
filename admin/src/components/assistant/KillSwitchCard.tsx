import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Power, ShieldAlert } from 'lucide-react';
import { assistantAdminApi } from '../../lib/api';
import { ApiError } from '../../lib/apiClient';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ErrorState, LoadingState } from '../ui/Feedback';

const SETTINGS_KEY = ['admin', 'assistant', 'settings'];

const errorMessage = (error: unknown, fallback: string) => (error instanceof ApiError ? error.message : fallback);

/*
 * Cong tac tat nhanh tro ly AI (H1). Env ASSISTANT_ENABLED la khoa chinh: env tat thi nut bi
 * vo hieu va hien ro ly do -- backend cung tu choi (409), an nut chi la phu tro.
 */
export function KillSwitchCard() {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => assistantAdminApi.settings().then((res) => res.data),
  });
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => assistantAdminApi.setEnabled(enabled).then((res) => res.data),
    onSuccess: (data) => queryClient.setQueryData(SETTINGS_KEY, data),
  });

  if (settings.isLoading) return <LoadingState />;
  if (settings.error || !settings.data) {
    return <ErrorState message={errorMessage(settings.error, 'Không tải được trạng thái trợ lý')} />;
  }

  const { active, enabled, envEnabled, updatedAt } = settings.data;
  const onToggle = () => {
    const next = !enabled;
    const confirmed =
      next || window.confirm('Tắt trợ lý AI ngay cho mọi người dùng? Câu hỏi mới sẽ bị từ chối cho tới khi bật lại.');
    if (confirmed) toggle.mutate(next);
  };

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-md ${active ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'}`}>
            <Power size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              Công tắc trợ lý AI
              <Badge tone={active ? 'success' : 'danger'}>{active ? 'Đang hoạt động' : 'Đang tắt'}</Badge>
            </div>
            <div className="text-xs text-muted">
              {updatedAt ? `Đổi lần cuối: ${new Date(updatedAt).toLocaleString('vi-VN')}` : 'Chưa đổi lần nào'}
            </div>
          </div>
        </div>
        <Button
          variant={enabled ? 'danger' : 'primary'}
          loading={toggle.isPending}
          disabled={!envEnabled}
          onClick={onToggle}
        >
          {enabled ? 'Tắt trợ lý' : 'Bật trợ lý'}
        </Button>
      </div>

      {!envEnabled && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-warn-tint px-3 py-2 text-sm text-warn">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" />
          Máy chủ đang đặt ASSISTANT_ENABLED=false nên trợ lý tắt hoàn toàn. Không bật được từ Admin; cần đổi cấu hình
          máy chủ.
        </div>
      )}
      {toggle.error && (
        <div className="mt-3">
          <ErrorState message={errorMessage(toggle.error, 'Không đổi được trạng thái')} />
        </div>
      )}
    </div>
  );
}
