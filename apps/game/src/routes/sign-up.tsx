import { cleanDisplayName } from '@kiroween/skeleton/client';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { signUpEmail } from '../auth/client';
import { buttonClass, Field } from '../components/Field';
import { GoogleSignIn } from '../components/GoogleSignIn';
import { useT } from '../i18n/useT';

export const Route = createFileRoute('/sign-up')({ head: () => ({ meta: [{ name: 'robots', content: 'noindex' }] }), component: SignUp });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SignUp() {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const formErrorRef = useRef<HTMLParagraphElement>(null);

  // After a failed submit, focus the first field in error, else the form error.
  useEffect(() => {
    if (!attempt) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (first ?? formErrorRef.current)?.focus();
  }, [attempt]);

  function fail(next: typeof errors) {
    setErrors(next);
    setAttempt((n) => n + 1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // checked here for quick feedback; the server checks the name again before it reaches Neon
    const next = {
      ...(cleanDisplayName(name) ? {} : { name: t('error.nameInvalid') }),
      ...(EMAIL.test(email.trim()) ? {} : { email: t('error.emailInvalid') }),
      ...(password.length >= 8 ? {} : { password: t('error.passwordShort') }),
    };
    if (Object.keys(next).length) return fail(next);
    setErrors({});
    setBusy(true);
    const result = await signUpEmail(name, email.trim(), password).catch(() => 'failed' as const);
    setBusy(false);
    if (result === 'bad-name') return fail({ name: t('error.nameInvalid') });
    if (result === 'failed') return fail({ form: t('error.signUp') });
    await router.invalidate();
    await router.navigate({ to: '/' });
  }

  return (
    <section aria-labelledby="sign-up-heading" className="panel page-narrow mx-auto flex max-w-sm flex-col gap-4">
      <h1 id="sign-up-heading" className="font-display text-3xl text-glow">
        {t('signUp.heading')}
      </h1>
      <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={t('form.name')} hint={t('form.nameHint')} name="name" type="text" autoComplete="nickname" value={name} onChange={setName} error={errors.name ?? null} />
        <Field label={t('form.email')} name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email ?? null} />
        <Field label={t('form.password')} hint={t('form.passwordHint')} name="password" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password ?? null} />
        {errors.form ? (
          <p ref={formErrorRef} role="alert" tabIndex={-1} className="text-danger-ink">
            {errors.form}
          </p>
        ) : null}
        <button type="submit" className={buttonClass} disabled={busy}>
          {busy ? t('form.busy') : t('form.submitSignUp')}
        </button>
      </form>
      <p className="text-center text-muted">{t('form.or')}</p>
      <GoogleSignIn busy={busy} onBusy={setBusy} onError={() => fail({ form: t('error.generic') })} />
      <Link to="/sign-in" className="link inline-flex min-h-11 items-center">
        {t('form.haveAccount')}
      </Link>
      {/* plain anchor: /privacy is an atlas page, outside this app's /game base path */}
      <a href="/privacy" className="link inline-flex min-h-11 items-center text-sm">
        {t('form.privacy')}
      </a>
    </section>
  );
}
