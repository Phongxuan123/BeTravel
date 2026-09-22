import type { ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warn' | 'danger' | 'brand';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-success-tint text-success',
  warn: 'bg-warn-tint text-warn',
  danger: 'bg-danger-tint text-danger',
  brand: 'bg-blue-100 text-brand',
};

// Anh xa trang thai noi dung -> mau sac, dung chung o bang bai luat va badge trang thai.
const STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral',
  pending_review: 'warn',
  published: 'success',
  superseded: 'neutral',
  archived: 'neutral',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{status}</Badge>;
}
