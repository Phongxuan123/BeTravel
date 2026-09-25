import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { incidentsApi, countriesApi } from '../lib/api';
import type { IncidentStatus } from '../lib/types';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Field';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { Badge, StatusBadge } from '../components/ui/Badge';

export default function IncidentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: countriesRes } = useQuery({ queryKey: ['admin', 'countries'], queryFn: () => countriesApi.list({ limit: 100 }) });
  const countries = countriesRes?.data ?? [];

  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | ''>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'incidents', countryFilter, statusFilter],
    queryFn: () => incidentsApi.list({ countryCode: countryFilter || undefined, status: statusFilter || undefined, limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => incidentsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'incidents'] }),
  });

  const incidents = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Xử lý sự cố"
        description="Hướng dẫn từng bước cho các tình huống khẩn cấp -- quốc gia để trống áp dụng cho mọi quốc gia."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => navigate('/incidents/new')}>
            Soạn hướng dẫn mới
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select label="Quốc gia" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
          <option value="">Tất cả (gồm toàn cục)</option>
          {countries.map((c) => (
            <option key={c._id} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </Select>
        <Select label="Trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as IncidentStatus | '')}>
          <option value="">Tất cả</option>
          <option value="draft">Bản nháp</option>
          <option value="published">Đã xuất bản</option>
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && incidents.length === 0 && <EmptyState label="Chưa có hướng dẫn xử lý sự cố nào" />}

      {incidents.length > 0 && (
        <Table>
          <Thead>
            <Th>Quốc gia</Th>
            <Th>Tiêu đề</Th>
            <Th>Số bước</Th>
            <Th>Khẩn cấp</Th>
            <Th>Trạng thái</Th>
            <Th></Th>
          </Thead>
          <Tbody>
            {incidents.map((incident) => (
              <tr key={incident._id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/incidents/${incident._id}`)}>
                <Td className="font-mono">{incident.countryCode ?? 'Toàn cục'}</Td>
                <Td className="font-medium">{incident.title}</Td>
                <Td>{incident.steps.length}</Td>
                <Td>{incident.urgent && <Badge tone="danger">Khẩn</Badge>}</Td>
                <Td>
                  <StatusBadge status={incident.status} />
                </Td>
                <Td className="text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Xoá hướng dẫn "${incident.title}"?`)) deleteMutation.mutate(incident._id);
                    }}
                    className="rounded p-1.5 text-muted hover:bg-danger-tint hover:text-danger"
                    aria-label="Xoá"
                  >
                    <Trash2 size={16} />
                  </button>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
