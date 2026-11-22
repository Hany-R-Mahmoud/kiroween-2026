import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { signInEmail, signInGoogle } from '../auth/client';
import { buttonClass, Field, secondaryButtonClass } from '../components/Field';
import { useT } from '../i18n/useT';

export const Route = createFileRoute('/sign-in')({ component: SignIn });

function SignIn() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await signInEmail(email.trim(), password).catch(() => false);
    setBusy(false);
    if (!ok) return setError(t('error.signIn'));
    await router.invalidate();
    await router.navigate({ to: '/' });
  }

  return (
    <section aria-labelledby="sign-in-heading" className="page-narrow mx-auto flex max-w-sm flex-col gap-4">
      <h1 id="sign-in-heading" className="font-display text-3xl text-glow">
        {t('signIn.heading')}
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={t('form.email')} name="email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <Field label={t('form.password')} name="password" type="password" autoComplete="current-password" value={password} onChange={setPassword} error={error} />
        <button type="submit" className={buttonClass} disabled={busy}>
          {busy ? t('form.busy') : t('form.submitSignIn')}
        </button>
      </form>
      <p className="text-center text-muted">{t('form.or')}</p>
      <button type="button" className={secondaryButtonClass} disabled={busy} onClick={async () => (await signInGoogle().catch(() => false)) || setError(t('error.generic'))}>
        {t('form.google')}
      </button>
      <Link to="/sign-up" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
        {t('form.noAccount')}
      </Link>
    </section>
  );
}
