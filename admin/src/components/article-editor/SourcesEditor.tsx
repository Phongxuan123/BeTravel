import { Plus, Trash2 } from 'lucide-react';
import type { ArticleSource, SourceKind } from '../../lib/types';
import { Input, Select } from '../ui/Field';
import { Button } from '../ui/Button';

const KIND_OPTIONS: { value: SourceKind; label: string }[] = [
  { value: 'gov', label: 'Cơ quan chính phủ' },
  { value: 'legal_text', label: 'Văn bản luật' },
  { value: 'embassy', label: 'Đại sứ quán' },
  { value: 'news', label: 'Báo chí' },
  { value: 'other', label: 'Khác' },
];

const EMPTY_SOURCE: ArticleSource = { title: '', url: '', authority: '', kind: 'gov', publishedAt: '', accessedAt: '' };

// Nguon la thu quyet dinh "du lieu da kiem chung" hay khong -- moi truong doi
// title/url/authority/kind/publishedAt/accessedAt rieng biet (khong gop chung
// mot o text) de backend kiem tra du kien duoc dung theo tung field.
export function SourcesEditor({ sources, onChange }: { sources: ArticleSource[]; onChange: (next: ArticleSource[]) => void }) {
  const update = (index: number, patch: Partial<ArticleSource>) => {
    onChange(sources.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const remove = (index: number) => onChange(sources.filter((_, i) => i !== index));
  const add = () => onChange([...sources, { ...EMPTY_SOURCE }]);

  const hasCompleteSource = sources.some((s) => s.url && s.authority && s.publishedAt);

  return (
    <div className="flex flex-col gap-3">
      {!hasCompleteSource && (
        <div className="rounded-md bg-danger-tint px-3 py-2 text-sm text-danger">
          Cần ít nhất 1 nguồn có đủ URL, cơ quan phát hành và ngày công bố để xuất bản được bài này.
        </div>
      )}

      {sources.map((source, index) => (
        <div key={index} className="rounded-md border border-line p-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tiêu đề nguồn" value={source.title} onChange={(e) => update(index, { title: e.target.value })} />
            <Select label="Loại" value={source.kind} onChange={(e) => update(index, { kind: e.target.value as SourceKind })}>
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Input label="URL" value={source.url} onChange={(e) => update(index, { url: e.target.value })} className="col-span-2" />
            <Input label="Cơ quan phát hành" value={source.authority} onChange={(e) => update(index, { authority: e.target.value })} />
            <div />
            <Input
              label="Ngày công bố"
              type="date"
              value={source.publishedAt?.slice(0, 10) ?? ''}
              onChange={(e) => update(index, { publishedAt: e.target.value })}
            />
            <Input
              label="Ngày truy cập"
              type="date"
              value={source.accessedAt?.slice(0, 10) ?? ''}
              onChange={(e) => update(index, { accessedAt: e.target.value })}
            />
          </div>
          <button type="button" onClick={() => remove(index)} className="mt-2 flex items-center gap-1 text-xs text-danger hover:underline">
            <Trash2 size={14} /> Xoá nguồn này
          </button>
        </div>
      ))}

      <Button type="button" variant="secondary" iconLeft={<Plus size={16} />} onClick={add} className="self-start">
        Thêm nguồn
      </Button>
    </div>
  );
}
