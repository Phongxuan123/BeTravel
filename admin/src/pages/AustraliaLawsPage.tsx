import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { australiaLawsApi } from '../lib/api';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Badge } from '../components/ui/Badge';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { AU_SCOPE_NOTICE } from '../lib/auLaws';

const LIMIT = 20;

// Gia tri collection khop dung ten nguon (da doi chieu so luong ban ghi tren API that).
const COLLECTION_OPTIONS = [
  { value: 'Act', label: 'Đạo luật (Act)' },
  { value: 'LegislativeInstrument', label: 'Văn bản dưới luật (Legislative Instrument)' },
  { value: 'NotifiableInstrument', label: 'Văn bản thông báo (Notifiable Instrument)' },
  { value: 'Gazette', label: 'Công báo (Gazette)' },
];

export default function AustraliaLawsPage() {
  const navigate = useNavigate();
  const [draftQuery, setDraftQuery] = useState('');
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('Act');
  const [topic, setTopic] = useState('');
  const [inForce, setInForce] = useState(true);
  const [page, setPage] = useState(1);

  const { data: topicsRes } = useQuery({ queryKey: ['au-law-topics'], queryFn: () => australiaLawsApi.topics() });
  const topics = topicsRes?.data ?? [];
  const activeTopic = topics.find((item) => item.slug === topic);

  const { data, isLoading, error } = useQuery({
    queryKey: ['au-laws', query, collection, topic, inForce, page],
    queryFn: () =>
      australiaLawsApi.list({ q: query || undefined, collection: collection || undefined, topic: topic || undefined, inForce, page, limit: LIMIT }),
  });

  const laws = data?.data ?? [];
  const total = data?.meta?.total ?? 0;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setQuery(draftQuery.trim());
    setPage(1);
  };

  return (
    <div>
      <PageHeader title="Luật Úc" description="Tra cứu luật liên bang Úc từ nguồn chính thức (chỉ đọc)." />

      <p className="mb-4 rounded-md bg-warn-tint px-4 py-3 text-sm text-warn">{AU_SCOPE_NOTICE}</p>

      <form onSubmit={onSubmit} className="mb-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Input
            label="Tìm theo tên văn bản (tiếng Anh)"
            placeholder="vd: immigration, migration, customs"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
          />
        </div>
        <Select
          label="Mục"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả mục</option>
          {topics.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.label} ({item.lawCount})
            </option>
          ))}
        </Select>
        <Select
          label="Loại văn bản"
          disabled={Boolean(topic)}
          hint={topic ? 'Trong một mục không lọc theo loại' : undefined}
          value={collection}
          onChange={(e) => {
            setCollection(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          {COLLECTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <div className="flex items-end gap-2">
          <Select
            label="Hiệu lực"
            value={String(inForce)}
            onChange={(e) => {
              setInForce(e.target.value === 'true');
              setPage(1);
            }}
          >
            <option value="true">Đang có hiệu lực</option>
            <option value="false">Cả đã hết hiệu lực</option>
          </Select>
          <Button type="submit" iconLeft={<Search size={16} />}>
            Tìm
          </Button>
        </div>
      </form>

      {activeTopic && <p className="mb-3 text-sm text-muted">{activeTopic.note}</p>}

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && !error && laws.length === 0 && <EmptyState label="Không có văn bản nào khớp" />}

      {laws.length > 0 && (
        <>
          <Table>
            <Thead>
              <Th>Tên văn bản</Th>
              <Th>Mã</Th>
              <Th>Ngày ban hành</Th>
              <Th>Hiệu lực</Th>
            </Thead>
            <Tbody>
              {laws.map((law) => (
                <tr key={law.id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/australia-laws/${law.id}`)}>
                  <Td>{law.name}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs">{law.id}</Td>
                  <Td className="whitespace-nowrap">{law.makingDate ?? '-'}</Td>
                  <Td>
                    <Badge tone={law.isInForce ? 'success' : 'neutral'}>{law.status ?? (law.isInForce ? 'InForce' : '-')}</Badge>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </Table>
          <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
