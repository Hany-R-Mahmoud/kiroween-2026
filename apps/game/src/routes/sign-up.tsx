import { cleanDisplayName } from '@kiroween/skeleton/client';
import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { signInGoogle, signUpEmail } from '../auth/client';
import { buttonClass, Field, secondaryButtonClass } from '../components/Field';
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // checked here for quick feedback; the server checks the name again before it reaches Neon
    const next = {
      ...(cleanDisplayName(name) ? {} : { name: t('error.nameInvalid') }),
      ...(EMAIL.test(email.trim()) ? {} : { email: t('error.emailInvalid') }),
      ...(password.length >= 8 ? {} : { password: t('error.passwordShort') }),
    };
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    const result = await signUpEmail(name, email.trim(), password).catch(() => 'failed' as const);
    setBusy(false);
    if (result === 'bad-name') return setErrors({ name: t('error.nameInvalid') });
    if (result === 'failed') return setErrors({ form: t('error.signUp') });
    await router.invalidate();
    await router.navigate({ to: '/' });
  }

  return (
    <section aria-labelledby="sign-up-heading" className="page-narrow mx-auto flex max-w-sm flex-col gap-4">
      <h1 id="sign-up-heading" className="font-display text-3xl text-glow">
        {t('signUp.heading')}
      </h1>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={t('form.name')} hint={t('form.nameHint')} name="name" type="text" autoComplete="nickname" value={name} onChange={setName} error={errors.name ?? null} />
        <Field label={t('form.email')} name="email" type="email" autoComplete="email" value={email} onChange={setEmail} error={errors.email ?? null} />
        <Field label={t('form.password')} hint={t('form.passwordHint')} name="password" type="password" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password ?? null} />
        {errors.form ? (
          <p role="alert" className="text-danger-ink">
            {errors.form}
          </p>
        ) : null}
        <button type="submit" className={buttonClass} disabled={busy}>
          {busy ? t('form.busy') : t('form.submitSignUp')}
        </button>
      </form>
      <p className="text-center text-muted">{t('form.or')}</p>
      <button type="button" className={secondaryButtonClass} disabled={busy} onClick={async () => (await signInGoogle().catch(() => false)) || setErrors({ form: t('error.generic') })}>
        {t('form.google')}
      </button>
      <Link to="/sign-in" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4">
        {t('form.haveAccount')}
      </Link>
    </section>
  );
}
