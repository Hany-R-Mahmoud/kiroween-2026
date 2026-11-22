import { createFileRoute, getRouteApi, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { HallView, type HallTarget } from '../components/Hall';
import { ThemeRoot } from '../components/ThemeRoot';
import { useT } from '../i18n/useT';
import { cursesLeft, mergeBroken } from '../lib/hall';
import { guestHallState, playClientFor } from '../lib/play';
import { getHall } from '../server/functions';

export const Route = createFileRoute('/')({
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

  const onNavigate = (target: HallTarget) => {
    if (target.to === 'tutorial') void navigate({ to: '/tutorial' });
    else if (target.to === 'signin') void navigate({ to: '/sign-in' });
    else void navigate({ to: '/world/$target', params: { target: target.legendId } });
  };

  return (
    <ThemeRoot theme={null} className="flex flex-col gap-4">
      <h1 className="font-display text-3xl text-glow">{t('app.title')}</h1>
      <p>{t('hall.intro')}</p>
      <p className="text-sm text-muted">{data.name === null ? t('hall.guest') : t('hall.greeting', { name: data.name })}</p>
      <HallView
        data={{ doors: data.doors, relics: data.relics, ledger: data.ledger, current: data.current }}
        mediaBase={mediaBase}
        tutorialDone={tutorialDone}
        broken={broken}
        curses={curses}
        onNavigate={onNavigate}
      />
    </ThemeRoot>
  );
}
