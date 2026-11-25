import { useId, useState } from 'react';
import type { Ref } from 'react';
import { useT } from '../i18n/useT';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  name: string;
  type: 'text' | 'email' | 'password';
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  inputRef?: Ref<HTMLInputElement>;
}

/** A labelled input with its hint and error tied to it for screen readers. Logical spacing only. */
export function Field({ label, hint, error, name, type, autoComplete, value, onChange, inputRef }: FieldProps) {
  const t = useT();
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [shown, setShown] = useState(false);
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  const isPassword = type === 'password';
  const input = (
    <input
      id={id}
      ref={inputRef}
      name={name}
      type={isPassword && shown ? 'text' : type}
      autoComplete={autoComplete}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      className="field min-w-0 flex-1"
    />
  );
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-ui text-sm">
        {label}
      </label>
      {isPassword ? (
        <div className="flex items-stretch gap-2">
          {input}
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            aria-pressed={shown}
            aria-controls={id}
            aria-label={shown ? t('form.hidePassword') : t('form.showPassword')}
            onClick={() => setShown((s) => !s)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
              {shown ? null : <path d="M4 4l16 16" />}
            </svg>
          </button>
        </div>
      ) : (
        input
      )}
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-danger-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const buttonClass = 'btn btn-primary';
export const secondaryButtonClass = 'btn btn-secondary';
