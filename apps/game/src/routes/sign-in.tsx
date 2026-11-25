import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { signInEmail, signInGoogle } from '../auth/client';
import { buttonClass, Field, secondaryButtonClass } from '../components/Field';
import { useT } from '../i18n/useT';

export const Route = createFileRoute('/sign-in')({
  head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }),
  // Only `reason=world` is kept; anything else is dropped.
  validateSearch: (search: Record<string, unknown>): { reason?: 'world' } => (search.reason === 'world' ? { reason: 'world' } : {}),
  component: SignIn,
});

function SignIn() {
  const t = useT();
  const { reason } = Route.useSearch();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  // After a failed submit, focus the first field in error, else the form error.
  useEffect(() => {
    if (!attempt) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (first ?? formErrorRef.current)?.focus();
  }, [attempt]);

  function fail(next: { email?: string; password?: string; form?: string }) {
    setErrors(next);
    setAttempt((n) => n + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const missing = {
      ...(email.trim() ? {} : { email: t('error.emailInvalid') }),
      ...(password ? {} : { password: t('error.passwordRequired') }),
    };
    if (Object.keys(missing).length) return fail(missing);
    setBusy(true);
    setErrors({});
    const ok = await signInEmail(email.trim(), password).catch(() => false);
    setBusy(false);
    if (!ok) return fail({ form: t('error.signIn') });
    await router.invalidate();
    await router.navigate({ to: '/' });
  }

  return (
    <section aria-labelledby="sign-in-heading" className="panel page-narrow mx-auto flex max-w-sm flex-col gap-4">
      <h1 id="sign-in-heading" className="font-display text-3xl text-glow">
        {t('signIn.heading')}
      </h1>
      {reason === 'world' ? <p role="note">{t('signIn.reason')}</p> : null}
      <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={t('form.email')} name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email ?? null} />
        <Field label={t('form.password')} name="password" type="password" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password ?? null} />
        {errors.form ? (
          <p ref={formErrorRef} role="alert" tabIndex={-1} className="text-danger-ink">
            {errors.form}
          </p>
        ) : null}
        <button type="submit" className={buttonClass} disabled={busy}>
          {busy ? t('form.busy') : t('form.submitSignIn')}
        </button>
      </form>
      <p className="text-center text-muted">{t('form.or')}</p>
      <button type="button" className={secondaryButtonClass} disabled={busy} onClick={async () => (await signInGoogle().catch(() => false)) || fail({ form: t('error.generic') })}>
        {t('form.google')}
      </button>
      <Link to="/sign-up" className="link inline-flex min-h-11 items-center">
        {t('form.noAccount')}
      </Link>
    </section>
  );
}
