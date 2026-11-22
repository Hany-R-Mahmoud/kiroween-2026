import { Link } from '@tanstack/react-router';
import type { Translate } from '../i18n/t';

/** The atlas 404 (R9.3): unknown pages, unknown legends, unknown or malformed anchors, and anything under /game. */
export function NotFound({ t }: { t: Translate }) {
  return (
    <section aria-labelledby="not-found-title" className="measure mx-auto flex flex-col gap-4 px-4 py-16">
      <h1 id="not-found-title" className="text-4xl text-glow">
        {t('notFound.heading')}
      </h1>
      <p>{t('notFound.body')}</p>
      <p>
        <Link to="/" className="link">{t('notFound.home')}</Link>
      </p>
    </section>
  );
}
