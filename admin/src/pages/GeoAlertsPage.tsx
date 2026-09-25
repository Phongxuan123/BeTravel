import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { geoAlertsApi, countriesApi, articlesApi } from '../lib/api';
import type { GeoAlert, GeoAlertScope, RiskLevel } from '../lib/types';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { Table, Thead, Th, Tbody, Td } from '../components/ui/Table';
import { LoadingState, EmptyState, ErrorState } from '../components/ui/Feedback';
import { Badge } from '../components/ui/Badge';
import { CirclePicker } from '../components/CirclePicker';

const SEVERITY_LABEL: Record<RiskLevel, string> = { info: 'Thông tin', warn: 'Cảnh báo', danger: 'Nguy hiểm' };
const SEVERITY_TONE: Record<RiskLevel, 'neutral' | 'warn' | 'danger'> = { info: 'neutral', warn: 'warn', danger: 'danger' };

type FormState = {
  countryCode: string;
  scope: GeoAlertScope;
  centerCoordinates: [number, number] | null;
  radiusM: number;
  title: string;
  message: string;
  severity: RiskLevel;
  behaviorsToAvoidText: string;
  linkedArticleId: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: 'draft' | 'published';
};

const linesToArray = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);
const arrayToLines = (arr: string[]) => arr.join('\n');

const emptyForm = (defaultCountry: string): FormState => ({
  countryCode: defaultCountry,
  scope: 'country',
  centerCoordinates: null,
  radiusM: 1000,
  title: '',
  message: '',
  severity: 'warn',
  behaviorsToAvoidText: '',
  linkedArticleId: '',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  status: 'draft',
});

export default function GeoAlertsPage() {
  const queryClient = useQueryClient();
  const { data: countriesRes } = useQuery({ queryKey: ['admin', 'countries'], queryFn: () => countriesApi.list({ limit: 100 }) });
  const countries = countriesRes?.data ?? [];
  const { data: articlesRes } = useQuery({ queryKey: ['admin', 'articles', 'picker'], queryFn: () => articlesApi.list({ limit: 100 }) });
  const articles = articlesRes?.data ?? [];

  const [countryFilter, setCountryFilter] = useState('');
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'geo-alerts', countryFilter],
    queryFn: () => geoAlertsApi.list({ countryCode: countryFilter || undefined, limit: 100 }),
  });

  const [editing, setEditing] = useState<GeoAlert | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(''));
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'geo-alerts'] });

  const buildPayload = (state: FormState) => ({
    countryCode: state.countryCode,
    scope: state.scope,
    center: state.scope === 'area' && state.centerCoordinates ? { type: 'Point' as const, coordinates: state.centerCoordinates } : undefined,
    radiusM: state.scope === 'area' ? state.radiusM : undefined,
    title: state.title,
    message: state.message,
    severity: state.severity,
    behaviorsToAvoid: linesToArray(state.behaviorsToAvoidText),
    linkedArticleId: state.linkedArticleId || null,
    effectiveFrom: state.effectiveFrom,
    effectiveTo: state.effectiveTo || null,
    status: state.status,
  });

  const createMutation = useMutation({
    mutationFn: (state: FormState) => geoAlertsApi.create(buildPayload(state)),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const updateMutation = useMutation({
    mutationFn: (state: FormState) => geoAlertsApi.update(editing!._id, buildPayload(state)),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const deleteMutation = useMutation({ mutationFn: (id: string) => geoAlertsApi.remove(id), onSuccess: invalidate });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(countryFilter || countries[0]?.code || ''));
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (alert: GeoAlert) => {
    setEditing(alert);
    setForm({
      countryCode: alert.countryCode,
      scope: alert.scope,
      centerCoordinates: alert.center?.coordinates ?? null,
      radiusM: alert.radiusM ?? 1000,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      behaviorsToAvoidText: arrayToLines(alert.behaviorsToAvoid),
      linkedArticleId: alert.linkedArticleId ?? '',
      effectiveFrom: alert.effectiveFrom.slice(0, 10),
      effectiveTo: alert.effectiveTo ? alert.effectiveTo.slice(0, 10) : '',
      status: alert.status,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (form.scope === 'area' && !form.centerCoordinates) {
      setFormError('Hãy click trên bản đồ để đặt tâm khu vực');
      return;
    }
    if (editing) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const alerts = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Cảnh báo vị trí"
        description="Cảnh báo an toàn theo quốc gia hoặc một khu vực cụ thể (bán kính quanh một điểm)."
        actions={
          <Button iconLeft={<Plus size={16} />} onClick={openCreate}>
            Thêm cảnh báo
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
      {!isLoading && alerts.length === 0 && <EmptyState label="Chưa có cảnh báo nào" />}

      {alerts.length > 0 && (
        <Table>
          <Thead>
            <Th>Quốc gia</Th>
            <Th>Phạm vi</Th>
            <Th>Tiêu đề</Th>
            <Th>Mức độ</Th>
            <Th>Trạng thái</Th>
            <Th></Th>
          </Thead>
          <Tbody>
            {alerts.map((alert) => (
              <tr key={alert._id}>
                <Td className="font-mono">{alert.countryCode}</Td>
                <Td>{alert.scope === 'country' ? 'Cả nước' : `Khu vực (${(alert.radiusM ?? 0) / 1000}km)`}</Td>
                <Td className="font-medium">{alert.title}</Td>
                <Td>
                  <Badge tone={SEVERITY_TONE[alert.severity]}>{SEVERITY_LABEL[alert.severity]}</Badge>
                </Td>
                <Td>
                  <Badge tone={alert.status === 'published' ? 'success' : 'neutral'}>{alert.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</Badge>
                </Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => openEdit(alert)} className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-ink" aria-label="Sửa">
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => window.confirm(`Xoá cảnh báo "${alert.title}"?`) && deleteMutation.mutate(alert._id)}
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

      <Modal open={modalOpen} title={editing ? 'Sửa cảnh báo' : 'Thêm cảnh báo'} onClose={() => setModalOpen(false)}>
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
            <Select label="Phạm vi" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as GeoAlertScope })}>
              <option value="country">Cả nước</option>
              <option value="area">Một khu vực</option>
            </Select>
          </div>

          {form.scope === 'area' && (
            <div>
              <span className="mb-1 block text-sm font-medium text-ink">Tâm khu vực (click để đặt) + bán kính</span>
              <CirclePicker center={form.centerCoordinates} radiusM={form.radiusM} onChangeCenter={(centerCoordinates) => setForm({ ...form, centerCoordinates })} />
              <div className="mt-2 max-w-[200px]">
                <Input label="Bán kính (mét)" type="number" min={100} step={100} value={form.radiusM} onChange={(e) => setForm({ ...form, radiusM: Number(e.target.value) })} />
              </div>
            </div>
          )}

          <Input label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <Textarea label="Nội dung cảnh báo" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} required />
          <Textarea
            label="Hành vi cần tránh (mỗi dòng một ý)"
            value={form.behaviorsToAvoidText}
            onChange={(e) => setForm({ ...form, behaviorsToAvoidText: e.target.value })}
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Mức độ" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as RiskLevel })}>
              <option value="info">Thông tin</option>
              <option value="warn">Cảnh báo</option>
              <option value="danger">Nguy hiểm</option>
            </Select>
            <Select label="Trạng thái" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}>
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
            </Select>
          </div>

          <Select label="Bài luật liên quan (tuỳ chọn)" value={form.linkedArticleId} onChange={(e) => setForm({ ...form, linkedArticleId: e.target.value })}>
            <option value="">Không liên kết</option>
            {articles.map((a) => (
              <option key={a._id} value={a._id}>
                {a.title} · {a.countryCode}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Hiệu lực từ" type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} required />
            <Input label="Hiệu lực đến (nếu có)" type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} />
          </div>

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
