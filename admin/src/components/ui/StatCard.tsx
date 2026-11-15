import type { LucideIcon } from 'lucide-react';
import type { Tone } from '../../lib/labels';

const ICON_TONE: Record<Tone, string> = {
  brand: 'bg-brand-tint text-brand',
  success: 'bg-success-tint text-success',
  warn: 'bg-warn-tint text-warn',
  danger: 'bg-danger-tint text-danger',
  neutral: 'bg-slate-100 text-slate-600',
};

const ACCENT_TONE: Record<Tone, string> = {
  brand: 'before:bg-brand',
  success: 'before:bg-success',
  warn: 'before:bg-warn',
  danger: 'before:bg-danger',
  neutral: 'before:bg-slate-300',
};

type Props = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: Tone;
};

// The so lieu dung chung Dashboard + Tro ly AI: so lon, de doc khi chieu len man hinh.
export function StatCard({ label, value, icon: Icon, hint, tone = 'brand' }: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-line bg-white p-4 shadow-card before:absolute before:inset-y-0 before:left-0 before:w-1 ${ACCENT_TONE[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums text-ink">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ICON_TONE[tone]}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
