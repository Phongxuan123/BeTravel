import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { topicsApi, countriesApi } from '../lib/api';
import type { LegalTopic } from '../lib/types';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';

type FormState = { countryCode: string; slug: string; label: string; order: number };
const emptyForm = (defaultCountry: string): FormState => ({ countryCode: defaultCountry, slug: '', label: '', order: 0 });

// Sinh slug tu nhan (tuong tu register form mobile) -- sua duoc bang tay sau khi sinh.
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function TopicsPage() {
  const queryClient = useQueryClient();
  const { data: countriesRes } = useQuery({ queryKey: ['admin', 'countries'], queryFn: () => countriesApi.list({ limit: 100 }) });
  const countries = countriesRes?.data ?? [];

  const [countryFilter, setCountryFilter] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'topics', countryFilter],
    queryFn: () => topicsApi.list({ countryCode: countryFilter || undefined, limit: 100 }),
  });

  const [editing, setEditing] = useState<LegalTopic | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(countries[0]?.code ?? ''));
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'topics'] });

  const createMutation = useMutation({
    mutationFn: (payload: FormState) => topicsApi.create(payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: FormState) => topicsApi.update(editing!._id, payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const deleteMutation = useMutation({ mutationFn: (id: string) => topicsApi.remove(id), onSuccess: invalidate });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(countryFilter || countries[0]?.code || ''));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (topic: LegalTopic) => {
    setEditing(topic);
    setForm({ countryCode: topic.countryCode, slug: topic.slug, label: topic.label, order: topic.order ?? 0 });
    setFormError(null);
    setModalOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (editing) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const topics = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Chủ đề"
        description="Nhóm bài luật theo chủ đề trong từng quốc gia."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={openCreate}>
            Thêm chủ đề
          </Button>
        }
      />

      <div className="mb-4 max-w-xs">
        <Select label="Lọc theo quốc gia" value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
          <option value="">Tất cả</option>
          {countries.map((c) => (
            <option key={c._id} value={c.code}>
              {c.code} · {c.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && topics.length === 0 && <EmptyState label="Chưa có chủ đề nào" />}

      {topics.length > 0 && (
        <Table>
          <Thead>
            <Th>Quốc gia</Th>
            <Th>Slug</Th>
            <Th>Nhãn</Th>
            <Th>Thứ tự</Th>
            <Th></Th>
          </Thead>
          <Tbody>
            {topics.map((topic) => (
              <tr key={topic._id}>
                <Td className="font-mono">{topic.countryCode}</Td>
                <Td className="font-mono text-muted">{topic.slug}</Td>
                <Td>{topic.label}</Td>
                <Td>{topic.order}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(topic)} className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Sửa">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => window.confirm(`Xoá chủ đề ${topic.label}?`) && deleteMutation.mutate(topic._id)}
                      className="rounded p-1.5 text-muted hover:bg-danger-tint hover:text-danger"
                      aria-label="Xoá"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal open={modalOpen} title={editing ? 'Sửa chủ đề' : 'Thêm chủ đề'} onClose={() => setModalOpen(false)}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Select
            label="Quốc gia"
            value={form.countryCode}
            onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
            disabled={Boolean(editing)}
            required
          >
            <option value="" disabled>
              Chọn quốc gia
            </option>
            {countries.map((c) => (
              <option key={c._id} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Nhãn"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value, slug: editing ? form.slug : slugify(e.target.value) })}
            required
          />
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} disabled={Boolean(editing)} required />
          <Input
            label="Thứ tự hiển thị"
            type="number"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
          />

          {formError && <ErrorState message={formError} />}

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Huỷ
            </Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              Lưu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
