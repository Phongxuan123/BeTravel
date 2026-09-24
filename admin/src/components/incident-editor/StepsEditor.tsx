import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { locationsApi, articlesApi } from '../../lib/api';
import type { IncidentStep, IncidentCta, IncidentCtaType } from '../../lib/types';
import { Input, Select, Textarea } from '../ui/Field';
import { Button } from '../ui/Button';

const EMPTY_STEP: Omit<IncidentStep, 'order'> = {
  title: '',
  body: [],
  checklist: [],
  contactRefs: [],
  articleRefs: [],
  ctas: [],
};

const CTA_TYPE_LABEL: Record<IncidentCtaType, string> = {
  map: 'Mở bản đồ SOS (lọc theo loại điểm)',
  call: 'Gọi điện',
  ai: 'Hỏi trợ lý AI',
  link: 'Mở liên kết ngoài',
};

const linesToArray = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);
const arrayToLines = (arr: string[]) => arr.join('\n');

// Khong dung thu vien keo tha (khong co san trong project, them dependency
// chi cho thao tac nay la thua -- Rule 9 KISS): nut len/xuong lam viec doi
// thu tu buoc, server chuan hoa lai `order` theo dung vi tri khi luu.
export function StepsEditor({ steps, onChange }: { steps: IncidentStep[]; onChange: (next: IncidentStep[]) => void }) {
  const update = (index: number, patch: Partial<IncidentStep>) =>
    onChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const remove = (index: number) => onChange(steps.filter((_, i) => i !== index));
  const add = () => onChange([...steps, { ...EMPTY_STEP, order: steps.length }]);
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {steps.map((step, index) => (
        <div key={index} className="rounded-md border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Bước {index + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Đưa lên trên">
                <ChevronUp size={16} />
              </button>
              <button type="button" disabled={index === steps.length - 1} onClick={() => move(index, 1)} className="rounded p-1 text-muted hover:bg-slate-100 disabled:opacity-30" aria-label="Đưa xuống dưới">
                <ChevronDown size={16} />
              </button>
              <button type="button" onClick={() => remove(index)} className="rounded p-1 text-danger hover:bg-danger-tint" aria-label="Xoá bước">
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Input label="Tiêu đề bước" value={step.title} onChange={(e) => update(index, { title: e.target.value })} required />
            <Textarea
              label="Nội dung (mỗi dòng một ý)"
              value={arrayToLines(step.body)}
              onChange={(e) => update(index, { body: linesToArray(e.target.value) })}
              rows={3}
            />

            <ChecklistEditor items={step.checklist} onChange={(checklist) => update(index, { checklist })} />
            <CtasEditor items={step.ctas} onChange={(ctas) => update(index, { ctas })} />
            <RefPicker
              label="Điểm hỗ trợ liên quan (contactRefs)"
              kind="location"
              selected={step.contactRefs}
              onChange={(contactRefs) => update(index, { contactRefs })}
            />
            <RefPicker
              label="Bài luật liên quan (articleRefs)"
              kind="article"
              selected={step.articleRefs}
              onChange={(articleRefs) => update(index, { articleRefs })}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" iconLeft={<Plus size={16} />} onClick={add} className="self-start">
        Thêm bước
      </Button>
    </div>
  );
}

function ChecklistEditor({ items, onChange }: { items: { label: string }[]; onChange: (next: { label: string }[]) => void }) {
  const update = (index: number, label: string) => onChange(items.map((it, i) => (i === index ? { label } : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { label: '' }]);

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">Checklist</span>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              className="w-full rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
              value={item.label}
              onChange={(e) => update(index, e.target.value)}
              placeholder="Vd: Ảnh 4×6 nền trắng (2 tấm)"
            />
            <button type="button" onClick={() => remove(index)} className="rounded p-1 text-danger hover:bg-danger-tint" aria-label="Xoá mục checklist">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <Button type="button" variant="secondary" iconLeft={<Plus size={14} />} onClick={add} className="self-start">
          Thêm mục checklist
        </Button>
      </div>
    </div>
  );
}

const EMPTY_CTA: IncidentCta = { type: 'call', label: '', payload: {} };

function CtasEditor({ items, onChange }: { items: IncidentCta[]; onChange: (next: IncidentCta[]) => void }) {
  const update = (index: number, patch: Partial<IncidentCta>) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { ...EMPTY_CTA }]);

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">Nút hành động (CTA)</span>
      <div className="flex flex-col gap-2">
        {items.map((cta, index) => (
          <div key={index} className="rounded-md border border-line p-2">
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={cta.type}
                onChange={(e) => update(index, { type: e.target.value as IncidentCtaType, payload: {} })}
              >
                {Object.entries(CTA_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Input placeholder="Nhãn nút (vd: Đồn gần nhất)" value={cta.label} onChange={(e) => update(index, { label: e.target.value })} />
            </div>
            <div className="mt-2">
              <CtaPayloadField cta={cta} onChange={(payload) => update(index, { payload })} />
            </div>
            <button type="button" onClick={() => remove(index)} className="mt-2 flex items-center gap-1 text-xs text-danger hover:underline">
              <Trash2 size={14} /> Xoá CTA này
            </button>
          </div>
        ))}
        <Button type="button" variant="secondary" iconLeft={<Plus size={14} />} onClick={add} className="self-start">
          Thêm CTA
        </Button>
      </div>
    </div>
  );
}

const LOCATION_TYPES = ['embassy', 'hospital', 'police', 'pharmacy', 'other'] as const;

function CtaPayloadField({ cta, onChange }: { cta: IncidentCta; onChange: (payload: Record<string, unknown>) => void }) {
  if (cta.type === 'map') {
    return (
      <Select value={(cta.payload.locationType as string) ?? ''} onChange={(e) => onChange({ locationType: e.target.value || undefined })}>
        <option value="">Tất cả loại điểm</option>
        {LOCATION_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
    );
  }
  if (cta.type === 'call') {
    return (
      <Input
        placeholder="Số điện thoại (để trống = dùng SĐT đại sứ quán của quốc gia)"
        value={(cta.payload.phone as string) ?? ''}
        onChange={(e) => onChange({ phone: e.target.value || undefined })}
      />
    );
  }
  if (cta.type === 'ai') {
    return (
      <Input
        placeholder="Câu hỏi prefill cho màn hình chat"
        value={(cta.payload.question as string) ?? ''}
        onChange={(e) => onChange({ question: e.target.value || undefined })}
      />
    );
  }
  return <Input placeholder="https://..." value={(cta.payload.url as string) ?? ''} onChange={(e) => onChange({ url: e.target.value })} />;
}

function RefPicker({
  label,
  kind,
  selected,
  onChange,
}: {
  label: string;
  kind: 'location' | 'article';
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [filter, setFilter] = useState('');

  const { data: locationsRes } = useQuery({
    queryKey: ['admin', 'locations', 'picker'],
    queryFn: () => locationsApi.list({ limit: 100 }),
    enabled: kind === 'location',
  });
  const { data: articlesRes } = useQuery({
    queryKey: ['admin', 'articles', 'picker'],
    queryFn: () => articlesApi.list({ limit: 100 }),
    enabled: kind === 'article',
  });

  const options =
    kind === 'location'
      ? (locationsRes?.data ?? []).map((l) => ({ id: l._id, text: `${l.name} · ${l.countryCode}` }))
      : (articlesRes?.data ?? []).map((a) => ({ id: a._id, text: `${a.title} · ${a.countryCode}` }));

  const filtered = options.filter((o) => o.text.toLowerCase().includes(filter.trim().toLowerCase()));

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-ink">
        {label} {selected.length > 0 && <span className="text-muted">({selected.length} đã chọn)</span>}
      </span>
      <input
        className="mb-1 w-full rounded-md border border-line bg-white px-3 py-1.5 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        placeholder="Tìm để chọn..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="max-h-32 overflow-y-auto rounded-md border border-line">
        {filtered.length === 0 && <p className="p-2 text-xs text-muted">Không có kết quả</p>}
        {filtered.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-2 border-b border-line px-2 py-1.5 text-sm last:border-b-0 hover:bg-slate-50">
            <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
            {o.text}
          </label>
        ))}
      </div>
    </div>
  );
}
