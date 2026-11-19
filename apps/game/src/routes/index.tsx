import { createFileRoute, Link } from '@tanstack/react-router';
import { getHall } from '../server/functions';
import { useT } from '../i18n/useT';

export const Route = createFileRoute('/')({
  loader: () => getHall(),
  component: Hall,
});

const doorBase = 'flex min-h-11 flex-col gap-1 rounded border p-3';

function Hall() {
  const { name, tutorialOpen, doors } = Route.useLoaderData();
  const t = useT();
  return (
    <section aria-labelledby="hall-heading" className="flex flex-col gap-4">
      <h1 id="hall-heading" className="font-display text-3xl text-glow">
        {t('hall.heading')}
      </h1>
      <p>{t('hall.intro')}</p>
      <p className="text-muted">{name === null ? t('hall.guest') : t('hall.greeting', { name })}</p>
      <ul className="grid gap-3 sm:grid-cols-2">
        <li className={`${doorBase} border-accent`}>
          <span className="font-ui text-xs uppercase text-accent">{tutorialOpen ? t('door.open') : t('door.locked')}</span>
          <span>{t('hall.tutorial')}</span>
        </li>
        {doors.map((d) => (
          <li key={d.id}>
            {d.open ? (
              <Link to="/world/$target" params={{ target: d.id }} className={`${doorBase} border-accent hover:bg-surface focus-visible:outline-2 focus-visible:outline-glow`} aria-label={t('door.enter', { title: d.title })}>
                <span className="font-ui text-xs uppercase text-accent">{t('door.open')}</span>
                <span className="font-display text-xl">{d.title}</span>
                <span className="text-sm text-muted">{d.region}</span>
              </Link>
            ) : (
              <div className={`${doorBase} border-surface opacity-80`}>
                <span className="font-ui text-xs uppercase text-muted">{t('door.locked')}</span>
                <span className="font-display text-xl">{d.title}</span>
                <span className="text-sm text-muted">{d.region}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
