import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assistantAdminApi } from '../../lib/api';
import { ApiError } from '../../lib/apiClient';
import type { AssistantKind, AssistantSourceTier } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Field';
import { EmptyState, ErrorState, LoadingState } from '../ui/Feedback';
import { Pagination } from '../ui/Pagination';
import { Table, Tbody, Td, Th, Thead } from '../ui/Table';

const LIMIT = 20;

const KIND_LABEL: Record<AssistantKind, string> = {
  answer: 'Trả lời',
  emergency: 'Khẩn cấp',
  clarify: 'Hỏi lại',
  refuse_scope: 'Ngoài phạm vi',
  refuse_harm: 'Từ chối (nguy hại)',
};

const TIER_LABEL: Record<AssistantSourceTier, string> = {
  official: 'Nguồn chính thức',
  web: 'Tra cứu web',
  general: 'Kiến thức chung',
};

const TIER_TONE: Record<AssistantSourceTier, 'success' | 'brand' | 'warn'> = {
  official: 'success',
  web: 'brand',
  general: 'warn',
};

const isRefusal = (kind: AssistantKind | null) => kind === 'refuse_scope' || kind === 'refuse_harm';

/*
 * Nhat ky hoi-dap (H1). Noi dung da duoc BACKEND an email/so dien thoai/so giay to truoc khi
 * gui ve; bang khong co cot nguoi hoi vi API khong tra thong tin do.
 */
export function QaLogTable() {
  const [kind, setKind] = useState<AssistantKind | ''>('');
  const [sourceTier, setSourceTier] = useState<AssistantSourceTier | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'assistant', 'messages', kind, sourceTier, page],
    queryFn: () =>
      assistantAdminApi.messages({ kind: kind || undefined, sourceTier: sourceTier || undefined, page, limit: LIMIT }),
  });
  const items = data?.data ?? [];

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold text-ink">Nhật ký hỏi - đáp</h2>
      <p className="mb-3 text-xs text-muted">
        Email, số điện thoại, số giấy tờ và dãy số dài đã được ẩn tự động. Không hiển thị thông tin người hỏi.
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            label="Loại"
            value={kind}
            onChange={(e) => {
              setKind(e.target.value as AssistantKind | '');
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {(Object.keys(KIND_LABEL) as AssistantKind[]).map((value) => (
              <option key={value} value={value}>
                {KIND_LABEL[value]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-48">
          <Select
            label="Tầng nguồn"
            value={sourceTier}
            onChange={(e) => {
              setSourceTier(e.target.value as AssistantSourceTier | '');
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            {(Object.keys(TIER_LABEL) as AssistantSourceTier[]).map((value) => (
              <option key={value} value={value}>
                {TIER_LABEL[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được nhật ký'} />}
      {!isLoading && !error && items.length === 0 && <EmptyState label="Chưa có câu hỏi nào" />}

      {items.length > 0 && (
        <>
          <Table>
            <Thead>
              <Th>Thời gian</Th>
              <Th>Câu hỏi / Trả lời</Th>
              <Th>Phân loại</Th>
              <Th>Nguồn</Th>
              <Th>Vận hành</Th>
            </Thead>
            <Tbody>
              {items.map((item) => (
                <tr key={item.id} className="align-top">
                  <Td className="whitespace-nowrap text-muted">
                    {new Date(item.createdAt).toLocaleString('vi-VN')}
                    {item.countryCode && <div className="text-xs">{item.countryCode}</div>}
                  </Td>
                  <Td className="min-w-[18rem] max-w-xl">
                    <div className="font-medium">{item.question || '(không tìm thấy câu hỏi)'}</div>
                    <details className="mt-1 text-muted">
                      <summary className="cursor-pointer text-xs text-brand">Xem câu trả lời</summary>
                      <p className="mt-1 whitespace-pre-wrap text-ink">{item.answer}</p>
                    </details>
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      {item.kind && (
                        <Badge tone={isRefusal(item.kind) ? 'danger' : 'neutral'}>{KIND_LABEL[item.kind]}</Badge>
                      )}
                      {item.sourceTier && (
                        <Badge tone={TIER_TONE[item.sourceTier]}>{TIER_LABEL[item.sourceTier]}</Badge>
                      )}
                      {item.detailed && <span className="text-xs text-muted">Bản chi tiết</span>}
                    </div>
                  </Td>
                  <Td className="max-w-xs text-xs">
                    {item.citations.length === 0 ? (
                      <span className="text-muted">Không trích dẫn</span>
                    ) : (
                      <ol className="flex flex-col gap-0.5">
                        {item.citations.map((citation) => (
                          <li key={citation.n}>
                            [{citation.n}] {citation.title}
                          </li>
                        ))}
                      </ol>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-muted">
                    {item.telemetry ? (
                      <div className="flex flex-col gap-0.5">
                        <span>{(item.telemetry.latencyMs / 1000).toFixed(1)} s</span>
                        <span>
                          {item.telemetry.promptTokens} / {item.telemetry.completionTokens} token
                        </span>
                        <span>{item.telemetry.costEstimateVnd.toLocaleString('vi-VN')} đ</span>
                        <span className={item.telemetry.guardViolations > 0 ? 'text-danger' : ''}>
                          Hậu kiểm: {item.telemetry.guardViolations} vi phạm
                        </span>
                      </div>
                    ) : (
                      'Không có số liệu'
                    )}
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
          {data?.meta && (
            <Pagination page={data.meta.page} limit={data.meta.limit} total={data.meta.total} onPageChange={setPage} />
          )}
        </>
      )}
    </section>
  );
}
