import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, Trash2 } from 'lucide-react';
import { ragApi } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Table, Thead, Th, Tbody, Td } from './ui/Table';
import { LoadingState, ErrorState } from './ui/Feedback';
import type { AuLawRagStatus } from '../lib/types';

const JOB_LABEL: Record<NonNullable<AuLawRagStatus['job']>['status'], string> = {
  pending: 'Trong hàng đợi',
  running: 'Đang index',
  done: 'Job xong',
  failed: 'Job lỗi',
};
const JOB_TONE: Record<NonNullable<AuLawRagStatus['job']>['status'], 'brand' | 'warn' | 'danger' | 'neutral'> = {
  pending: 'warn',
  running: 'warn',
  done: 'neutral',
  failed: 'danger',
};
const isJobActive = (law: AuLawRagStatus) => law.job?.status === 'pending' || law.job?.status === 'running';

/*
 * Luật liên bang Úc trong RAG: nguồn luật gốc (chưa được Be.Travel kiểm chứng) mà trợ lý AI được trích dẫn
 * sau khi Admin cho index. Index tốn lượt embedding (gói miễn phí 100 lượt/phút), luật lớn mất vài chục
 * phút nên chạy nền qua hàng đợi job; trang tự làm mới trạng thái.
 */
export function AuLawsRagPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'rag', 'au-laws'],
    queryFn: () => ragApi.auLaws(),
    refetchInterval: 5000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'rag', 'au-laws'] });

  const indexMutation = useMutation({ mutationFn: (titleIds: string[]) => ragApi.indexAuLaws(titleIds), onSuccess: refresh });
  const removeMutation = useMutation({ mutationFn: (titleId: string) => ragApi.removeAuLaw(titleId), onSuccess: refresh });

  const laws = data?.data ?? [];
  const indexedCount = laws.filter((law) => law.index).length;
  const mutationError = indexMutation.error ?? removeMutation.error;

  return (
    <section className="mt-10" aria-labelledby="au-laws-rag-title">
      <h2 id="au-laws-rag-title" className="text-lg font-semibold text-ink">
        Luật liên bang Úc cho trợ lý AI
      </h2>
      <p className="mb-3 mt-1 text-sm text-muted">
        Đã index {indexedCount}/{laws.length} luật. Chỉ gồm luật Commonwealth đã tuyển chọn; AI trích dẫn nguyên văn từ Federal
        Register of Legislation và ghi rõ chưa được Be.Travel kiểm chứng. Index tốn lượt embedding, luật lớn chạy nền vài chục phút.
      </p>

      {mutationError && (
        <div className="mb-3 rounded-md border border-danger-line bg-red-50 px-3 py-2 text-sm text-danger">
          {mutationError instanceof ApiError ? mutationError.message : 'Thao tác thất bại'}
        </div>
      )}
      {indexMutation.isSuccess && (
        <div className="mb-3 rounded-md border border-line bg-blue-50 px-3 py-2 text-sm text-ink">
          Đã xếp {indexMutation.data.data.queued.length} luật vào hàng đợi
          {indexMutation.data.data.skipped.length > 0 ? `, bỏ qua ${indexMutation.data.data.skipped.length} luật đang chạy` : ''}.
        </div>
      )}

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được danh sách luật Úc'} />}

      {laws.length > 0 && (
        <Table>
          <Thead>
            <Th>Luật</Th>
            <Th>Mục</Th>
            <Th>Trạng thái index</Th>
            <Th>Số chunk</Th>
            <Th>Hành động</Th>
          </Thead>
          <Tbody>
            {laws.map((law) => (
              <tr key={law.titleId}>
                <Td>
                  <div className="font-medium">{law.name ?? law.titleId}</div>
                  <div className="text-xs text-muted">{law.titleId}</div>
                </Td>
                <Td className="text-muted">{law.topics.join(', ')}</Td>
                <Td>
                  <div className="flex flex-col items-start gap-1">
                    <Badge tone={law.index ? 'brand' : 'neutral'}>{law.index ? 'Đã index' : 'Chưa index'}</Badge>
                    {law.job && <Badge tone={JOB_TONE[law.job.status]}>{JOB_LABEL[law.job.status]}</Badge>}
                    {law.job?.status === 'failed' && law.job.lastError && (
                      <span className="max-w-xs truncate text-xs text-danger" title={law.job.lastError}>
                        {law.job.lastError}
                      </span>
                    )}
                  </div>
                </Td>
                <Td>{law.index?.chunks ?? '—'}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      iconLeft={<Database size={16} />}
                      disabled={isJobActive(law) || indexMutation.isPending}
                      onClick={() => indexMutation.mutate([law.titleId])}
                    >
                      {law.index ? 'Index lại' : 'Index'}
                    </Button>
                    {law.index && (
                      <Button
                        variant="secondary"
                        iconLeft={<Trash2 size={16} />}
                        disabled={removeMutation.isPending}
                        onClick={() =>
                          window.confirm(`Xoá khỏi RAG mọi điều luật của "${law.name ?? law.titleId}"? AI sẽ không trích dẫn luật này nữa.`) &&
                          removeMutation.mutate(law.titleId)
                        }
                      >
                        Xoá
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </section>
  );
}
