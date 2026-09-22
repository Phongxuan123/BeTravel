import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BadgeCheck } from 'lucide-react';
import { locationsApi, countriesApi } from '../lib/api';
import type { SupportLocation, LocationType } from '../lib/types';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { MapPicker } from '../components/MapPicker';

const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  embassy: 'Đại sứ quán',
  hospital: 'Bệnh viện',
  police: 'Công an',
  pharmacy: 'Nhà thuốc',
  other: 'Khác',
};

type FormState = {
  countryCode: string;
  type: LocationType;
  name: string;
  address: string;
  phone: string;
  verified: boolean;
  coordinates: [number, number] | null;
};

const emptyForm = (defaultCountry: string): FormState => ({
  countryCode: defaultCountry,
  type: 'embassy',
  name: '',
  address: '',
  phone: '',
  verified: false,
  coordinates: null,
});

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const { data: countriesRes } = useQuery({ queryKey: ['admin', 'countries'], queryFn: () => countriesApi.list({ limit: 100 }) });
  const countries = countriesRes?.data ?? [];

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'locations'],
    queryFn: () => locationsApi.list({ limit: 100 }),
  });

  const [editing, setEditing] = useState<SupportLocation | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(''));
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });

  const buildPayload = (state: FormState) => ({
    countryCode: state.countryCode,
    type: state.type,
    name: state.name,
    address: state.address,
    phone: state.phone,
    verified: state.verified,
    location: { type: 'Point' as const, coordinates: state.coordinates as [number, number] },
  });

  const createMutation = useMutation({
    mutationFn: (state: FormState) => locationsApi.create(buildPayload(state)),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const updateMutation = useMutation({
    mutationFn: (state: FormState) => locationsApi.update(editing!._id, buildPayload(state)),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const deleteMutation = useMutation({ mutationFn: (id: string) => locationsApi.remove(id), onSuccess: invalidate });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(countries[0]?.code ?? ''));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (location: SupportLocation) => {
    setEditing(location);
    setForm({
      countryCode: location.countryCode,
      type: location.type,
      name: location.name,
      address: location.address ?? '',
      phone: location.phone ?? '',
      verified: location.verified,
      coordinates: location.location.coordinates,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.coordinates) {
      setFormError('Hãy click trên bản đồ để đặt vị trí');
      return;
    }

    if (editing) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const locations = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Điểm hỗ trợ"
        description="Đại sứ quán, bệnh viện, công an... dùng cho SOS map. Toạ độ [kinh độ, vĩ độ]."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={openCreate}>
            Thêm điểm
          </Button>
        }
      />

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && locations.length === 0 && <EmptyState label="Chưa có điểm hỗ trợ nào" />}

      {locations.length > 0 && (
        <Table>
          <Thead>
            <Th>Quốc gia</Th>
            <Th>Loại</Th>
            <Th>Tên</Th>
            <Th>Đã kiểm chứng</Th>
            <Th></Th>
          </Thead>
          <Tbody>
            {locations.map((location) => (
              <tr key={location._id}>
                <Td className="font-mono">{location.countryCode}</Td>
                <Td>{LOCATION_TYPE_LABEL[location.type]}</Td>
                <Td>{location.name}</Td>
                <Td>{location.verified && <BadgeCheck size={18} className="text-success" />}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(location)} className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Sửa">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => window.confirm(`Xoá điểm ${location.name}?`) && deleteMutation.mutate(location._id)}
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

      <Modal open={modalOpen} title={editing ? 'Sửa điểm hỗ trợ' : 'Thêm điểm hỗ trợ'} onClose={() => setModalOpen(false)}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
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
            <Select label="Loại" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LocationType })}>
              {Object.entries(LOCATION_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <Input label="Tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Input label="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

          <div>
            <span className="mb-1 block text-sm font-medium text-ink">Vị trí trên bản đồ (click để đặt)</span>
            <MapPicker coordinates={form.coordinates} onChange={(coordinates) => setForm({ ...form, coordinates })} />
            {form.coordinates && (
              <span className="mt-1 block text-xs text-muted">
                Kinh độ {form.coordinates[0].toFixed(5)}, vĩ độ {form.coordinates[1].toFixed(5)}
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} />
            Đã kiểm chứng (đã gọi điện xác minh)
          </label>

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
