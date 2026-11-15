import type { ReactNode } from 'react';
import { CONTENT_STATUS_LABEL, CONTENT_STATUS_TONE, type Tone } from '../../lib/labels';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  success: 'bg-success-tint text-success ring-green-200',
  warn: 'bg-warn-tint text-warn ring-amber-200',
  danger: 'bg-danger-tint text-danger ring-red-200',
  brand: 'bg-brand-tint text-brand ring-blue-200',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

// Trang thai noi dung hien bang tieng Viet; gia tri la (incident cu...) giu nguyen chu goc.
export function StatusBadge({ status }: { status: string }) {
  const known = status in CONTENT_STATUS_LABEL ? (status as keyof typeof CONTENT_STATUS_LABEL) : null;
  return (
    <Badge tone={known ? CONTENT_STATUS_TONE[known] : 'neutral'}>
      {known ? CONTENT_STATUS_LABEL[known] : status}
    </Badge>
  );
}
