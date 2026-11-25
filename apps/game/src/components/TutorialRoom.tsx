import { useEffect, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { TutorialResponse } from '@kiroween/skeleton';
import { FEAR } from '@kiroween/skeleton/client';
import { fearLookOf } from '../layout/fearEvents.ts';
import { TUTORIAL_SCENE } from '../layout/tutorial.ts';
import { useT } from '../i18n/useT';
import { usePanelOpener } from '../lib/focus.ts';
import { mediaUrl } from '../lib/media.ts';
import {
  answerToSend,
  isWrongCode,
  KEY_ASSET,
  MIRROR_EVENT,
  TUTORIAL_CANDLE_ID,
  TUTORIAL_DRAWER_ID,
  TUTORIAL_LABEL,
  TUTORIAL_MIRROR_ID,
  TUTORIAL_TAP_TEXT,
  tutorialHint2Href,
} from '../lib/tutorial.ts';
import { FearMeter } from './FearMeter.tsx';
import { HintArea } from './HintArea.tsx';
import { Marked } from './Marked.tsx';
import { FearOverlay, type FearRequest } from './FearOverlay.tsx';
import { SceneNav } from './SceneNav.tsx';
import { ScenePaintProvider } from './ScenePaint.tsx';
import { SceneViewer, type ViewerHotspot } from './SceneViewer.tsx';
import { StartRetry } from './StartRetry.tsx';
import './scene.css';
import './tutorial.css';

export type TutorialPanel = { kind: 'object'; id: string } | { kind: 'drawer' };

interface TutorialRoomProps {
  /** The server's tutorial view; null while it loads. */
  view: TutorialResponse['view'] | null;
  /** The newest server reply, to show a refused code. */
  reply: TutorialResponse['reply'];
  /** The drawer question, once the server has given it. */
  question: string | null;
  mediaBase: string;
  /** Atlas origin for Hint 2 links (the same value as the media base). */
  atlasOrigin: string;
  reduced: boolean;
  busy: boolean;
  /** The last call failed. With no view yet, the loading line becomes a retry control. */
  failed: boolean;
  /** Runs the start call again. */
  onRetry: () => void;
  onDrawer: () => void;
  onHint2: () => void;
  /** Set after a charged Hint 2 whose tab was blocked: the chapter address. */
  blockedHref?: string | null;
  onAnswer: (value: string) => void;
  onHall: () => void;
  /** Starting panel and candle state; used by tests. */
  initialPanel?: TutorialPanel | null;
  initialLit?: boolean;
  /** The page heading (h1), shown in the top bar. */
  heading?: string;
}

/**
 * The tutorial room: the pannable study with seven tap regions, the pan prompt, hints, the drawer and the reward.
 * Theme: hub (the route wraps it with `theme={null}`). Every answer is checked by the server.
 */
export function TutorialRoom({ view, reply, question, mediaBase, atlasOrigin, reduced, busy, failed, onRetry, onDrawer, onHint2, blockedHref = null, onAnswer, onHall, initialPanel = null, initialLit = false, heading }: TutorialRoomProps) {
  const t = useT();
  const [panel, setPanel] = useState<TutorialPanel | null>(initialPanel);
  const [lit, setLit] = useState(initialLit);
  const [hint1On, setHint1On] = useState(false);
  const [code, setCode] = useState('');
  const [tapped, setTapped] = useState<string | null>(null);
  const [mirror, setMirror] = useState<FearRequest | null>(null);
  const mirrorCount = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const opener = usePanelOpener();
  const solved = view?.solved === true;
  const marked = new Set(hint1On && view ? view.hint1.highlight : []);

  const hotspots: ViewerHotspot[] = TUTORIAL_SCENE.hotspots.map((box) => ({
    id: box.id,
    label: t(TUTORIAL_LABEL[box.id] ?? 'tut.label.coat'),
    marked: marked.has(box.id),
  }));

  const activate = (id: string) => {
    opener.remember();
    setTapped(t(TUTORIAL_TAP_TEXT[id] ?? 'tap.nothing') || t('tap.nothing'));
    if (id === TUTORIAL_DRAWER_ID) {
      setPanel({ kind: 'drawer' });
      if (!solved && question === null) onDrawer();
      return;
    }
    if (id === TUTORIAL_CANDLE_ID) setLit(true);
    if (id === TUTORIAL_MIRROR_ID) {
      mirrorCount.current += 1;
      setMirror({ key: `tut-mirror-${mirrorCount.current}`, entry: MIRROR_EVENT, look: fearLookOf(null, MIRROR_EVENT.id), reducedMotionLine: null });
    }
    setPanel({ kind: 'object', id });
  };

  useEffect(() => {
    if (panel) panelRef.current?.focus();
  }, [panel]);

  const closePanel = () => {
    setPanel(null);
    opener.restore();
  };
  const onPanelKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closePanel();
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = answerToSend(code);
    if (v !== null && !busy) onAnswer(v);
  };

  const href = view?.hint2 ? tutorialHint2Href(view.hint2.anchor, atlasOrigin) : null;

  return (
    <ScenePaintProvider>
    <div className="flex flex-col gap-4" aria-busy={busy} data-lit={lit ? 'true' : 'false'} data-solved={solved ? 'true' : 'false'}>
      <div className="scene-screen">
      <div className="scene-topbar">
        {heading ? <h1 className="scene-title font-display text-glow">{heading}</h1> : null}
        <SceneNav names={[t('tut.heading')]} current={0} onSelect={() => {}} onHall={onHall} headingId="tutorial-heading" />
        <p className="scene-topbar-note" data-tutorial="goal">
          {t('tut.goal')}
        </p>
        <p className="scene-topbar-note text-muted" data-tutorial="pan-prompt">
          {t('tut.pan')}
        </p>
      </div>
      <div className="tutorial-stage">
        <SceneViewer
          layout={TUTORIAL_SCENE}
          name={t('tut.heading')}
          alt={t('tut.scene.alt')}
          mediaBase={mediaBase}
          hotspots={hotspots}
          onActivate={activate}
          headingId="tutorial-heading"
        />
        <FearOverlay request={mirror} reduced={reduced} />
      </div>
      <div className="scene-dock">
      {view ? (
        <FearMeter value={view.fear} mediaBase={mediaBase} />
      ) : failed ? (
        <StartRetry onRetry={onRetry} buttonClass="scene-button btn btn-secondary" />
      ) : (
        <p role="status">{t('loading.study')}</p>
      )}
      <p role="status" className="scene-pending text-muted" data-pending={view && busy ? 'true' : undefined}>
        {view && busy ? t('play.pending') : '\u00a0'}
      </p>
      <HintArea
        puzzle={t('tut.label.drawer')}
        fear={FEAR.tutorialHint2}
        offered={!!view && !solved}
        busy={busy}
        hint1Text={hint1On && view ? view.hint1.text : null}
        hint2Href={href}
        blockedHref={blockedHref}
        onHint1={() => setHint1On(true)}
        onHint2={onHint2}
      />
      <p role="status" className="scene-reply">
        {tapped ?? t('scene.reply.idle')}
      </p>
      </div>
      </div>
      {panel ? (
        <div ref={panelRef} className="hall-panel mood-worn" role="region" aria-labelledby="tutorial-panel-title" tabIndex={-1} onKeyDown={onPanelKey} data-panel={panel.kind}>
          {panel.kind === 'object' ? (
            <>
              <h3 id="tutorial-panel-title" className="font-display text-xl">
                {t(TUTORIAL_LABEL[panel.id] ?? 'tut.label.coat')}
              </h3>
              <p>{t(TUTORIAL_TAP_TEXT[panel.id] ?? 'tap.nothing')}</p>
            </>
          ) : (
            <>
              <h3 id="tutorial-panel-title" className="font-display text-xl">
                {t('tut.label.drawer')}
              </h3>
              {solved ? (
                <p>{t('tut.drawer.open')}</p>
              ) : (
                <form onSubmit={submit} className="flex flex-col gap-3">
                  <div className="book-paper rounded p-3" data-testid="tutorial-question">
                    <p>{question === null ? t('loading.study') : <Marked text={question} />}</p>
                  </div>
                  <label className="flex flex-col gap-1" htmlFor="tutorial-code">
                    <span>{t('tut.drawer.prompt')}</span>
                    <input
                      id="tutorial-code"
                      className="tutorial-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={40}
                      value={code}
                      aria-label={t('tut.drawer.label')}
                      aria-invalid={isWrongCode(reply) ? 'true' : undefined}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </label>
                  <button type="submit" className="scene-button btn btn-secondary" disabled={question === null || answerToSend(code) === null} aria-disabled={busy || undefined}>
                    {t('tut.drawer.submit')}
                  </button>
                  {isWrongCode(reply) ? (
                    <p role="alert" className="text-danger-ink">
                      {t('tut.drawer.wrong')}
                    </p>
                  ) : null}
                </form>
              )}
            </>
          )}
          <button type="button" className="scene-button btn btn-secondary" onClick={closePanel}>
            {t('tut.close')}
          </button>
        </div>
      ) : null}
      {solved ? (
        <section className="hall-panel mood-worn tutorial-reward" aria-labelledby="tutorial-reward-title" data-reward="true">
          <h3 id="tutorial-reward-title" className="font-display text-xl">
            {t('tut.reward')}
          </h3>
          <img src={mediaUrl(mediaBase, KEY_ASSET)} width={96} height={96} alt="" loading="lazy" decoding="async" />
          <ul className="hall-cabinet" aria-label={t('tut.slot.glow')}>
            <li className="hall-cabinet-slot" data-glow="true">
              <span>{t('tut.reward.line')}</span>
            </li>
          </ul>
          <button type="button" className="scene-button btn btn-secondary" onClick={onHall}>
            {t('tut.toHall')}
          </button>
        </section>
      ) : null}
    </div>
    </ScenePaintProvider>
  );
}
