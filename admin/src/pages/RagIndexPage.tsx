import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { ragApi } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { Badge } from '../components/ui/Badge';
import type { RagIndexState } from '../lib/types';

const COUNTRIES = ['KR', 'JP', 'TH', 'SG'];

const STATUS_TONE: Record<RagIndexState['status'], 'brand' | 'warn' | 'danger' | 'neutral'> = {
  indexed: 'brand',
  indexing: 'warn',
  queued: 'warn',
  failed: 'danger',
  not_indexed: 'neutral',
};

const STATUS_LABEL: Record<RagIndexState['status'], string> = {
  indexed: 'Đã index',
  indexing: 'Đang index',
  queued: 'Trong hàng đợi',
  failed: 'Lỗi',
  not_indexed: 'Chưa index',
};

/*
 * A04 RAG Index (B4) -- xem trang thai index cua tung bai luat da published,
 * bam re-index lai toan bo mot quoc gia khi nghi ngo du lieu RAG bi lech
 * (doi embedding model, hoac job reindex_article that bai). Chi hien thi bai
 * published+isCurrent -- day la nhung bai DUY NHAT duoc dua vao ket qua RAG
 * that (xem backend/src/services/ragAdmin.service.js).
 */
export default function RagIndexPage() {
  const [countryCode, setCountryCode] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'rag', 'status', countryCode],
    queryFn: () => ragApi.status(countryCode || undefined),
    refetchInterval: 5000, // job worker chay ngam -- tu lam moi de thay trang thai chuyen queued -> indexed
  });

  const reindexMutation = useMutation({
    mutationFn: (code: string) => ragApi.reindexCountry(code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'rag', 'status'] }),
  });

  const articles = data?.data ?? [];

  return (
    <div>
      <PageHeader title="RAG Index" description="Trạng thái chunk hoá + embedding của các bài luật đã xuất bản, dùng cho trợ lý AI." />

      <div className="mb-4 flex items-end gap-3">
        <div className="max-w-xs">
          <Select label="Quốc gia" value={countryCode} onChange={(e) => setCountryCode(e.target.value)}>
            <option value="">Tất cả</option>
            {COUNTRIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="secondary"
          iconLeft={<RefreshCw size={16} />}
          loading={reindexMutation.isPending}
          disabled={!countryCode}
          onClick={() => countryCode && reindexMutation.mutate(countryCode)}
        >
          Re-index {countryCode || '(chọn quốc gia trước)'}
        </Button>
      </div>

      {reindexMutation.isSuccess && (
        <div className="mb-4 rounded-md border border-line bg-blue-50 px-3 py-2 text-sm text-ink">
          Đã xếp {reindexMutation.data.data.queued} bài vào hàng đợi re-index. Trạng thái sẽ tự cập nhật bên dưới.
        </div>
      )}
      {reindexMutation.isError && (
        <div className="mb-4 rounded-md border border-danger-line bg-red-50 px-3 py-2 text-sm text-danger">
          {reindexMutation.error instanceof ApiError ? reindexMutation.error.message : 'Không xếp được hàng đợi re-index'}
        </div>
      )}

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && !error && articles.length === 0 && <EmptyState label="Chưa có bài luật nào đã xuất bản" />}

      {articles.length > 0 && (
        <Table>
          <Thead>
            <Th>Bài luật</Th>
            <Th>Quốc gia</Th>
            <Th>Chủ đề</Th>
            <Th>Trạng thái index</Th>
            <Th>Số chunk</Th>
            <Th>Index lần cuối</Th>
            <Th>Model embedding</Th>
          </Thead>
          <Tbody>
            {articles.map((a) => (
              <tr key={a._id}>
                <Td className="font-medium">{a.title}</Td>
                <Td>{a.countryCode}</Td>
                <Td className="text-muted">{a.topicSlug}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[a.indexState.status]}>{STATUS_LABEL[a.indexState.status]}</Badge>
                  {a.indexState.status === 'failed' && a.indexState.error && (
                    <div className="mt-1 max-w-xs truncate text-xs text-danger" title={a.indexState.error}>
                      {a.indexState.error}
                    </div>
                  )}
                </Td>
                <Td>{a.indexState.chunkCount}</Td>
                <Td className="whitespace-nowrap text-muted">
                  {a.indexState.lastIndexedAt ? new Date(a.indexState.lastIndexedAt).toLocaleString('vi-VN') : '—'}
                </Td>
                <Td className="text-muted">{a.indexState.embeddingModel || '—'}</Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
