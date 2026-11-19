import { useId } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  name: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
}

/** A labelled input with its hint and error tied to it for screen readers. Logical spacing only. */
export function Field({ label, hint, error, name, type, autoComplete, value, onChange }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-ui text-sm">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required
        className="min-h-11 rounded border border-muted bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-glow"
      />
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded bg-accent px-4 font-ui font-semibold text-bg hover:bg-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow disabled:opacity-60';
export const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center rounded border border-accent px-4 font-ui text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-glow disabled:opacity-60';
