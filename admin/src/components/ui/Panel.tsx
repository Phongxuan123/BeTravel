import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

// Khung trang trang co tieu de -- thay cho cac div "rounded border p-4" lap lai o tung trang.
export function Panel({ title, description, actions, children, className = '' }: Props) {
  return (
    <section className={`rounded-xl border border-line bg-white p-5 shadow-card ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
