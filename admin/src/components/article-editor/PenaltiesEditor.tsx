import { Plus, Trash2 } from 'lucide-react';
import type { Penalty } from '../../lib/types';
import { Input } from '../ui/Field';
import { Button } from '../ui/Button';

const EMPTY_PENALTY: Penalty = { behavior: '', amountText: '', currency: '', note: '' };

export function PenaltiesEditor({ items, onChange }: { items: Penalty[]; onChange: (next: Penalty[]) => void }) {
  const update = (index: number, patch: Partial<Penalty>) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { ...EMPTY_PENALTY }]);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <div key={index} className="rounded-md border border-line p-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Hành vi" value={item.behavior} onChange={(e) => update(index, { behavior: e.target.value })} className="col-span-2" />
            <Input label="Mức phạt (mô tả)" value={item.amountText} onChange={(e) => update(index, { amountText: e.target.value })} />
            <Input label="Đơn vị tiền tệ" value={item.currency} onChange={(e) => update(index, { currency: e.target.value })} placeholder="KRW" />
            <Input label="Ghi chú" value={item.note} onChange={(e) => update(index, { note: e.target.value })} className="col-span-2" />
          </div>
          <button type="button" onClick={() => remove(index)} className="mt-2 flex items-center gap-1 text-xs text-danger hover:underline">
            <Trash2 size={14} /> Xoá mức phạt này
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" iconLeft={<Plus size={16} />} onClick={add} className="self-start">
        Thêm mức phạt
      </Button>
    </div>
  );
}
