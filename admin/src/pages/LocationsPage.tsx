import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, BadgeCheck, Upload } from 'lucide-react';
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
import { parseLocationsCsv } from '../lib/csv';

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
  nameLocal: string;
  address: string;
  phone: string;
  website: string;
  verified: boolean;
  coordinates: [number, number] | null;
};

const emptyForm = (defaultCountry: string): FormState => ({
  countryCode: defaultCountry,
  type: 'embassy',
  name: '',
  nameLocal: '',
  address: '',
  phone: '',
  website: '',
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'locations'] });

  const buildPayload = (state: FormState) => ({
    countryCode: state.countryCode,
    type: state.type,
    name: state.name,
    nameLocal: state.nameLocal || undefined,
    address: state.address,
    phone: state.phone || undefined,
    website: state.website || undefined,
    verified: state.verified,
    location: { type: 'Point' as const, coordinates: state.coordinates as [number, number] },
  });

  const bulkImportMutation = useMutation({
    mutationFn: (rows: Partial<SupportLocation>[]) => locationsApi.bulkImport(rows),
    onSuccess: invalidate,
  });

  const bulkVerifyMutation = useMutation({
    mutationFn: (ids: string[]) => locationsApi.bulkVerify(ids),
    onSuccess: () => {
      invalidate();
      setSelectedIds(new Set());
    },
  });

  const onCsvSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phep chon lai dung file nay lan nua neu can
    if (!file) return;
    const rows = parseLocationsCsv(await file.text());
    if (rows.length > 0) bulkImportMutation.mutate(rows);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
      nameLocal: location.nameLocal ?? '',
      address: location.address ?? '',
      phone: location.phone ?? '',
      website: location.website ?? '',
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
    if (!form.phone.trim() && !form.website.trim()) {
      setFormError('Cần ít nhất 1 trong 2: số điện thoại hoặc website');
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
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onCsvSelected} />
            <Button variant="secondary" iconLeft={<Upload size={16} />} onClick={() => fileInputRef.current?.click()} loading={bulkImportMutation.isPending}>
              Nhập CSV
            </Button>
            <Button
              variant="secondary"
              iconLeft={<BadgeCheck size={16} />}
              disabled={selectedIds.size === 0}
              loading={bulkVerifyMutation.isPending}
              onClick={() => bulkVerifyMutation.mutate([...selectedIds])}
            >
              Xác minh đã chọn ({selectedIds.size})
            </Button>
            <Button iconLeft={<Plus size={16} />} onClick={openCreate}>
              Thêm điểm
            </Button>
          </div>
        }
      />

      {bulkImportMutation.isError && (
        <div className="mb-4 rounded-md border border-danger-line bg-red-50 px-3 py-2 text-sm text-danger">
          {bulkImportMutation.error instanceof ApiError ? bulkImportMutation.error.message : 'Không nhập được file CSV'}
        </div>
      )}
      {bulkImportMutation.isSuccess && (
        <div className="mb-4 rounded-md border border-line bg-blue-50 px-3 py-2 text-sm text-ink">
          Đã tạo {bulkImportMutation.data.data.createdCount} điểm.
          {bulkImportMutation.data.data.skipped.length > 0 && (
            <>
              {' '}
              Bỏ qua {bulkImportMutation.data.data.skipped.length} dòng:{' '}
              {bulkImportMutation.data.data.skipped.map((s) => `#${s.index + 1} ${s.name || '(không tên)'} -- ${s.reason}`).join('; ')}
            </>
          )}
        </div>
      )}

      {isLoading && <LoadingState />}
      {error && <ErrorState message={error instanceof ApiError ? error.message : 'Không tải được dữ liệu'} />}
      {!isLoading && locations.length === 0 && <EmptyState label="Chưa có điểm hỗ trợ nào" />}

      {locations.length > 0 && (
        <Table>
          <Thead>
            <Th></Th>
            <Th>Quốc gia</Th>
            <Th>Loại</Th>
            <Th>Tên</Th>
            <Th>Đã kiểm chứng</Th>
            <Th></Th>
          </Thead>
          <Tbody>
            {locations.map((location) => (
              <tr key={location._id}>
                <Td>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(location._id)}
                    onChange={() => toggleSelected(location._id)}
                    aria-label={`Chọn ${location.name}`}
                  />
                </Td>
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

          <div className="grid grid-cols-2 gap-4">
            <Input label="Tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Tên bản địa" value={form.nameLocal} onChange={(e) => setForm({ ...form, nameLocal: e.target.value })} hint="Vd: tiếng Hàn -- giúp tài xế taxi/người địa phương nhận ra" />
          </div>
          <Input label="Địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
          </div>
          <p className="text-xs text-muted">Cần ít nhất 1 trong 2: số điện thoại hoặc website.</p>

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
