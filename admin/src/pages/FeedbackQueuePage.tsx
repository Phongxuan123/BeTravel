import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { feedbackApi } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Select, Textarea } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import type { FeedbackStatus } from '../lib/types';

const LIMIT = 20;

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  pending: 'Chờ xử lý',
  resolved: 'Đã xử lý',
  dismissed: 'Đã bỏ qua',
};

const STATUS_TONE: Record<FeedbackStatus, 'warn' | 'success' | 'neutral'> = {
  pending: 'warn',
  resolved: 'success',
  dismissed: 'neutral',
};

/*
 * A08 Feedback Queue (B5) -- hang doi "Bao sai" tu app mobile. Muc dich chinh
 * la de doi noi dung THAY DUOC vi sao AI tra loi nhu vay (cau hoi + cau tra
 * loi that + chunk da truy hoi), roi quyet dinh sua bai luat hay bo qua bao
 * cao sai. Feedback KHONG tu dong sua knowledge base (DoD B5).
 */
export default function FeedbackQueuePage() {
  const [status, setStatus] = useState<FeedbackStatus | ''>('pending');
  const [countryCode, setCountryCode] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'feedback', status, countryCode, page],
    queryFn: () => feedbackApi.list({ status: status || undefined, countryCode: countryCode || undefined, page, limit: LIMIT }),
  });

  const items = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Feedback Queue" description={'Báo cáo "Báo sai" từ người dùng app -- xem chi tiết rồi quyết định sửa bài luật hay bỏ qua.'} />

      <div className="mb-4 flex items-end gap-3">
        <div className="max-w-xs">
          <Select
            label="Trạng thái"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as FeedbackStatus | '');
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {(Object.keys(STATUS_LABEL) as FeedbackStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="max-w-xs">
          <Select
            label="Quốc gia"
            value={countryCode}
            onChange={(e) => {
              setCountryCode(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {['KR', 'JP', 'TH', 'SG'].map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && !error && items.length === 0 && <EmptyState label="Chưa có báo cáo nào" />}

      {items.length > 0 && (
        <>
          <Table>
            <Thead>
              <Th>Thời gian</Th>
              <Th>Quốc gia</Th>
              <Th>Câu hỏi</Th>
              <Th>Ghi chú người dùng</Th>
              <Th>Trạng thái</Th>
              <Th></Th>
            </Thead>
            <Tbody>
              {items.map((f) => (
                <tr key={f._id}>
                  <Td className="whitespace-nowrap text-muted">{new Date(f.createdAt).toLocaleString('vi-VN')}</Td>
                  <Td>{f.context.countryCode || '—'}</Td>
                  <Td className="max-w-xs">
                    <span className="block truncate" title={f.context.question}>
                      {f.context.question || '—'}
                    </span>
                  </Td>
                  <Td className="max-w-xs text-muted">
                    <span className="block truncate" title={f.note}>
                      {f.rating === 'down' ? <ThumbsDown size={14} className="mr-1 inline text-danger" /> : <ThumbsUp size={14} className="mr-1 inline text-success" />}
                      {f.note || '(không có ghi chú)'}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={STATUS_TONE[f.status]}>{STATUS_LABEL[f.status]}</Badge>
                  </Td>
                  <Td>
                    <Button variant="secondary" onClick={() => setDetailId(f._id)}>
                      Xem chi tiết
                    </Button>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
          {data?.meta && <Pagination page={data.meta.page} limit={data.meta.limit} total={data.meta.total} onPageChange={setPage} />}
        </>
      )}

      {detailId && <FeedbackDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function FeedbackDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [reviewerNote, setReviewerNote] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'feedback', 'detail', id],
    queryFn: () => feedbackApi.get(id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: FeedbackStatus) => feedbackApi.updateStatus(id, { status, reviewerNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
      onClose();
    },
  });

  const detail = data?.data;

  return (
    <Modal open title="Chi tiết báo cáo" onClose={onClose}>
      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được chi tiết'} />}

      {detail && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs font-medium text-muted">Câu hỏi</div>
            <div className="text-sm text-ink">{detail.feedback.context.question || '—'}</div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted">Câu trả lời của AI</div>
            <div className="whitespace-pre-wrap rounded-md border border-line bg-slate-50 p-3 text-sm text-ink">
              {detail.message?.text ?? '(tin nhắn không còn tồn tại)'}
            </div>
          </div>

          {detail.message && detail.message.citations.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted">Nguồn đã trích dẫn</div>
              <div className="flex flex-col gap-1">
                {detail.message.citations.map((c) => (
                  <Link
                    key={c.marker}
                    to={`/articles/${c.articleId}`}
                    className="text-sm text-brand hover:underline"
                  >
                    [{c.marker}] {c.title} -- {c.heading}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {detail.message && (
            <div className="text-xs text-muted">
              topScore: {detail.message.retrieval.topScore.toFixed(3)} · model: {detail.message.model || '—'}
              {detail.message.fallbackReason && ` · fallbackReason: ${detail.message.fallbackReason}`}
            </div>
          )}

          <div>
            <div className="text-xs font-medium text-muted">Ghi chú người dùng ({detail.feedback.rating === 'down' ? 'Không hữu ích' : 'Hữu ích'})</div>
            <div className="text-sm text-ink">{detail.feedback.note || '(không có ghi chú)'}</div>
          </div>

          <Textarea
            label="Ghi chú của reviewer"
            value={reviewerNote}
            onChange={(e) => setReviewerNote(e.target.value)}
            rows={3}
            placeholder="Ví dụ: đã sửa bài luật XYZ, mức phạt cập nhật theo nghị định mới."
          />

          {statusMutation.isError && (
            <div className="rounded-md border border-danger-line bg-red-50 px-3 py-2 text-sm text-danger">
              {statusMutation.error instanceof ApiError ? statusMutation.error.message : 'Không cập nhật được'}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" loading={statusMutation.isPending} onClick={() => statusMutation.mutate('dismissed')}>
              Bỏ qua
            </Button>
            <Button loading={statusMutation.isPending} onClick={() => statusMutation.mutate('resolved')}>
              Đánh dấu đã xử lý
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
