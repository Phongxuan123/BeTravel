import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { renderSafeMarkdown } from '../lib/markdown';
import { useAuth } from '../lib/useAuth';
import { ArrowLeft, Save } from 'lucide-react';
import { articlesApi, countriesApi, topicsApi } from '../lib/api';
import type { ArticleSource, KeyPoint, Penalty, RiskLevel, ContentStatus } from '../lib/types';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Field';
import { LoadingState, ErrorState } from '../components/ui/Feedback';
import { SourcesEditor } from '../components/article-editor/SourcesEditor';
import { KeyPointsEditor } from '../components/article-editor/KeyPointsEditor';
import { PenaltiesEditor } from '../components/article-editor/PenaltiesEditor';
import { StatusBar } from '../components/article-editor/StatusBar';

type FormState = {
  countryCode: string;
  topicSlug: string;
  slug: string;
  title: string;
  summaryVi: string;
  bodyMd: string;
  keyPoints: KeyPoint[];
  penalties: Penalty[];
  exceptionsText: string;
  foreignerNotesText: string;
  tagsText: string;
  sources: ArticleSource[];
  effectiveFrom: string;
  effectiveTo: string;
  riskLevel: RiskLevel;
};

const EMPTY_FORM: FormState = {
  countryCode: '',
  topicSlug: '',
  slug: '',
  title: '',
  summaryVi: '',
  bodyMd: '',
  keyPoints: [],
  penalties: [],
  exceptionsText: '',
  foreignerNotesText: '',
  tagsText: '',
  sources: [],
  effectiveFrom: '',
  effectiveTo: '',
  riskLevel: 'info',
};

const linesToArray = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);
const arrayToLines = (arr: string[]) => arr.join('\n');
const csvToArray = (text: string) => text.split(',').map((t) => t.trim()).filter(Boolean);
const arrayToCsv = (arr: string[]) => arr.join(', ');

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const DRAFT_SAVE_INTERVAL_MS = 10_000;

export default function ArticleEditorPage() {
  const { id } = useParams<{ id: string }>();
  return <ArticleEditor key={id ?? 'new'} />;
}

function ArticleEditor() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: countriesRes } = useQuery({ queryKey: ['admin', 'countries'], queryFn: () => countriesApi.list({ limit: 100 }) });
  const countries = countriesRes?.data ?? [];

  const { data: articleRes, isLoading: articleLoading, error: articleError } = useQuery({
    queryKey: ['admin', 'articles', id],
    queryFn: () => articlesApi.get(id!),
    enabled: !isNew,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const article = articleRes?.data;
  const canEdit = isNew || article?.status === 'draft' || article?.status === 'pending_review';

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [draftBanner, setDraftBanner] = useState(false);

  const { data: topicsRes } = useQuery({
    queryKey: ['admin', 'topics', form.countryCode],
    queryFn: () => topicsApi.list({ countryCode: form.countryCode, limit: 100 }),
    enabled: Boolean(form.countryCode),
  });
  const topics = topicsRes?.data ?? [];

  const draftKey = `bt_admin_article_draft_${user?.id ?? 'guest'}_${id ?? 'new'}`;

  // Nap du lieu tu server vao form khi mo bai da co san.
  useEffect(() => {
    if (!article) return;
    setForm({
      countryCode: article.countryCode,
      topicSlug: article.topicSlug,
      slug: article.slug,
      title: article.title,
      summaryVi: article.summaryVi,
      bodyMd: article.bodyMd,
      keyPoints: article.keyPoints,
      penalties: article.penalties,
      exceptionsText: arrayToLines(article.exceptions),
      foreignerNotesText: arrayToLines(article.foreignerNotes),
      tagsText: arrayToCsv(article.tags),
      sources: article.sources,
      effectiveFrom: article.effectiveFrom?.slice(0, 10) ?? '',
      effectiveTo: article.effectiveTo?.slice(0, 10) ?? '',
      riskLevel: article.riskLevel,
    });
  }, [article]);

  // Kiem tra co ban nhap tu dong luu tu truoc khong -- chi hoi MOT lan luc mo trang.
  const checkedDraftOnce = useRef(false);
  useEffect(() => {
    if (checkedDraftOnce.current) return;
    if (!isNew && articleLoading) return;
    checkedDraftOnce.current = true;

    try { if (localStorage.getItem(draftKey)) setDraftBanner(true); }
    catch { setSaveError('Trình duyệt không cho phép lưu bản nháp cục bộ.'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleLoading]);

  // Nhap mot bai luat mat khoang 30 phut -- tu dong luu nhap moi 10 giay de
  // khong mat cong khi mat mang / dong tab nham.
  useEffect(() => {
    // Chưa chọn khôi phục/bỏ bản nháp thì không được ghi đè bản đang chờ.
    if (draftBanner || (!isNew && !article)) return;
    const timer = setInterval(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(form));
      } catch {
        // bo qua loi ghi storage
      }
    }, DRAFT_SAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [form, draftKey, draftBanner, isNew, article]);

  const restoreDraft = () => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        setForm(JSON.parse(saved));
      } catch {
        // ban nhap hong, bo qua
      }
    }
    setDraftBanner(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(draftKey);
    setDraftBanner(false);
  };

  const buildPayload = () => ({
    countryCode: form.countryCode,
    topicSlug: form.topicSlug,
    slug: form.slug,
    title: form.title,
    summaryVi: form.summaryVi,
    bodyMd: form.bodyMd,
    keyPoints: form.keyPoints,
    penalties: form.penalties,
    exceptions: linesToArray(form.exceptionsText),
    foreignerNotes: linesToArray(form.foreignerNotesText),
    tags: csvToArray(form.tagsText),
    sources: form.sources,
    effectiveFrom: form.effectiveFrom || undefined,
    effectiveTo: form.effectiveTo || null,
    riskLevel: form.riskLevel,
  });

  const createMutation = useMutation({
    mutationFn: () => articlesApi.create(buildPayload()),
    onSuccess: (res) => {
      localStorage.removeItem(draftKey);
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
      navigate(`/articles/${res.data._id}`, { replace: true });
    },
    onError: (err) => setSaveError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const updateMutation = useMutation({
    mutationFn: () => articlesApi.update(id!, { ...buildPayload(), updatedAt: article!.updatedAt }),
    onSuccess: () => {
      localStorage.removeItem(draftKey);
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
    },
    onError: (err) => setSaveError(err instanceof ApiError ? err.message : 'Có lỗi xảy ra'),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { status: ContentStatus; note?: string }) => articlesApi.changeStatus(id!, input.status, input.note),
    onSuccess: () => {
      setStatusError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles', id] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
    },
    onError: (err) => setStatusError(err instanceof ApiError ? `${err.message}${formatDetails(err.details)}` : 'Có lỗi xảy ra'),
  });

  const newVersionMutation = useMutation({
    mutationFn: () => articlesApi.newVersion(id!),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'articles'] });
      navigate(`/articles/${res.data._id}`);
    },
    onError: (err) => setStatusError(err instanceof ApiError ? err.message : 'Không tạo được phiên bản mới'),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    if (isNew) createMutation.mutate();
    else updateMutation.mutate();
  };

  const bodyPreviewHtml = useMemo(() => renderSafeMarkdown(form.bodyMd || ''), [form.bodyMd]);

  if (!isNew && articleLoading) return <LoadingState label="Đang tải bài luật..." />;
  if (!isNew && articleError) {
    return <ErrorState message={articleError instanceof ApiError ? articleError.message : 'Không tải được bài luật'} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <button onClick={() => navigate('/articles')} className="mb-2 flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} /> Quay lại danh sách
        </button>
        <PageHeader title={isNew ? 'Soạn bài luật mới' : `Sửa: ${article?.title}`} description={!isNew ? `Phiên bản ${article?.version}` : undefined} />
      </div>

      {draftBanner && (
        <div className="flex items-center justify-between rounded-md border border-warn bg-warn-tint px-4 py-2.5 text-sm text-warn">
          <span>Tìm thấy bản nháp tự động lưu trước đó. Dùng bản này?</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={discardDraft}>
              Bỏ qua
            </Button>
            <Button onClick={restoreDraft}>Khôi phục</Button>
          </div>
        </div>
      )}

      {article && !isNew && (
        <StatusBar
          status={article.status}
          isCurrent={article.isCurrent}
          changingStatus={statusMutation.isPending}
          statusError={statusError}
          onChangeStatus={(status, note) => statusMutation.mutate({ status, note })}
          onNewVersion={() => newVersionMutation.mutate()}
          newVersionLoading={newVersionMutation.isPending}
          canCreateNewVersion
        />
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-5">
          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Thông tin cơ bản</h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Quốc gia"
                  value={form.countryCode}
                  onChange={(e) => setForm({ ...form, countryCode: e.target.value, topicSlug: '' })}
                  disabled={!isNew}
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
                <Select label="Chủ đề" value={form.topicSlug} onChange={(e) => setForm({ ...form, topicSlug: e.target.value })} required>
                  <option value="" disabled>
                    Chọn chủ đề
                  </option>
                  {topics.map((t) => (
                    <option key={t._id} value={t.slug}>
                      {t.label}
                    </option>
                  ))}
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
              <Textarea label="Tóm tắt (summaryVi)" value={form.summaryVi} onChange={(e) => setForm({ ...form, summaryVi: e.target.value })} rows={3} />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Nội dung đầy đủ (Markdown)</h2>
            <div className="grid grid-cols-2 gap-4">
              <Textarea value={form.bodyMd} onChange={(e) => setForm({ ...form, bodyMd: e.target.value })} rows={16} className="font-mono text-xs" />
              <div
                className="overflow-y-auto rounded-md border border-line p-3 text-sm leading-relaxed text-ink [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:my-2"
                style={{ maxHeight: 360 }}
                dangerouslySetInnerHTML={{ __html: bodyPreviewHtml }}
              />
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Điểm chính</h2>
            <KeyPointsEditor items={form.keyPoints} onChange={(keyPoints) => setForm({ ...form, keyPoints })} />
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Mức phạt</h2>
            <PenaltiesEditor items={form.penalties} onChange={(penalties) => setForm({ ...form, penalties })} />
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Nguồn (bắt buộc để xuất bản)</h2>
            <SourcesEditor sources={form.sources} onChange={(sources) => setForm({ ...form, sources })} />
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Hiệu lực & mức độ rủi ro</h2>
            <div className="flex flex-col gap-4">
              <Input label="Hiệu lực từ" type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
              <Input label="Hiệu lực đến (nếu có)" type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} />
              <Select label="Mức độ rủi ro" value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value as RiskLevel })}>
                <option value="info">Thông tin</option>
                <option value="warn">Cảnh báo</option>
                <option value="danger">Nguy hiểm</option>
              </Select>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Ngoại lệ, lưu ý cho người nước ngoài, tag</h2>
            <div className="flex flex-col gap-4">
              <Textarea label="Ngoại lệ (mỗi dòng một ý)" value={form.exceptionsText} onChange={(e) => setForm({ ...form, exceptionsText: e.target.value })} rows={3} />
              <Textarea
                label="Lưu ý cho người nước ngoài (mỗi dòng một ý)"
                value={form.foreignerNotesText}
                onChange={(e) => setForm({ ...form, foreignerNotesText: e.target.value })}
                rows={3}
              />
              <Input label="Tag (phân cách bằng dấu phẩy)" value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} />
            </div>
          </section>

          {!canEdit && <p className="text-sm text-muted">Tạo phiên bản nháp mới để sửa nội dung đã xuất bản.</p>}
          {saveError && <ErrorState message={saveError} />}

          <Button type="submit" disabled={!canEdit} iconLeft={<Save size={16} />} loading={createMutation.isPending || updateMutation.isPending} className="w-full">
            {isNew ? 'Tạo bản nháp' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function formatDetails(details: unknown): string {
  if (!Array.isArray(details)) return '';
  return ' -- ' + details.map((d) => (typeof d === 'object' && d && 'message' in d ? String((d as { message: unknown }).message) : String(d))).join('; ');
}
