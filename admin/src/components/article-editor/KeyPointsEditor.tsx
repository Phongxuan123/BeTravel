import { Plus, Trash2 } from 'lucide-react';
import type { KeyPoint } from '../../lib/types';
import { Input, Select } from '../ui/Field';
import { Button } from '../ui/Button';

export function KeyPointsEditor({ items, onChange }: { items: KeyPoint[]; onChange: (next: KeyPoint[]) => void }) {
  const update = (index: number, patch: Partial<KeyPoint>) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { text: '', severity: 'normal' }]);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <div className="flex-1">
            <Input value={item.text} onChange={(e) => update(index, { text: e.target.value })} placeholder="Ví dụ: Cấm hút thuốc lá điện tử nơi công cộng" />
          </div>
          <Select value={item.severity} onChange={(e) => update(index, { severity: e.target.value as KeyPoint['severity'] })} className="w-36">
            <option value="normal">Thường</option>
            <option value="criminal">Hình sự</option>
          </Select>
          <button type="button" onClick={() => remove(index)} className="mt-2 rounded p-1.5 text-muted hover:bg-danger-tint hover:text-danger" aria-label="Xoá">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" iconLeft={<Plus size={16} />} onClick={add} className="self-start">
        Thêm điểm chính
      </Button>
    </div>
  );
}
