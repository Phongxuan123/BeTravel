import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldWrapProps = { label?: string; error?: string; hint?: string; children: ReactNode };

function FieldWrap({ label, error, hint, children }: FieldWrapProps) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-ink">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-1 focus:ring-brand';

export function Input({
  label,
  error,
  hint,
  className = '',
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <input className={`${inputClass} ${className}`} {...rest} />
    </FieldWrap>
  );
}

export function Textarea({
  label,
  error,
  hint,
  className = '',
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <textarea className={`${inputClass} resize-y ${className}`} {...rest} />
    </FieldWrap>
  );
}

export function Select({
  label,
  error,
  hint,
  className = '',
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string; hint?: string }) {
  return (
    <FieldWrap label={label} error={error} hint={hint}>
      <select className={`${inputClass} ${className}`} {...rest}>
        {children}
      </select>
    </FieldWrap>
  );
}
