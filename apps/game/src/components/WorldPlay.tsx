import { useEffect, useRef } from 'react';
import { stripMarks, type PlayView, type Reply, type SlotView } from '@kiroween/skeleton/client';
import { useT } from '../i18n/useT';
import type { WorldLayout } from '../layout/types.ts';
import { mediaUrl } from '../lib/media.ts';
import { activeSlot, atlasHref, hotspotsOfScene, needsLead, puzzleKey, tapSentence, type WorldInfoHotspot, type WorldInfoScene } from '../lib/world.ts';
import { FearMeter } from './FearMeter';
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
  onAnswer: (slotId: string, option: 0 | 1 | 2 | 3) => void;
  onFollow: (leadId: string) => void;
  onDismissRestart: () => void;
  onHall: () => void;
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
  const tap = tapSentence(p.reply, t);
  const origin = p.mediaBase;
  const step = (delta: -1 | 1) => {
    const next = p.sceneIndex + delta;
    if (next >= 0 && next < p.scenes.length) p.onScene(next);
  };

  return (
    <ScenePaintProvider>
    <div className="world-play" aria-busy={p.busy}>
      <h1 className="font-display text-3xl text-glow">{p.title}</h1>
      <SceneNav names={p.scenes.map((s) => stripMarks(s.name))} current={p.sceneIndex} onSelect={p.onScene} onHall={p.onHall} headingId={HEADING_ID} />
      {view ? (
        <div className="world-fear">
          <FearMeter value={view.fear} mediaBase={p.mediaBase} />
        </div>
      ) : p.failed ? (
        <StartRetry onRetry={p.onRetry} onTutorial={p.onTutorial} buttonClass="world-button" />
      ) : (
        <p role="status">{t('loading.room')}</p>
      )}
      {view && p.busy ? (
        <p role="status" className="world-pending text-muted">
          {t('play.pending')}
        </p>
      ) : null}
      {p.restartNotice ? (
        <section ref={restartRef} tabIndex={-1} className="world-panel mood-worn" role="alert" aria-labelledby="world-restart-title">
          <h2 id="world-restart-title" className="font-display text-xl text-glow">
            {t('restart.title')}
          </h2>
          <p>{t('restart.body')}</p>
          <button type="button" className="world-button" onClick={() => {
              p.onDismissRestart();
              document.getElementById(HEADING_ID)?.focus();
            }}>
            {t('restart.again')}
          </button>
        </section>
      ) : null}
      {scene && sceneLayout ? (
        <div className="world-stage">
          <SceneViewer
            key={scene.id}
            layout={sceneLayout}
            name={stripMarks(scene.name)}
            alt={stripMarks(scene.alt)}
            mediaBase={p.mediaBase}
            hotspots={hotspotsOfScene(p.hotspots, scene.id).map((h) => ({ id: h.id, label: stripMarks(h.name), marked: p.marked.has(h.id) }))}
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
        </div>
      ) : (
        <p>{t('world.noLayout')}</p>
      )}
      {tap ? (
        <section className="world-panel mood-worn" aria-label={t('world.result')} role="status">
          <p>
            <Marked text={tap} />
          </p>
        </section>
      ) : null}
      {won && view ? <Ending view={view} title={p.title} relic={p.relic} mediaBase={p.mediaBase} onHall={p.onHall} /> : null}
      {slot && !won ? <Question slot={slot} view={view} legendId={p.legendId} mediaBase={p.mediaBase} busy={p.busy} onAnswer={p.onAnswer} reply={p.reply} /> : null}
      {view && !won ? (
        <>
          <Notebook view={view} origin={origin} busy={p.busy} onChoose={p.onChoose} onHint1={p.onHint1} onHint2={p.onHint2} />
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
      <ul className="world-options">
        {(slot.options ?? []).map((text, i) => (
          <li key={i}>
            <button
              type="button"
              className="world-button world-option"
              disabled={tried.has(i)}
              aria-disabled={busy || undefined}
              onClick={() => {
                if (!busy) onAnswer(slot.slotId, i as 0 | 1 | 2 | 3);
              }}
            >
              <Marked text={text} />
              {tried.has(i) ? <span className="sr-only">{t('world.option.tried')}</span> : null}
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

function Notebook({ view, origin, busy, onChoose, onHint1, onHint2 }: { view: PlayView; origin: string; busy: boolean; onChoose: WorldPlayProps['onChoose']; onHint1: WorldPlayProps['onHint1']; onHint2: WorldPlayProps['onHint2'] }) {
  const t = useT();
  return (
    <section className="world-panel mood-worn" aria-labelledby="world-notebook-title">
      <h2 id="world-notebook-title" className="font-display text-xl text-glow">
        {t('world.notebook')}
      </h2>
      <ol className="world-slots">
        {view.slots.map((s) => {
          const href = s.hint2 ? atlasHref(origin, s.hint2.anchor) : null;
          const hintable = s.state !== 'locked' && s.state !== 'solved';
          return (
            <li key={s.slotId} className="world-slot" data-state={s.state}>
              <p className="world-slot-title">{t('world.slot', { n: s.index, type: t(puzzleKey(s.type)) })}</p>
              <p className="text-muted">{t(`world.slot.${s.state}` as 'world.slot.open')}</p>
              {s.state === 'open' ? (
                <button type="button" className="world-button" onClick={() => onChoose(s.slotId)}>
                  {t('world.slot.show')}
                </button>
              ) : null}
              {hintable ? (
                <div className="world-actions">
                  <button type="button" className="world-button" aria-disabled={busy || undefined} onClick={() => !busy && onHint1(s.slotId)}>
                    {t('hint.1')}
                  </button>
                  {href ? (
                    <a className="world-button" href={href} target="_blank" rel="noopener">
                      {t('hint.2.again')}
                    </a>
                  ) : (
                    <button type="button" className="world-button" aria-disabled={busy || undefined} onClick={() => !busy && onHint2(s.slotId)}>
                      {t('hint.2')}
                    </button>
                  )}
                </div>
              ) : null}
              {s.hint1 ? <p className="world-hint">
                  <Marked text={s.hint1.text} />
                </p> : null}
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
              <button type="button" className="world-button" disabled={!l.canFollow} aria-disabled={busy || undefined} onClick={() => !busy && onFollow(l.leadId)}>
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
                        <a className="world-button" href={href} target="_blank" rel="noopener">
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
      <button type="button" className="world-button" onClick={onHall}>
        {t('world.hall')}
      </button>
    </section>
  );
}
