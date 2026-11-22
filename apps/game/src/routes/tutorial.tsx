import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { MotionToggle, useReducedMotion } from '../components/MotionToggle';
import { ThemeRoot } from '../components/ThemeRoot';
import { TutorialRoom } from '../components/TutorialRoom';
import { useT } from '../i18n/useT';
import { initialTutorialState, playClientFor, tutorialReducer, type PlayClient } from '../lib/play';
import { isTooManyTries } from '../lib/playClient';
import { tutorialHint2Href } from '../lib/tutorial';
import { applyHint2Reply, openBlankTab } from '../lib/hintTab';

export const Route = createFileRoute('/tutorial')({
  component: Tutorial,
});

const root = getRouteApi('__root__');

type Send = { bivarianceHack(c: PlayClient): ReturnType<PlayClient['actTutorial']> }['bivarianceHack'];

function Tutorial() {
  const { mediaBase, name } = root.useLoaderData();
  const t = useT();
  const navigate = useNavigate();
  const { reduced, setSetting } = useReducedMotion();
  const guest = name === null;
  const [state, dispatch] = useReducer(tutorialReducer, initialTutorialState);
  const [question, setQuestion] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const busy = pending > 0;
  const [failed, setFailed] = useState(false);
  const [tooMany, setTooMany] = useState(false);
  const [blockedHref, setBlockedHref] = useState<string | null>(null);
  const client = useRef<PlayClient | null>(null);

  const run = async (send: Send) => {
    client.current ??= playClientFor(guest);
    setPending((n) => n + 1);
    setFailed(false);
    setTooMany(false);
    try {
      const r = await send(client.current);
      dispatch(r);
      if (r.reply?.kind === 'drawer') setQuestion(r.reply.question);
      return r;
    } catch (e) {
      setTooMany(isTooManyTries(e));
      setFailed(true);
      return null;
    } finally {
      setPending((n) => n - 1);
    }
  };

  useEffect(() => {
    void run((c) => c.startTutorial());
    // One start per visit; a signed-in player and a guest both resume from the token the server issued.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const view = state.view;

  const onHint2 = () => {
    const tab = openBlankTab(); // synchronous, inside the click, before the server is asked
    setBlockedHref(null);
    void run((c) => c.actTutorial({ kind: 'hint2' })).then((r) => {
      // A null reply is a failure of any cause; a reply that is not a hint counts the same (no close() delay).
      setBlockedHref(applyHint2Reply(tab, r?.reply, (a) => tutorialHint2Href(a, mediaBase)));
    });
  };
  return (
    <ThemeRoot theme={null} className="flex flex-col gap-4">
      <TutorialRoom
        heading={t('hall.tutorial')}
        view={view}
        reply={state.reply}
        question={question}
        mediaBase={mediaBase}
        atlasOrigin={mediaBase}
        reduced={reduced}
        busy={busy}
        failed={failed}
        onRetry={() => void run((c) => c.startTutorial())}
        onDrawer={() => void run((c) => c.actTutorial({ kind: 'drawer' }))}
        onHint2={onHint2}
        blockedHref={blockedHref}
        onAnswer={(value) => void run((c) => c.actTutorial({ kind: 'answer', value }))}
        onHall={() => void navigate({ to: '/' })}
      />
      {view && failed ? (
        <p role="alert" className="text-danger-ink">
          {t(tooMany ? 'error.tooManyTries' : 'error.generic')}
        </p>
      ) : null}
      <MotionToggle reduced={reduced} onChange={setSetting} />
    </ThemeRoot>
  );
}
