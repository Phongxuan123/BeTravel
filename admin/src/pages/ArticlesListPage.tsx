import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { articlesApi, countriesApi, topicsApi } from '../lib/api';
import type { ContentStatus } from '../lib/types';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { StatusBadge } from '../components/ui/Badge';

const LIMIT = 20;

export default function ArticlesListPage() {
  const navigate = useNavigate();
  const [countryCode, setCountryCode] = useState('');
  const [topicSlug, setTopicSlug] = useState('');
  const [status, setStatus] = useState<ContentStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: countriesRes } = useQuery({ queryKey: ['admin', 'countries'], queryFn: () => countriesApi.list({ limit: 100 }) });
  const countries = countriesRes?.data ?? [];

  const { data: topicsRes } = useQuery({
    queryKey: ['admin', 'topics', countryCode],
    queryFn: () => topicsApi.list({ countryCode: countryCode || undefined, limit: 100 }),
    enabled: Boolean(countryCode),
  });
  const topics = topicsRes?.data ?? [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'articles', countryCode, topicSlug, status, search, page],
    queryFn: () =>
      articlesApi.list({
        countryCode: countryCode || undefined,
        topicSlug: topicSlug || undefined,
        status: status || undefined,
        search: search || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const articles = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Bài luật"
        description="Nội dung pháp lý đã kiểm chứng -- trung tâm sản phẩm."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={() => navigate('/articles/new')}>
            Soạn bài mới
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Select
          label="Quốc gia"
          value={countryCode}
          onChange={(e) => {
            setCountryCode(e.target.value);
            setTopicSlug('');
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          {countries.map((c) => (
            <option key={c._id} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </Select>
        <Select label="Chủ đề" value={topicSlug} onChange={(e) => { setTopicSlug(e.target.value); setPage(1); }} disabled={!countryCode}>
          <option value="">Tất cả</option>
          {topics.map((t) => (
            <option key={t._id} value={t.slug}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select
          label="Trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ContentStatus | '');
            setPage(1);
          }}
        >
          <option value="">Tất cả</option>
          <option value="draft">Bản nháp</option>
          <option value="pending_review">Chờ duyệt</option>
          <option value="published">Đã xuất bản</option>
          <option value="superseded">Đã thay thế</option>
          <option value="archived">Lưu trữ</option>
        </Select>
        <Input
          label="Tìm theo tiêu đề"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && articles.length === 0 && <EmptyState label="Chưa có bài luật nào khớp bộ lọc" />}

      {articles.length > 0 && (
        <>
          <Table>
            <Thead>
              <Th>Quốc gia</Th>
              <Th>Tiêu đề</Th>
              <Th>Chủ đề</Th>
              <Th>Version</Th>
              <Th>Trạng thái</Th>
              <Th>Cập nhật</Th>
            </Thead>
            <Tbody>
              {articles.map((article) => (
                <tr key={article._id} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/articles/${article._id}`)}>
                  <Td className="font-mono">{article.countryCode}</Td>
                  <Td className="font-medium">{article.title}</Td>
                  <Td className="text-muted">{article.topicSlug}</Td>
                  <Td>
                    v{article.version}
                    {article.isCurrent && <span className="ml-1 text-xs text-brand">(hiện hành)</span>}
                  </Td>
                  <Td>
                    <StatusBadge status={article.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{new Date(article.updatedAt).toLocaleDateString('vi-VN')}</Td>
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
