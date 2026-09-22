import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Field';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { Badge } from '../components/ui/Badge';

const ENTITY_TYPES = ['LegalArticle', 'Country', 'LegalTopic', 'SupportLocation'];
const LIMIT = 20;

const ACTION_TONE: Record<string, 'brand' | 'warn' | 'danger'> = {
  CREATE: 'brand',
  UPDATE: 'warn',
  DELETE: 'danger',
  STATUS_CHANGE: 'warn',
};

export default function AuditPage() {
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'audit', entityType, page],
    queryFn: () => auditApi.list({ entityType: entityType || undefined, page, limit: LIMIT }),
  });

  const logs = data?.data ?? [];

  return (
    <div>
      <PageHeader title="Nhật ký thao tác" description="Mọi thao tác ghi (tạo/sửa/xoá/đổi trạng thái) trên dữ liệu quản trị." />

      <div className="mb-4 max-w-xs">
        <Select
          label="Lọc theo loại đối tượng"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && logs.length === 0 && <EmptyState label="Chưa có nhật ký nào" />}

      {logs.length > 0 && (
        <>
          <Table>
            <Thead>
              <Th>Thời gian</Th>
              <Th>Hành động</Th>
              <Th>Đối tượng</Th>
              <Th>Actor</Th>
              <Th>IP</Th>
            </Thead>
            <Tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <Td className="whitespace-nowrap text-muted">{new Date(log.createdAt).toLocaleString('vi-VN')}</Td>
                  <Td>
                    <Badge tone={ACTION_TONE[log.action] ?? 'neutral'}>{log.action}</Badge>
                  </Td>
                  <Td>
                    <span className="font-medium">{log.entityType}</span>{' '}
                    <span className="font-mono text-xs text-muted">{log.entityId}</span>
                  </Td>
                  <Td className="font-mono text-xs">{log.actorId}</Td>
                  <Td className="text-muted">{log.ip}</Td>
                </tr>
              ))}
            </Tbody>
          </Table>
          {data?.meta && <Pagination page={data.meta.page} limit={data.meta.limit} total={data.meta.total} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
