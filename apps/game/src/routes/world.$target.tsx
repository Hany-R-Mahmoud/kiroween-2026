import { createFileRoute, Link } from '@tanstack/react-router';
import { enterWorld } from '../server/functions';
import { useT } from '../i18n/useT';

// Stub world page: the loader asks the server, which applies the access rule and returns only the title (R3.4).
export const Route = createFileRoute('/world/$target')({
  loader: ({ params }) => enterWorld({ data: params.target }),
  component: World,
});

function World() {
  const { title } = Route.useLoaderData();
  const t = useT();
  return (
    <section aria-labelledby="world-heading" className="flex flex-col gap-4">
      <h1 id="world-heading" className="font-display text-3xl text-glow">
        {title}
      </h1>
      <p>{t('world.comingLater')}</p>
      <Link to="/" className="inline-flex min-h-11 items-center text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-glow">
        {t('world.back')}
      </Link>
    </section>
  );
}
