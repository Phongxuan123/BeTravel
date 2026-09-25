import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { quickPhrasesApi, countriesApi } from '../lib/api';
import type { QuickPhrase } from '../lib/types';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';

type FormState = { countryCode: string; vi: string; translated: string; phonetic: string; order: number };
const emptyForm = (defaultCountry: string): FormState => ({ countryCode: defaultCountry, vi: '', translated: '', phonetic: '', order: 0 });

export default function QuickPhrasesPage() {
  const queryClient = useQueryClient();
  const { data: countriesRes } = useQuery({ queryKey: ['admin', 'countries'], queryFn: () => countriesApi.list({ limit: 100 }) });
  const countries = countriesRes?.data ?? [];

  const [countryFilter, setCountryFilter] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'quick-phrases', countryFilter],
    queryFn: () => quickPhrasesApi.list({ countryCode: countryFilter || undefined, limit: 100 }),
  });

  const [editing, setEditing] = useState<QuickPhrase | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(''));
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'quick-phrases'] });

  const buildPayload = (state: FormState) => ({
    countryCode: state.countryCode,
    vi: state.vi,
    translated: state.translated,
    phonetic: state.phonetic || undefined,
    order: state.order,
  });

  const createMutation = useMutation({
    mutationFn: (state: FormState) => quickPhrasesApi.create(buildPayload(state)),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const updateMutation = useMutation({
    mutationFn: (state: FormState) => quickPhrasesApi.update(editing!._id, buildPayload(state)),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const deleteMutation = useMutation({ mutationFn: (id: string) => quickPhrasesApi.remove(id), onSuccess: invalidate });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(countryFilter || countries[0]?.code || ''));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (phrase: QuickPhrase) => {
    setEditing(phrase);
    setForm({ countryCode: phrase.countryCode, vi: phrase.vi, translated: phrase.translated, phonetic: phrase.phonetic ?? '', order: phrase.order });
    setFormError(null);
    setModalOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (editing) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const phrases = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Câu dịch sẵn"
        description="Câu tiếng Việt khẩn cấp + bản dịch dùng offline ở màn hình Dịch khẩn cấp."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={openCreate}>
            Thêm câu
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
      {!isLoading && phrases.length === 0 && <EmptyState label="Chưa có câu dịch sẵn nào" />}

      {phrases.length > 0 && (
        <Table>
          <Thead>
            <Th>Quốc gia</Th>
            <Th>Tiếng Việt</Th>
            <Th>Bản dịch</Th>
            <Th>Phiên âm</Th>
            <Th>Thứ tự</Th>
            <Th></Th>
          </Thead>
          <Tbody>
            {phrases.map((phrase) => (
              <tr key={phrase._id}>
                <Td className="font-mono">{phrase.countryCode}</Td>
                <Td>{phrase.vi}</Td>
                <Td>{phrase.translated}</Td>
                <Td className="text-muted">{phrase.phonetic}</Td>
                <Td>{phrase.order}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(phrase)} className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Sửa">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => window.confirm(`Xoá câu "${phrase.vi}"?`) && deleteMutation.mutate(phrase._id)}
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

      <Modal open={modalOpen} title={editing ? 'Sửa câu dịch sẵn' : 'Thêm câu dịch sẵn'} onClose={() => setModalOpen(false)}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Select label="Quốc gia" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })} required>
            <option value="" disabled>
              Chọn quốc gia
            </option>
            {countries.map((c) => (
              <option key={c._id} value={c.code}>
                {c.code} · {c.name}
              </option>
            ))}
          </Select>
          <Input label="Câu tiếng Việt" value={form.vi} onChange={(e) => setForm({ ...form, vi: e.target.value })} required />
          <Input label="Bản dịch" value={form.translated} onChange={(e) => setForm({ ...form, translated: e.target.value })} required />
          <Input label="Phiên âm (tuỳ chọn)" value={form.phonetic} onChange={(e) => setForm({ ...form, phonetic: e.target.value })} hint="Giúp người dùng đọc to được, kể cả không biết chữ bản địa" />
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
