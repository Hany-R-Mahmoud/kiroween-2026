import { createFileRoute, getRouteApi, isRedirect, useNavigate } from '@tanstack/react-router';
import { useEffect, useReducer, useRef, useState } from 'react';
import { FearOverlay, type FearRequest } from '../components/FearOverlay';
import { MotionToggle, useReducedMotion } from '../components/MotionToggle';
import { ThemeRoot } from '../components/ThemeRoot';
import { WorldPlay } from '../components/WorldPlay';
import { fontLinks } from '../fonts';
import { fearEventsOf, worldLayout } from '../layout';
import { initialWorldState, playClientFor, worldReducer, type PlayClient } from '../lib/play';
import { isTutorialRequired } from '../lib/playClient';
import { applyHint2Reply, openBlankTab } from '../lib/hintTab';
import { themeColorMeta } from '../lib/theme';
import { chooseFearEvent, hintHref, markedIds, reducedLineOf, triggerOf, type FearContext } from '../lib/world';
import { getWorldInfo } from '../server/functions';
import type { Action } from '@kiroween/skeleton/client';

export const Route = createFileRoute('/world/$target')({
  // `?layout=1` shows the tap boxes in a dev build only (the overlay code is dead in production).
  validateSearch: (search: Record<string, unknown>): { layout?: 1 } => (search.layout === 1 || search.layout === '1' ? { layout: 1 } : {}),
  // The server applies the access rule: a guest at a world other than the guest world is redirected and gets no data (R3.4).
  loader: ({ params }) => getWorldInfo({ data: params.target }),
  head: ({ loaderData }) => ({
    meta: loaderData ? themeColorMeta(loaderData.theme) : [],
    links: loaderData ? fontLinks(loaderData.theme.families) : [],
  }),
  component: World,
});

const root = getRouteApi('__root__');

type Started = Awaited<ReturnType<PlayClient['start']>>;
interface Send {
  (client: PlayClient): Promise<Started>;
}

function World() {
  const info = Route.useLoaderData();
  const search = Route.useSearch();
  const { mediaBase, name } = root.useLoaderData();
  const navigate = useNavigate();
  const { reduced, setSetting } = useReducedMotion();
  const [state, dispatch] = useReducer(worldReducer, initialWorldState);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  // Calls queue in the client library, so several can be pending at once; the screen is busy until all are done.
  const [pending, setPending] = useState(0);
  const busy = pending > 0;
  const [failed, setFailed] = useState(false);
  const [needsTutorial, setNeedsTutorial] = useState(false);
  const [blocked, setBlocked] = useState<{ slotId: string; href: string } | null>(null);
  const [fear, setFear] = useState<FearRequest | null>(null);
  const client = useRef<PlayClient | null>(null);
  const played = useRef(new Set<string>());
  const runNo = useRef(0);
  // The Run number as state, so WorldPlay can key what it remembers (Hint 1) by Run.
  const [runState, setRunState] = useState(0);
  const entries = fearEventsOf(info.id);

  const play = (ctx: FearContext) => {
    const entry = chooseFearEvent(entries, ctx, played.current);
    if (!entry) return;
    played.current.add(entry.id);
    setFear({ key: `${runNo.current}:${entry.id}`, entry, reducedMotionLine: reducedLineOf(info.fearEvents, entry) });
  };

  const run = async (send: Send) => {
    client.current ??= playClientFor(name === null);
    setPending((n) => n + 1);
    setFailed(false);
    try {
      const r = await send(client.current);
      dispatch({ kind: 'response', response: r });
      if (r.ended?.status === 'restarted') {
        // A new Seed: the room starts over, so its events and chosen puzzle start over too.
        runNo.current += 1;
        setRunState(runNo.current);
        played.current = new Set();
        setChosen(null);
      }
      const ctx = triggerOf(r.reply);
      if (ctx) play(ctx);
      return r;
    } catch (e) {
      if (isRedirect(e)) void navigate({ to: '/sign-in', search: { reason: 'world' } });
      else {
        setNeedsTutorial(isTutorialRequired(e));
        setFailed(true);
      }
      return null;
    } finally {
      setPending((n) => n - 1);
    }
  };
  // The last action, so the dock's Retry can replay it. Hint 2 sets its own entry (below) so a retry opens a new tab in the click.
  const last = useRef<(() => void) | null>(null);
  const act = (action: Action) => {
    last.current = () => void act(action);
    return run((c) => c.act(info.id, action));
  };

  useEffect(() => {
    // One start per visit: a signed-in player resumes from the server, a guest from the token in this browser.
    void run((c) => c.start(info.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.id]);

  const onScene = (index: number) => {
    setSceneIndex(index);
    if (state.view) play({ kind: 'scene-enter', scene: index + 1 });
  };

  const onHint2 = (slotId: string) => {
    const tab = openBlankTab(); // synchronous, inside the click, before the server is asked
    setBlocked(null);
    void act({ kind: 'hint2', slotId }).then((r) => {
      // A null reply is a failure of any cause; a reply that is not a hint counts the same.
      const href = applyHint2Reply(tab, r?.reply, (a) => hintHref(mediaBase, a));
      setBlocked(href ? { slotId, href } : null);
    });
    last.current = () => onHint2(slotId);
  };
  return (
    <ThemeRoot theme={info.theme} className="world-root">
      <WorldPlay
        legendId={info.id}
        title={info.title}
        mediaBase={mediaBase}
        scenes={info.scenes}
        hotspots={info.hotspots}
        layout={worldLayout(info.id)}
        run={runState}
        sceneIndex={sceneIndex}
        onScene={onScene}
        view={state.view}
        reply={state.reply}
        marked={markedIds(state.view)}
        relic={info.relic}
        restartNotice={state.restartNotice}
        chosenSlot={chosen}
        busy={busy}
        failed={failed}
        onRetry={() => void run((c) => c.start(info.id))}
        onRetryAction={() => last.current?.()}
        onTutorial={needsTutorial ? () => void navigate({ to: '/tutorial' }) : undefined}
        outline={import.meta.env.DEV && search.layout === 1}
        onChoose={setChosen}
        onTap={(hotspotId) => void act({ kind: 'tap', hotspotId })}
        onHint1={(slotId) => void act({ kind: 'hint1', slotId })}
        onHint2={onHint2}
        blocked={blocked}
        onAnswer={(slotId, option) => void act({ kind: 'answer', slotId, option })}
        onFollow={(leadId) => void act({ kind: 'follow', leadId })}
        onDismissRestart={() => dispatch({ kind: 'dismiss-restart' })}
        onHall={() => void navigate({ to: '/' })}
        overlay={<FearOverlay request={fear} reduced={reduced} />}
        motion={<MotionToggle reduced={reduced} onChange={setSetting} />}
      />
    </ThemeRoot>
  );
}
