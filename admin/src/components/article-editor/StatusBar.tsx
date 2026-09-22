import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import type { ContentStatus } from '../../lib/types';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Field';
import { ErrorState } from '../ui/Feedback';

// Cac buoc chuyen tiep hop ly tu moi trang thai -- may trang thai that (validate
// dieu kien publish) nam o backend, day chi goi y UI dung buoc.
const NEXT_STATUS: Record<ContentStatus, { status: ContentStatus; label: string }[]> = {
  draft: [{ status: 'pending_review', label: 'Gửi duyệt' }],
  pending_review: [
    { status: 'published', label: 'Xuất bản' },
    { status: 'draft', label: 'Trả về bản nháp' },
  ],
  published: [{ status: 'archived', label: 'Lưu trữ' }],
  superseded: [{ status: 'archived', label: 'Lưu trữ' }],
  archived: [{ status: 'draft', label: 'Mở lại làm bản nháp' }],
};

type Props = {
  status: ContentStatus;
  isCurrent: boolean;
  changingStatus: boolean;
  statusError: string | null;
  onChangeStatus: (status: ContentStatus, note?: string) => void;
  onNewVersion: () => void;
  newVersionLoading: boolean;
  canCreateNewVersion: boolean;
};

export function StatusBar({
  status,
  isCurrent,
  changingStatus,
  statusError,
  onChangeStatus,
  onNewVersion,
  newVersionLoading,
  canCreateNewVersion,
}: Props) {
  const [pendingStatus, setPendingStatus] = useState<ContentStatus | null>(null);
  const [note, setNote] = useState('');

  const openConfirm = (target: ContentStatus) => {
    setNote('');
    setPendingStatus(target);
  };

  const confirm = () => {
    if (!pendingStatus) return;
    onChangeStatus(pendingStatus, note || undefined);
    setPendingStatus(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-4 py-3">
      <StatusBadge status={status} />
      {isCurrent && <span className="text-xs text-brand">Đang hiển thị cho người dùng (isCurrent)</span>}

      <div className="ml-auto flex gap-2">
        {canCreateNewVersion && (
          <Button variant="secondary" iconLeft={<GitBranch size={16} />} loading={newVersionLoading} onClick={onNewVersion}>
            Tạo phiên bản mới
          </Button>
        )}
        {NEXT_STATUS[status].map((next) => (
          <Button key={next.status} variant={next.status === 'published' ? 'primary' : 'secondary'} onClick={() => openConfirm(next.status)}>
            {next.label}
          </Button>
        ))}
      </div>

      <Modal open={pendingStatus !== null} title="Xác nhận đổi trạng thái" onClose={() => setPendingStatus(null)}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Chuyển trạng thái sang <StatusBadge status={pendingStatus ?? status} />?
          </p>
          <Textarea label="Ghi chú (tuỳ chọn)" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          {statusError && <ErrorState message={statusError} />}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingStatus(null)}>
              Huỷ
            </Button>
            <Button loading={changingStatus} onClick={confirm}>
              Xác nhận
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
