import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { FEAR, legendUrl, stripMarks, type PlayView, type Reply, type SlotView } from '@kiroween/skeleton/client';
import { useT } from '../i18n/useT';
import type { WorldLayout } from '../layout/types.ts';
import { mediaUrl } from '../lib/media.ts';
import { activeSlot, atlasHref, emptyHint1, hint1For, hintHref, hint1Marks, hotspotsOfScene, isHintable, needsLead, puzzleKey, replyLine, type WorldInfoHotspot, type WorldInfoScene } from '../lib/world.ts';
import { dialogKeyAction } from '../lib/focus.ts';
import { useDesktop } from '../lib/useMediaQuery.ts';
import { FearMeter } from './FearMeter';
import { HintArea } from './HintArea';
import { Marked } from './Marked';
import { SceneNav } from './SceneNav';
import { ScenePaintProvider } from './ScenePaint';
import { SceneViewer } from './SceneViewer';
import { SpiritCorner, SpiritPanel } from './SpiritPanel';
import { StartRetry } from './StartRetry';
import { WorldTabs, worldPanelId, worldTabId, type WorldTab } from './WorldTabs';
import './world.css';

export interface WorldPlayProps {
  legendId: string;
  title: string;
  mediaBase: string;
  scenes: readonly WorldInfoScene[];
  hotspots: readonly WorldInfoHotspot[];
  layout: WorldLayout | null;
  sceneIndex: number;
  onScene: (index: number) => void;
  view: PlayView | null;
  reply: Reply | null;
  marked: ReadonlySet<string>;
  relic: { assetId: string; name: string | null } | null;
  restartNotice: boolean;
  chosenSlot: string | null;
  busy: boolean;
  failed: boolean;
  /** Runs the start call again; offered when the first start failed and there is no view yet. */
  onRetry: () => void;
  /** Replays the player's last action; offered in the dock when an action failed after the room opened. */
  onRetryAction?: () => void;
  /** Set when the server refused the start because the tutorial is not done: the screen sends the player to the study. */
  onTutorial?: () => void;
  /** Dev only: outline every tap box with its id (`?layout=1`). */
  outline?: boolean;
  /** The Run number; it changes on a fear restart so per-Run screen memory (Hint 1) starts empty. */
  run: number;
  onChoose: (slotId: string) => void;
  onTap: (hotspotId: string) => void;
  onHint1: (slotId: string) => void;
  onHint2: (slotId: string) => void;
  /** Set after a charged Hint 2 whose tab was blocked: the slot it was for and the chapter address. */
  blocked?: { slotId: string; href: string } | null;
  onAnswer: (slotId: string, option: 0 | 1 | 2 | 3) => void;
  onFollow: (leadId: string) => void;
  onDismissRestart: () => void;
  onHall: () => void;
  /** Rendered inside the scene stage (the fear overlay), so it never sits over the notebook or dock. */
  overlay?: ReactNode;
  /** Rendered at the end of the top bar (the motion toggle). */
  motion?: ReactNode;
}

const PANELS: readonly WorldTab[] = ['question', 'notebook', 'leads'];
const HEADING_ID = 'world-scene-heading';

/**
 * The World screen, drawn from props only (the route owns the server calls). Everything the player sees about the Run
 * comes from the server's view; this component never learns a role, a correct option or the true lead.
 */
export function WorldPlay(p: WorldPlayProps) {
  const t = useT();
  const pans = useRef(new Map<number, number>());
  const restartRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // The overlay's button takes focus without scrolling; dismissing it hands focus back to the scene heading.
    if (p.restartNotice) restartRef.current?.focus({ preventScroll: true });
  }, [p.restartNotice]);
  const onRestartKey = (e: KeyboardEvent) => {
    // Escape is ignored on purpose: the only exit is the button.
    if (dialogKeyAction(e.key) === 'trap') {
      e.preventDefault();
      restartRef.current?.focus({ preventScroll: true });
    }
  };
  const { view } = p;
  const desktop = useDesktop();
  const [tab, setTab] = useState<WorldTab>('scene');
  const shown: WorldTab = desktop && tab === 'scene' ? 'question' : tab;
  // The sheet (below 64rem) takes focus when it opens.
  const lastShown = useRef<WorldTab>(shown);
  useEffect(() => {
    if (shown !== lastShown.current && shown !== 'scene' && !desktop) document.getElementById(worldPanelId(shown))?.focus();
    lastShown.current = shown;
  }, [shown, desktop]);
  const closeSheet = () => {
    setTab('scene');
    document.getElementById(worldTabId(shown))?.focus();
  };
  const sheetKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape' && !desktop) {
      e.stopPropagation();
      closeSheet();
    }
  };
  const won = view?.status === 'won';
  const scene = p.scenes[p.sceneIndex] ?? null;
  const sceneLayout = scene ? (p.layout?.scenes.find((s) => s.sceneId === scene.id) ?? null) : null;
  const slot = activeSlot(view, p.chosenSlot);
  // A solved puzzle closes its question; a keyboard focus left on the page body goes to the scene heading (task 8.3).
  const slotId = slot?.slotId ?? null;
  const lastSlot = useRef(slotId);
  useEffect(() => {
    if (slotId !== lastSlot.current && document.activeElement === document.body) document.getElementById(HEADING_ID)?.focus();
    lastSlot.current = slotId;
  }, [slotId]);
  const origin = p.mediaBase;
  // The server sends Hint 1 text in the reply, not in the view, so the screen keeps it per puzzle for the sheet.
  // The reply's `highlight` ids are kept the same way and mark hotspots until the puzzle is solved (F7). Only server ids.
  // Both are keyed by Run: a restart is a new Run with the same slot ids, so the old Run's text and marks must not show.
  const [store, setStore] = useState(() => emptyHint1(p.run));
  const hint1 = hint1For(store, p.run);
  const hint1Asked = useRef<string | null>(null);
  useEffect(() => {
    // A request still in flight for the old Run cannot be written into the new one.
    hint1Asked.current = null;
  }, [p.run]);
  useEffect(() => {
    const asked = hint1Asked.current;
    if (p.reply?.kind !== 'hint1' || !asked) return;
    const { text, highlight } = p.reply;
    hint1Asked.current = null;
    setStore((prev) => {
      const cur = hint1For(prev, p.run);
      return { ...cur, texts: { ...cur.texts, [asked]: text }, highlights: { ...cur.highlights, [asked]: highlight } };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.reply]);
  const ended = view?.status === 'won' || p.restartNotice;
  useEffect(() => {
    // A win or a fear restart puts the player back on the scene.
    if (ended) setTab('scene');
  }, [ended]);
  const marked = hint1Marks(view, hint1.highlights);
  const step = (delta: -1 | 1) => {
    const next = p.sceneIndex + delta;
    if (next >= 0 && next < p.scenes.length) p.onScene(next);
  };

  return (
    <ScenePaintProvider>
    <div className="world-play" aria-busy={p.busy}>
      <div className="scene-screen world-grid">
      <div className="scene-topbar">
        <h1 className="scene-title font-display text-glow">{p.title}</h1>
        <SceneNav names={p.scenes.map((s) => stripMarks(s.name))} current={p.sceneIndex} onSelect={p.onScene} onHall={p.onHall} headingId={HEADING_ID} />
        {p.motion ? <div className="world-motion">{p.motion}</div> : null}
      </div>
      {scene && sceneLayout ? (
        <div className="world-stage" id={worldPanelId('scene')}>
          <SceneViewer
            key={scene.id}
            layout={sceneLayout}
            name={stripMarks(scene.name)}
            alt={stripMarks(scene.alt)}
            mediaBase={p.mediaBase}
            hotspots={hotspotsOfScene(p.hotspots, scene.id).map((h) => ({ id: h.id, label: stripMarks(h.name), marked: marked.has(h.id) }))}
            onActivate={(id) => {
              // Taps are not gated: the client library queues them in order, so none is dropped.
              if (!won) p.onTap(id);
            }}
            headingId={HEADING_ID}
            initialPan={pans.current.get(p.sceneIndex) ?? 0}
            onPanChange={(x) => pans.current.set(p.sceneIndex, x)}
            onStep={step}
            outline={p.outline}
          />
          <SpiritCorner legendId={p.legendId} mediaBase={p.mediaBase} />
          {p.overlay}
        </div>
      ) : (
        <p>{t('world.noLayout')}</p>
      )}
      <div className="scene-dock">
        {view ? (
          <div className="world-fear">
            <FearMeter value={view.fear} mediaBase={p.mediaBase} />
          </div>
        ) : p.failed ? (
          <StartRetry onRetry={p.onRetry} onTutorial={p.onTutorial} buttonClass="world-button btn btn-secondary" />
        ) : (
          <p role="status">{t('loading.room')}</p>
        )}
        <p role="status" className="scene-pending text-muted" data-pending={view && p.busy ? 'true' : undefined}>
          {view && p.busy ? t('play.pending') : '\u00a0'}
        </p>
        {view && !won ? (
          <HintArea
            puzzle={slot ? t('world.slot', { n: slot.index, type: t(puzzleKey(slot.type)) }) : null}
            offered={isHintable(slot)}
            busy={p.busy}
            fear={FEAR.hint2}
            hint1Text={slot ? (slot.hint1?.text ?? hint1.texts[slot.slotId] ?? null) : null}
            hint2Href={slot?.hint2 ? hintHref(origin, slot.hint2.anchor) : null}
            blockedHref={slot && p.blocked?.slotId === slot.slotId ? p.blocked.href : null}
            onHint1={() => {
              if (!slot) return;
              hint1Asked.current = slot.slotId;
              p.onHint1(slot.slotId);
            }}
            onHint2={() => slot && p.onHint2(slot.slotId)}
          />
        ) : null}
        <p role="status" className="scene-reply">
          <Marked text={replyLine(p.reply, t)} />
        </p>
        {view && p.failed ? (
          <div role="alert" className="scene-error">
            <p className="text-danger-ink">{t('error.generic')}</p>
            <button type="button" className="world-button btn btn-secondary" onClick={p.onRetryAction}>
              {t('play.retry')}
            </button>
          </div>
        ) : null}
      </div>
      {view && !won ? (
        <div className="world-rail">
          <WorldTabs tab={shown} onSelect={setTab} />
          {PANELS.map((id) => (
            <div key={id} id={worldPanelId(id)} role="tabpanel" aria-labelledby={worldTabId(id)} tabIndex={-1} hidden={shown !== id} className="hall-panel world-sheet mood-worn" onKeyDown={sheetKey}>
              <button type="button" className="world-button btn btn-secondary world-sheet-close" onClick={closeSheet}>
                {t('world.sheet.close')}
              </button>
              {id === 'question' ? (
                slot ? (
                  <Question slot={slot} view={view} legendId={p.legendId} mediaBase={p.mediaBase} busy={p.busy} onAnswer={p.onAnswer} reply={p.reply} />
                ) : (
                  <p className="text-muted">{t('world.question.none')}</p>
                )
              ) : id === 'notebook' ? (
                <Notebook
                  view={view}
                  onChoose={(slotId) => {
                    p.onChoose(slotId);
                    setTab('question');
                  }}
                />
              ) : (
                <Leads view={view} origin={origin} busy={p.busy} onFollow={p.onFollow} />
              )}
            </div>
          ))}
        </div>
      ) : null}
      </div>
      {p.restartNotice ? (
        <div className="hall-ending world-overlay" role="alertdialog" aria-modal="true" aria-labelledby="world-restart-title" aria-describedby="world-restart-body" onKeyDown={onRestartKey}>
          <section className="world-panel mood-worn">
            <h2 id="world-restart-title" className="font-display text-xl text-glow">
              {t('restart.title')}
            </h2>
            <p id="world-restart-body">{t('restart.body')}</p>
            <button ref={restartRef} type="button" className="world-button btn btn-primary" onClick={() => {
                p.onDismissRestart();
                document.getElementById(HEADING_ID)?.focus();
              }}>
              {t('restart.again')}
            </button>
          </section>
        </div>
      ) : null}
      {won && view ? <Ending view={view} title={p.title} relic={p.relic} legendId={p.legendId} mediaBase={p.mediaBase} onHall={p.onHall} /> : null}
    </div>
    </ScenePaintProvider>
  );
}

function Question({ slot, view, legendId, mediaBase, busy, onAnswer, reply }: { slot: SlotView; view: PlayView | null; legendId: string; mediaBase: string; busy: boolean; onAnswer: WorldPlayProps['onAnswer']; reply: Reply | null }) {
  const t = useT();
  const tried = new Set(slot.tried ?? []);
  // A wrong answer disables the focused option; keyboard focus then moves to the first option still open (task 8.3).
  const listRef = useRef<HTMLUListElement>(null);
  const triedCount = useRef(tried.size);
  useEffect(() => {
    const a = document.activeElement;
    if (tried.size !== triedCount.current && (a === document.body || (a instanceof HTMLButtonElement && a.disabled))) listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    triedCount.current = tried.size;
  }, [tried.size]);
  const answered = reply && reply.kind === 'answer' && reply.slotId === slot.slotId ? reply : null;
  return (
    <SpiritPanel legendId={legendId} mediaBase={mediaBase}>
      {slot.final ? (
        <h2 className="font-display text-xl text-glow">{t('world.final')}</h2>
      ) : (
        <h2 className="font-display text-xl text-glow">{t('world.question')}</h2>
      )}
      <p className="world-spirit-line">{slot.final ? t('spirit.final') : t('spirit.ask')}</p>
      <p className="world-question">
        <Marked text={slot.question ?? ''} />
      </p>
      {slot.final && needsLead(view) ? <p>{t('spirit.needLead')}</p> : null}
      <ul ref={listRef} className="world-options">
        {(slot.options ?? []).map((text, i) => (
          <li key={i}>
            <button
              type="button"
              className="world-button world-option btn btn-secondary"
              disabled={tried.has(i)}
              aria-disabled={busy || undefined}
              onClick={() => {
                if (!busy) onAnswer(slot.slotId, i as 0 | 1 | 2 | 3);
              }}
            >
              <Marked text={text} />
              {tried.has(i) ? (
                <span className="world-tried">
                  <span aria-hidden="true">✕</span> {t('world.option.tried')}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {answered ? (
        <p role="status" className="world-spirit-line">
          {answered.correct ? t('spirit.right') : t('spirit.wrong')}
        </p>
      ) : null}
    </SpiritPanel>
  );
}

function Notebook({ view, onChoose }: { view: PlayView; onChoose: WorldPlayProps['onChoose'] }) {
  const t = useT();
  return (
    <>
      <h2 className="font-display text-xl text-glow">
        {t('world.notebook')}
      </h2>
      <ol className="world-slots">
        {view.slots.map((s) => {
          return (
            <li key={s.slotId} className="world-slot" data-state={s.state}>
              <p className="world-slot-title">{t('world.slot', { n: s.index, type: t(puzzleKey(s.type)) })}</p>
              <p className="text-muted">{t(`world.slot.${s.state}` as 'world.slot.open')}</p>
              {s.state === 'open' ? (
                <button type="button" className="world-button btn btn-secondary" onClick={() => onChoose(s.slotId)}>
                  {t('world.slot.show')}
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}

function Leads({ view, origin, busy, onFollow }: { view: PlayView; origin: string; busy: boolean; onFollow: WorldPlayProps['onFollow'] }) {
  const t = useT();
  return (
    <>
      <h2 className="font-display text-xl text-glow">
        {t('world.leads')}
      </h2>
      {view.leads.length === 0 ? <p className="text-muted">{t('world.leads.none')}</p> : null}
      <ul className="world-leads">
        {view.leads.map((l) => (
          <li key={l.leadId} className="world-lead">
            <h3 className="world-slot-title">{t('lead.title', { start: l.start })}</h3>
            <p className="text-muted">{t('lead.steps', { n: l.steps.length, total: l.total })}</p>
            <ol className="world-steps">
              {l.steps.map((s) => (
                <li key={s.n}>
                  <Marked text={s.text} />
                </li>
              ))}
            </ol>
            {l.followed ? null : (
              <button type="button" className="world-button btn btn-secondary" disabled={!l.canFollow} aria-disabled={busy || undefined} onClick={() => !busy && onFollow(l.leadId)}>
                {t('lead.follow')}
              </button>
            )}
            {l.followed?.kind === 'dead' ? (
              <div role="status" className="world-dead">
                <p>{t('lead.dead')}</p>
                <p>
                  <Marked text={l.followed.text} />
                </p>
                <ul className="world-actions">
                  {l.followed.anchors.map((a) => {
                    const href = atlasHref(origin, a);
                    return href ? (
                      <li key={a}>
                        <a className="world-button btn btn-secondary" href={href} target="_blank" rel="noopener">
                          {t('lead.deadProof')}
                        </a>
                      </li>
                    ) : null;
                  })}
                </ul>
              </div>
            ) : null}
            {l.followed?.kind === 'true' ? <p role="status">{t('lead.true')}</p> : null}
          </li>
        ))}
      </ul>
    </>
  );
}

export function Ending({ view, title, relic, legendId, mediaBase, onHall }: { view: PlayView; title: string; relic: WorldPlayProps['relic']; legendId: string; mediaBase: string; onHall: () => void }) {
  const t = useT();
  const ended = view.ended;
  const ref = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => ref.current?.focus({ preventScroll: true }), []);
  const legendHref = mediaBase.replace(/\/+$/, '') + legendUrl(legendId);
  const onKey = (e: KeyboardEvent) => {
    // Escape is ignored on purpose: the exits are the two controls. Tab and Shift+Tab cycle between them.
    if (dialogKeyAction(e.key) === 'trap') {
      e.preventDefault();
      const other = document.activeElement === ref.current ? linkRef.current : ref.current;
      other?.focus({ preventScroll: true });
    }
  };
  const name = relic ? stripMarks(relic.name ?? t('world.relic.fallback', { title })) : null;
  return (
    <div className="hall-ending world-overlay" role="dialog" aria-modal="true" aria-labelledby="world-win-title" onKeyDown={onKey}>
    <section className="world-panel world-ending">
      <h2 id="world-win-title" className="font-display text-2xl text-glow">
        {t('world.win')}
      </h2>
      <p>{t('world.win.line')}</p>
      {relic && name ? (
        <figure className="world-relic">
          <img src={mediaUrl(mediaBase, relic.assetId)} width={256} height={256} alt={t('world.relic.alt')} loading="lazy" decoding="async" />
          <figcaption>{t('world.relic', { name })}</figcaption>
        </figure>
      ) : null}
      {ended ? <p>{t('world.score', { n: ended.score })}</p> : null}
      {ended ? <p>{t('world.seed', { seed: ended.seed })}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button ref={ref} type="button" className="world-button btn btn-primary" onClick={onHall}>
          {t('world.hall')}
        </button>
        <a ref={linkRef} className="btn btn-ghost" href={legendHref}>
          {t('world.win.read')}
        </a>
      </div>
    </section>
    </div>
  );
}
