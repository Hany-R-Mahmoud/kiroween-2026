import { createFileRoute } from '@tanstack/react-router';
import { translate, type Translate } from '../i18n/t';
import { useT } from '../i18n/useT';

/** Static page for the Google OAuth consent screen. English only; no data, no loader, no script of its own. */
const ISSUES_URL = 'https://github.com/Hany-R-Mahmoud/kiroween-2026/issues';

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: `${translate('en', 'privacy.title')} \u00b7 ${translate('en', 'app.title')}` },
      { name: 'description', content: translate('en', 'privacy.description') },
    ],
  }),
  component: () => <Privacy t={useT()} />,
});

export function Privacy({ t }: { t: Translate }) {
  return (
    <article aria-labelledby="privacy-heading" className="measure mx-auto flex flex-col gap-4 px-4 py-12">
      <h1 id="privacy-heading" className="text-4xl text-glow">
        {t('privacy.title')}
      </h1>
      <p className="font-ui text-sm text-muted">{t('privacy.updated')}</p>
      <p>{t('privacy.intro')}</p>

      <h2 className="mt-4 text-2xl">{t('privacy.atlas.h')}</h2>
      <p>{t('privacy.atlas.p')}</p>

      <h2 className="mt-4 text-2xl">{t('privacy.guest.h')}</h2>
      <p>{t('privacy.guest.p')}</p>

      <h2 className="mt-4 text-2xl">{t('privacy.account.h')}</h2>
      <p>{t('privacy.account.lead')}</p>
      <ul className="ms-6 list-disc">
        <li>{t('privacy.account.li1')}</li>
        <li>{t('privacy.account.li2')}</li>
      </ul>
      <p>{t('privacy.account.password')}</p>
      <p>{t('privacy.account.cookie')}</p>

      <h2 className="mt-4 text-2xl">{t('privacy.who.h')}</h2>
      <ul className="ms-6 list-disc">
        <li>{t('privacy.who.neon')}</li>
        <li>{t('privacy.who.vercel')}</li>
        <li>{t('privacy.who.imagekit')}</li>
        <li>{t('privacy.who.google')}</li>
      </ul>
      <p>{t('privacy.who.promise')}</p>

      <h2 className="mt-4 text-2xl">{t('privacy.choices.h')}</h2>
      <p>
        {t('privacy.choices.before')}
        <a href={ISSUES_URL} rel="noopener noreferrer" className="link">
          {ISSUES_URL}
        </a>
        {t('privacy.choices.after')}
      </p>

      <h2 className="mt-4 text-2xl">{t('privacy.changes.h')}</h2>
      <p>{t('privacy.changes.p')}</p>
    </article>
  );
}
