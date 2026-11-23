import { useEffect, useRef, useState, type ReactNode } from 'react';
import { stripMarks, type PlayView, type Reply, type SlotView } from '@kiroween/skeleton/client';
import { useT } from '../i18n/useT';
import type { WorldLayout } from '../layout/types.ts';
import { mediaUrl } from '../lib/media.ts';
import { activeSlot, atlasHref, hint1Marks, hotspotsOfScene, isHintable, needsLead, puzzleKey, replyLine, type WorldInfoHotspot, type WorldInfoScene } from '../lib/world.ts';
import { FearMeter } from './FearMeter';
import { HintArea } from './HintArea';
import { Marked } from './Marked';
import { SceneNav } from './SceneNav';
import { ScenePaintProvider } from './ScenePaint';
import { SceneViewer } from './SceneViewer';
import { SpiritCorner, SpiritPanel } from './SpiritPanel';
import { StartRetry } from './StartRetry';
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
  /** Set when the server refused the start because the tutorial is not done: the screen sends the player to the study. */
  onTutorial?: () => void;
  /** Dev only: outline every tap box with its id (`?layout=1`). */
  outline?: boolean;
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
}

const HEADING_ID = 'world-scene-heading';

/**
 * The World screen, drawn from props only (the route owns the server calls). Everything the player sees about the Run
 * comes from the server's view; this component never learns a role, a correct option or the true lead.
 */
export function WorldPlay(p: WorldPlayProps) {
  const t = useT();
  const pans = useRef(new Map<number, number>());
  const restartRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // The notice replaces the room the player was in, so focus moves to it; dismissing it hands focus back to the scene heading.
    if (p.restartNotice) restartRef.current?.focus();
  }, [p.restartNotice]);
  const { view } = p;
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
  const [hint1Texts, setHint1Texts] = useState<Record<string, string>>({});
  // The reply's `highlight` ids are kept the same way and mark hotspots until the puzzle is solved (F7). Only server ids.
  const [hint1Highlights, setHint1Highlights] = useState<Record<string, string[]>>({});
  const hint1Asked = useRef<string | null>(null);
  useEffect(() => {
    const asked = hint1Asked.current;
    if (p.reply?.kind !== 'hint1' || !asked) return;
    const { text, highlight } = p.reply;
    hint1Asked.current = null;
    setHint1Texts((prev) => ({ ...prev, [asked]: text }));
    setHint1Highlights((prev) => ({ ...prev, [asked]: highlight }));
  }, [p.reply]);
  const marked = hint1Marks(view, hint1Highlights);
  const step = (delta: -1 | 1) => {
    const next = p.sceneIndex + delta;
    if (next >= 0 && next < p.scenes.length) p.onScene(next);
  };

  return (
    <ScenePaintProvider>
    <div className="world-play" aria-busy={p.busy}>
      <div className="scene-screen">
      <div className="scene-topbar">
        <h1 className="scene-title font-display text-glow">{p.title}</h1>
        <SceneNav names={p.scenes.map((s) => stripMarks(s.name))} current={p.sceneIndex} onSelect={p.onScene} onHall={p.onHall} headingId={HEADING_ID} />
      </div>
      {scene && sceneLayout ? (
        <div className="world-stage">
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
            hint1Text={slot ? (slot.hint1?.text ?? hint1Texts[slot.slotId] ?? null) : null}
            hint2Href={slot?.hint2 ? atlasHref(origin, slot.hint2.anchor) : null}
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
      </div>
      </div>
      {p.restartNotice ? (
        <section ref={restartRef} tabIndex={-1} className="world-panel mood-worn" role="alert" aria-labelledby="world-restart-title">
          <h2 id="world-restart-title" className="font-display text-xl text-glow">
            {t('restart.title')}
          </h2>
          <p>{t('restart.body')}</p>
          <button type="button" className="world-button btn btn-secondary" onClick={() => {
              p.onDismissRestart();
              document.getElementById(HEADING_ID)?.focus();
            }}>
            {t('restart.again')}
          </button>
        </section>
      ) : null}
      {won && view ? <Ending view={view} title={p.title} relic={p.relic} mediaBase={p.mediaBase} onHall={p.onHall} /> : null}
      {slot && !won ? <Question slot={slot} view={view} legendId={p.legendId} mediaBase={p.mediaBase} busy={p.busy} onAnswer={p.onAnswer} reply={p.reply} /> : null}
      {view && !won ? (
        <>
          <Notebook view={view} onChoose={p.onChoose} />
          <Leads view={view} origin={origin} busy={p.busy} onFollow={p.onFollow} />
        </>
      ) : null}
      {view && p.failed ? (
        <p role="alert" className="text-danger-ink">
          {t('error.generic')}
        </p>
      ) : null}
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
    <section className="world-panel mood-worn" aria-labelledby="world-notebook-title">
      <h2 id="world-notebook-title" className="font-display text-xl text-glow">
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
    </section>
  );
}

function Leads({ view, origin, busy, onFollow }: { view: PlayView; origin: string; busy: boolean; onFollow: WorldPlayProps['onFollow'] }) {
  const t = useT();
  return (
    <section className="world-panel mood-worn" aria-labelledby="world-leads-title">
      <h2 id="world-leads-title" className="font-display text-xl text-glow">
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
    </section>
  );
}

function Ending({ view, title, relic, mediaBase, onHall }: { view: PlayView; title: string; relic: WorldPlayProps['relic']; mediaBase: string; onHall: () => void }) {
  const t = useT();
  const ended = view.ended;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const name = relic ? stripMarks(relic.name ?? t('world.relic.fallback', { title })) : null;
  return (
    <section ref={ref} tabIndex={-1} className="world-panel world-ending" aria-labelledby="world-win-title">
      <h2 id="world-win-title" className="font-display text-2xl text-glow">
        {t('world.win')}
      </h2>
      {ended?.curseText ? <p className="world-curse">
          <Marked text={ended.curseText} />
        </p> : null}
      {relic && name ? (
        <figure className="world-relic">
          <img src={mediaUrl(mediaBase, relic.assetId)} width={256} height={256} alt={t('world.relic.alt')} loading="lazy" decoding="async" />
          <figcaption>{t('world.relic', { name })}</figcaption>
        </figure>
      ) : null}
      {ended ? <p>{t('world.score', { n: ended.score })}</p> : null}
      {ended ? <p>{t('world.seed', { seed: ended.seed })}</p> : null}
      <button type="button" className="world-button btn btn-secondary" onClick={onHall}>
        {t('world.hall')}
      </button>
    </section>
  );
}
