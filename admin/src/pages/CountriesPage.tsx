import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { countriesApi } from '../lib/api';
import type { Country, CountryStatus } from '../lib/types';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { Badge } from '../components/ui/Badge';

type FormState = { code: string; name: string; nameEn: string; status: CountryStatus };
const EMPTY_FORM: FormState = { code: '', name: '', nameEn: '', status: 'coming_soon' };

export default function CountriesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'countries'],
    queryFn: () => countriesApi.list({ limit: 100 }),
  });

  const [editing, setEditing] = useState<Country | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'countries'] });

  const createMutation = useMutation({
    mutationFn: (payload: FormState) => countriesApi.create(payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: FormState) => countriesApi.update(editing!._id, payload),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => countriesApi.remove(id),
    onSuccess: invalidate,
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (country: Country) => {
    setEditing(country);
    setForm({ code: country.code, name: country.name, nameEn: country.nameEn ?? '', status: country.status });
    setFormError(null);
    setModalOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (editing) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const countries = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Quốc gia"
        description="Danh sách quốc gia được hỗ trợ. Country-driven -- không hard-code quốc gia ở nơi khác."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={openCreate}>
            Thêm quốc gia
          </Button>
        }
      />

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && countries.length === 0 && <EmptyState label="Chưa có quốc gia nào" />}

      {countries.length > 0 && (
        <Table>
          <Thead>
            <Th>Mã</Th>
            <Th>Tên</Th>
            <Th>Trạng thái</Th>
            <Th></Th>
          </Thead>
          <Tbody>
            {countries.map((country) => (
              <tr key={country._id}>
                <Td className="font-mono">{country.code}</Td>
                <Td>{country.name}</Td>
                <Td>
                  <Badge tone={country.status === 'active' ? 'success' : 'neutral'}>
                    {country.status === 'active' ? 'Đang hoạt động' : 'Sắp mở'}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(country)} className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Sửa">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => window.confirm(`Xoá quốc gia ${country.name}?`) && deleteMutation.mutate(country._id)}
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

      <Modal open={modalOpen} title={editing ? 'Sửa quốc gia' : 'Thêm quốc gia'} onClose={() => setModalOpen(false)}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Mã ISO-2 (vd: KR)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            maxLength={2}
            disabled={Boolean(editing)}
            required
          />
          <Input label="Tên tiếng Việt" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Tên tiếng Anh" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          <Select
            label="Trạng thái"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as CountryStatus })}
          >
            <option value="coming_soon">Sắp mở</option>
            <option value="active">Đang hoạt động</option>
          </Select>

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
