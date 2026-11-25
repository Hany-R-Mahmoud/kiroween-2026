import { createFileRoute, getRouteApi, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { shareTags } from '@kiroween/skeleton/client';
import { translate } from '../i18n/t';
import { HallView, type HallTarget } from '../components/Hall';
import { ThemeRoot } from '../components/ThemeRoot';
import { useT } from '../i18n/useT';
import { cursesLeft, hallNotice, mergeBroken } from '../lib/hall';
import { guestHallState, playClientFor } from '../lib/play';
import { getHall } from '../server/functions';

export const Route = createFileRoute('/')({
  head: ({ matches }) => {
    const origin = (matches[0]?.loaderData as { siteOrigin?: string } | undefined)?.siteOrigin ?? '';
    const title = translate('en', 'app.title');
    const description = translate('en', 'hall.description');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        ...shareTags({ origin, title, description, imageAlt: translate('en', 'share.image.alt'), siteName: title }),
      ],
      // Absolute only: without PUBLIC_ORIGIN there is no canonical link, never a relative one.
      links: origin ? [{ rel: 'canonical', href: `${origin}/game/` }] : [],
    };
  },
  loader: () => getHall(),
  component: Hall,
});

const root = getRouteApi('__root__');

function Hall() {
  const data = Route.useLoaderData();
  const { mediaBase } = root.useLoaderData();
  const t = useT();
  const navigate = useNavigate();
  const router = useRouter();
  const signedIn = data.name !== null;
  // A guest's tutorial receipt and broken worlds live in the browser (R1.12, R2.12), so they are read after the first render.
  const [guest, setGuest] = useState({ tutorialDone: false, brokenWorlds: [] as string[] });

  useEffect(() => {
    if (!signedIn) {
      setGuest(guestHallState(window.localStorage));
      return;
    }
    // After sign-in, a stored tutorial receipt is sent once; the hall then reloads its data.
    void playClientFor(true)
      .redeemStoredReceipt()
      .then((redeemed) => (redeemed ? router.invalidate() : undefined));
  }, [signedIn, router]);

  const tutorialDone = signedIn ? data.tutorialDone === true : guest.tutorialDone;
  const broken = mergeBroken(data.brokenWorlds, signedIn ? [] : guest.brokenWorlds);
  const curses = cursesLeft(broken);
  const notice = hallNotice(signedIn, tutorialDone, data.doors);

  const onNavigate = (target: HallTarget) => {
    if (target.to === 'tutorial') void navigate({ to: '/tutorial' });
    else if (target.to === 'signin') void navigate({ to: '/sign-in' });
    else void navigate({ to: '/world/$target', params: { target: target.legendId } });
  };

  return (
    <ThemeRoot theme={null} className="flex flex-col gap-4">
      <HallView
        lines={
          <div className="hall-lines">
            <p>{t('hall.intro')}</p>
            {notice?.kind === 'study' ? <p>{t('hall.study.line')}</p> : null}
            {notice?.kind === 'guest' ? (
              <p className="flex flex-wrap items-center gap-3">
                <span>{t('hall.guest.line', { title: notice.freeTitle })}</span>
                <Link to="/sign-in" className="btn btn-secondary">
                  {t('nav.signIn')}
                </Link>
              </p>
            ) : null}
            {notice === null && data.name !== null ? <p>{t('hall.greeting', { name: data.name })}</p> : null}
          </div>
        }
        data={{ doors: data.doors, relics: data.relics, ledger: data.ledger, current: data.current }}
        mediaBase={mediaBase}
        tutorialDone={tutorialDone}
        broken={broken}
        curses={curses}
        guest={!signedIn}
        onNavigate={onNavigate}
      />
    </ThemeRoot>
  );
}
