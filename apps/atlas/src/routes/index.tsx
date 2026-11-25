import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { HoloCard, type HoloCardHandle } from '@kiroween/skeleton/shell';
import { shareTags } from '@kiroween/skeleton/client';
import { translate } from '../i18n/t';
import { useT } from '../i18n/useT';

// Entry page at `/`: two cards, Told (the atlas) and True (the game).
export const Route = createFileRoute('/')({
  head: ({ matches }) => {
    // Absolute URLs only from PUBLIC_ORIGIN, never from the request's Host header; without it, a relative canonical and no og:url.
    const origin = (matches[0]?.loaderData as { publicOrigin?: string } | undefined)?.publicOrigin ?? '';
    const title = translate('en', 'shell.entry.title');
    const description = translate('en', 'shell.entry.description');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        ...(origin ? [{ property: 'og:url', content: `${origin}/` }] : []),
        ...shareTags({
          origin,
          title,
          description,
          imageAlt: translate('en', 'share.image.alt'),
          siteName: translate('en', 'app.title'),
        }),
      ],
      links: [{ rel: 'canonical', href: origin ? `${origin}/` : '/' }],
    };
  },
  component: EntryPage,
});

// Live for one page load. Written only in effects and handlers, so the server never sets them.
let entrancePlayed = false;
let hintGone = false;

const SHARED = { frame: 'shell-card-frame-01', back: 'shell-card-back-01' } as const;

function EntryPage() {
  const t = useT();
  const toldRef = useRef<HoloCardHandle>(null);
  const trueRef = useRef<HoloCardHandle>(null);
  const [enter] = useState(() => !entrancePlayed);
  const [hidden, setHidden] = useState(() => hintGone);

  useEffect(() => {
    entrancePlayed = true;
  }, []);

  const onInteract = () => {
    hintGone = true;
    setHidden(true);
  };

  return (
    <section className="shell-page">
      <header className="shell-head">
        <h1 className="shell-name">{t('shell.entry.title')}</h1>
        <p className="shell-tagline">{t('shell.entry.tagline')}</p>
        <p className="shell-names">{t('shell.entry.names')}</p>
      </header>
      <div className="shell-cards">
        <div className="shell-slot" data-enter={enter ? '' : undefined} style={enter ? { ['--enter-delay' as string]: '0ms' } : undefined}>
          <HoloCard
            layers={{ background: 'shell-card-told-bg-01', subject: 'shell-card-told-subject-01', ...SHARED }}
            strings={{
              title: t('shell.card.told.title'),
              line: t('shell.card.told.line'),
              link: t('shell.card.told.link'),
              name: t('shell.card.told.name'),
            }}
            href="/legends"
            handleRef={toldRef}
            onInteract={onInteract}
            onFaceChange={(face) => {
              if (face === 'back') trueRef.current?.turnToFront({ quiet: true });
            }}
            sweepDelayMs={0}
          />
        </div>
        <div className="shell-slot" data-enter={enter ? '' : undefined} style={enter ? { ['--enter-delay' as string]: '120ms' } : undefined}>
          <HoloCard
            layers={{ background: 'shell-card-true-bg-01', subject: 'shell-card-true-subject-01', ...SHARED }}
            strings={{
              title: t('shell.card.true.title'),
              line: t('shell.card.true.line'),
              link: t('shell.card.true.link'),
              name: t('shell.card.true.name'),
            }}
            href="/game/"
            handleRef={trueRef}
            onInteract={onInteract}
            onFaceChange={(face) => {
              if (face === 'back') toldRef.current?.turnToFront({ quiet: true });
            }}
            sweepDelayMs={enter ? 120 : 0}
          />
        </div>
      </div>
      {hidden ? null : (
        <>
          <p className="shell-hint shell-hint-pointer">{t('shell.entry.hint.pointer')}</p>
          <p className="shell-hint shell-hint-touch">{t('shell.entry.hint.touch')}</p>
        </>
      )}
    </section>
  );
}
