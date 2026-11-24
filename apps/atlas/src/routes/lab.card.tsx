import { createFileRoute } from '@tanstack/react-router';
import { HoloCard } from '@kiroween/skeleton/shell';
import { useT } from '../i18n/useT';

// Hidden lab page: not linked, not in a sitemap, not in robots.txt. `noindex` keeps it out of search results.
export const Route = createFileRoute('/lab/card')({
  head: () => ({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] }),
  component: LabCard,
});

function LabCard() {
  const t = useT();
  return (
    <section className="lab-card-page">
      <HoloCard
        layers={{
          background: 'shell-card-true-bg-01',
          subject: 'shell-card-true-subject-01',
          frame: 'shell-card-frame-01',
          back: 'shell-card-back-01',
        }}
        strings={{
          title: t('shell.card.true.title'),
          line: t('shell.card.true.line'),
          link: t('shell.card.true.link'),
          name: t('shell.card.true.name'),
          turnBack: t('shell.card.turnBack'),
        }}
        href="/game/"
      />
    </section>
  );
}
