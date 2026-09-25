import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { incidentsApi, countriesApi } from '../lib/api';
import type { IncidentStep, IncidentTone, IncidentStatus } from '../lib/types';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Field';
import { LoadingState, ErrorState } from '../components/ui/Feedback';
import { StepsEditor } from '../components/incident-editor/StepsEditor';

type FormState = {
  slug: string;
  countryCode: string; // '' = toan cuc (khong gioi han quoc gia)
  title: string;
  iconKey: string;
  tone: IncidentTone;
  urgent: boolean;
  reassurance: string;
  status: IncidentStatus;
  steps: IncidentStep[];
};

const EMPTY_FORM: FormState = {
  slug: '',
  countryCode: '',
  title: '',
  iconKey: 'IdCard',
  tone: 'blue',
  urgent: false,
  reassurance: '',
  status: 'draft',
  steps: [],
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function IncidentEditorPage() {
  const { id } = useParams<{ id: string }>();
  return <IncidentEditor key={id ?? 'new'} />;
}

function IncidentEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: countriesRes } = useQuery({ queryKey: ['admin', 'countries'], queryFn: () => countriesApi.list({ limit: 100 }) });
  const countries = countriesRes?.data ?? [];

  const { data: incidentRes, isLoading, error: loadError } = useQuery({
    queryKey: ['admin', 'incidents', id],
    queryFn: () => incidentsApi.get(id!),
    enabled: !isNew,
  });
  const incident = incidentRes?.data;

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!incident) return;
    setForm({
      slug: incident.slug,
      countryCode: incident.countryCode ?? '',
      title: incident.title,
      iconKey: incident.iconKey,
      tone: incident.tone,
      urgent: incident.urgent,
      reassurance: incident.reassurance,
      status: incident.status,
      steps: incident.steps,
    });
  }, [incident]);

  const buildPayload = () => ({
    slug: form.slug,
    countryCode: form.countryCode || null,
    title: form.title,
    iconKey: form.iconKey,
    tone: form.tone,
    urgent: form.urgent,
    reassurance: form.reassurance,
    status: form.status,
    steps: form.steps,
  });

  const createMutation = useMutation({
    mutationFn: () => incidentsApi.create(buildPayload()),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'incidents'] });
      navigate(`/incidents/${res.data._id}`, { replace: true });
    },
    onError: (err) => setSaveError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const updateMutation = useMutation({
    mutationFn: () => incidentsApi.update(id!, buildPayload()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'incidents', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'incidents'] });
    },
    onError: (err) => setSaveError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (isNew) createMutation.mutate();
    else updateMutation.mutate();
  };

  if (!isNew && isLoading) return <LoadingState label="Đang tải hướng dẫn..." />;
  if (!isNew && loadError) {
    return <ErrorState message={loadError instanceof ApiError ? loadError.message : 'Không tải được hướng dẫn'} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={() => navigate('/incidents')} className="mb-2 flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <PageHeader title={isNew ? 'Soạn hướng dẫn xử lý sự cố mới' : `Sửa: ${incident?.title}`} />
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-5">
          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Thông tin cơ bản</h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Select label="Quốc gia" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })}>
                  <option value="">Toàn cục (mọi quốc gia)</option>
                  {countries.map((c) => (
                    <option key={c._id} value={c.code}>
                      {c.code} · {c.name}
                    </option>
                  ))}
                </Select>
                <Select label="Trạng thái" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as IncidentStatus })}>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                </Select>
              </div>

              <Input
                label="Tiêu đề"
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setForm({ ...form, title, slug: !slugTouched && isNew ? slugify(title) : form.slug });
                }}
                required
              />
              <Input
                label="Slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm({ ...form, slug: e.target.value });
                }}
                disabled={!isNew}
                required
              />
              <Textarea
                label="Câu trấn an mở đầu"
                value={form.reassurance}
                onChange={(e) => setForm({ ...form, reassurance: e.target.value })}
                rows={2}
                hint="Vd: Giữ bình tĩnh. Bạn vẫn được rời khỏi đất nước hợp pháp bằng giấy thông hành."
              />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Các bước xử lý</h2>
            <StepsEditor steps={form.steps} onChange={(steps) => setForm({ ...form, steps })} />
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Hiển thị</h2>
            <div className="flex flex-col gap-4">
              <Input
                label="Icon (tên component lucide-react-native)"
                value={form.iconKey}
                onChange={(e) => setForm({ ...form, iconKey: e.target.value })}
                hint="Vd: IdCard, ShieldAlert, Car, ShoppingBag"
              />
              <Select label="Màu sắc" value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value as IncidentTone })}>
                <option value="blue">Xanh dương</option>
                <option value="red">Đỏ</option>
                <option value="orange">Cam</option>
                <option value="green">Xanh lá</option>
              </Select>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} />
                Đánh dấu "Khẩn cấp"
              </label>
            </div>
          </section>

          {saveError && <ErrorState message={saveError} />}

          <Button type="submit" iconLeft={<Save size={16} />} loading={createMutation.isPending || updateMutation.isPending} className="w-full">
            {isNew ? 'Tạo hướng dẫn' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  );
}
