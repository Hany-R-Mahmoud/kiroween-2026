import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { HUB_SCENE } from '../layout/hub.ts';
import { useLang, useT } from '../i18n/useT';
import type { MessageKey } from '../i18n/en';
import { cabinetSlots, clockKey, DECOY_RESULT, doorLegendId, doorReasonKey, hallDoorState, OBJECT_LABEL, type DoorState, type Relic } from '../lib/hall.ts';
import { dialogKeyAction, usePanelOpener } from '../lib/focus.ts';
import { mediaUrl } from '../lib/media.ts';
import { ScenePaintProvider } from './ScenePaint.tsx';
import { HALL_SCENE_SIZES, SceneViewer, type ViewerHotspot } from './SceneViewer.tsx';
import './scene.css';

export interface HallDoor {
  id: string;
  title: string;
  /** The server's access rule for this visitor (a user, or a guest at the guest world). */
  open: boolean;
  atlasHref: string;
}
export interface HallLedgerRow {
  id: string;
  title: string;
  status: string;
  seed: string;
}
export interface HallData {
  doors: readonly HallDoor[];
  relics: readonly Relic[];
  ledger: readonly HallLedgerRow[];
  current: { legendId: string; title: string; fear: number } | null;
}
export type HallPanel = { kind: 'ledger' } | { kind: 'clock' } | { kind: 'cabinet' } | { kind: 'decoy'; id: string } | { kind: 'door'; id: string };
export type HallTarget = { to: 'tutorial' } | { to: 'signin' } | { to: 'world'; legendId: string };

interface HallViewProps {
  data: HallData;
  mediaBase: string;
  tutorialDone: boolean;
  broken: readonly string[];
  curses: number;
  onNavigate: (target: HallTarget) => void;
  /** Starting panel; used by tests. */
  initialPanel?: HallPanel | null;
  /** A guest visitor: the free door reads "Free for guests". */
  guest?: boolean;
  /** The short `.hall-lines` block shown under the heading bar. */
  lines?: ReactNode;
}

const DAWN_ASSET = 'shared-game-ui-dawn-01';

/** The Hall: the pannable hub scene with its tap regions, the panels they open, and the ending screen. Theme: hub (null). */
export function HallView({ data, mediaBase, tutorialDone, broken, curses, onNavigate, initialPanel = null, guest = false, lines = null }: HallViewProps) {
  const t = useT();
  const lang = useLang();
  const [panel, setPanel] = useState<HallPanel | null>(initialPanel);
  const [endingSeen, setEndingSeen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const endingRef = useRef<HTMLButtonElement>(null);
  const opener = usePanelOpener();
  const endingOpener = usePanelOpener();
  const doorsById = new Map(data.doors.map((d) => [d.id, d]));

  const stateOf = (d: HallDoor): DoorState => hallDoorState(tutorialDone, d.open);

  const hotspots: ViewerHotspot[] = HUB_SCENE.hotspots.map((box) => {
    const legendId = doorLegendId(box.id);
    const door = legendId ? doorsById.get(legendId) : undefined;
    if (door) {
      const state = stateOf(door);
      const reason = doorReasonKey(state, guest);
      const label = reason === null ? t('hub.door.enter', { title: door.title }) : t('hub.door.stateNamed', { title: door.title, state: t(reason) });
      return { id: box.id, label, marked: false, badge: state === 'open' ? (guest ? 'free' : undefined) : state === 'locked' ? 'lock' : 'signin' };
    }
    return { id: box.id, label: t(OBJECT_LABEL[box.id] ?? 'hub.label.lamp'), marked: false };
  });

  const activate = (id: string) => {
    opener.remember();
    const legendId = doorLegendId(id);
    if (legendId) {
      const door = doorsById.get(legendId);
      if (!door) return;
      setPanel({ kind: 'door', id: legendId });
    } else if (id === 'hub-desk-ledger') setPanel({ kind: 'ledger' });
    else if (id === 'hub-clock') setPanel({ kind: 'clock' });
    else if (id === 'hub-cabinet') setPanel({ kind: 'cabinet' });
    else if (id in DECOY_RESULT) setPanel({ kind: 'decoy', id });
  };

  useEffect(() => {
    if (panel) panelRef.current?.focus();
  }, [panel]);
  const showEnding = curses === 0 && !endingSeen;
  useEffect(() => {
    if (!showEnding) return;
    endingOpener.remember();
    endingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once when the dialog appears; the opener object is new each render
  }, [showEnding]);
  const closeEnding = () => {
    setEndingSeen(true);
    endingOpener.restore();
  };
  const onEndingKey = (e: KeyboardEvent) => {
    const action = dialogKeyAction(e.key);
    if (action === 'close') closeEnding();
    else if (action === 'trap') {
      e.preventDefault();
      endingRef.current?.focus();
    }
  };

  const closePanel = () => {
    setPanel(null);
    opener.restore();
  };
  const onPanelKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closePanel();
  };

  return (
    <ScenePaintProvider>
    <div className="hall-scene flex flex-col gap-4">
      <div className="hall-bar">
        <h1 className="font-display text-glow" style={{ fontSize: 'var(--type-h1)', margin: 0 }}>
          {t('hall.heading')}
        </h1>
        <a
          href="/game/tutorial"
          className={tutorialDone ? 'btn btn-secondary' : 'btn btn-primary'}
          data-hall-action={tutorialDone ? 'secondary' : 'primary'}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
            e.preventDefault();
            onNavigate({ to: 'tutorial' });
          }}
        >
          {t(tutorialDone ? 'hall.study.again' : 'hall.start')}
        </a>
      </div>
      {lines}
      <SceneViewer layout={HUB_SCENE} name={t('hall.heading')} alt={t('hub.scene.alt')} mediaBase={mediaBase} imageSizes={HALL_SCENE_SIZES} hotspots={hotspots} onActivate={activate} headingId="hall-heading" />
      {panel ? (
        <div ref={panelRef} className="hall-panel mood-worn" role="region" aria-labelledby="hall-panel-title" tabIndex={-1} onKeyDown={onPanelKey} data-panel={panel.kind}>
          <PanelBody panel={panel} data={data} mediaBase={mediaBase} curses={curses} lang={lang} broken={broken} stateOf={stateOf} doorsById={doorsById} guest={guest} onNavigate={onNavigate} />
          <button type="button" className="scene-button btn btn-secondary" onClick={closePanel}>
            {t('hub.panel.close')}
          </button>
        </div>
      ) : null}
      <nav aria-labelledby="hall-legends-title" className="flex flex-col gap-2">
        <h2 id="hall-legends-title" className="font-display" style={{ fontSize: 'var(--type-h2)', margin: 0 }}>
          {t('hub.legends')}
        </h2>
        <ul className="flex flex-wrap gap-2 font-ui text-sm">
          {data.doors.map((d) => (
            <li key={d.id}>
              <a href={d.atlasHref} className="btn btn-ghost hall-door-link" title={d.title} aria-label={t('hub.door.readNamed', { title: d.title })}>
                {d.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <p className="text-sm text-muted" data-shared-line="true">
        {t('shared.line.before')}
        <a href={t('shared.line.href')} rel="noopener noreferrer" className="link inline-flex min-h-11 items-center">
          {t('shared.line.engine')}
          <span aria-hidden="true"> ↗</span>
          <span className="sr-only"> ({t('shared.line.external')})</span>
        </a>
        {t('shared.line.after')}
      </p>
      {showEnding ? (
        <div className="hall-ending" role="dialog" aria-modal="true" aria-labelledby="hall-ending-text" data-ending="true" onKeyDown={onEndingKey}>
          <img className="hall-ending-image" src={mediaUrl(mediaBase, DAWN_ASSET)} width={2400} height={1350} alt="" decoding="async" />
          <p id="hall-ending-text" className="hall-ending-text font-display">
            {t('hub.ending')}
          </p>
          <button ref={endingRef} type="button" className="scene-button btn btn-secondary" onClick={closeEnding}>
            {t('hub.ending.close')}
          </button>
        </div>
      ) : null}
    </div>
    </ScenePaintProvider>
  );
}

interface BodyProps {
  panel: HallPanel;
  data: HallData;
  mediaBase: string;
  curses: number;
  lang: string;
  broken: readonly string[];
  stateOf: (d: HallDoor) => DoorState;
  doorsById: ReadonlyMap<string, HallDoor>;
  guest: boolean;
  onNavigate: (target: HallTarget) => void;
}

function PanelBody({ panel, data, mediaBase, curses, lang, broken, stateOf, doorsById, guest, onNavigate }: BodyProps) {
  const t = useT();
  const heading = (text: string) => (
    <h3 id="hall-panel-title" className="font-display text-xl">
      {text}
    </h3>
  );
  switch (panel.kind) {
    case 'clock':
      // Hours left is the count of unbroken worlds. No timer runs.
      return (
        <>
          {heading(t('hub.label.clock'))}
          <p>{t(clockKey(curses, lang), { n: new Intl.NumberFormat(lang).format(curses) })}</p>
        </>
      );
    case 'ledger':
      return (
        <>
          {heading(t('hub.ledger.title'))}
          {data.current ? (
            <>
              <p>{t('hub.ledger.current', { title: data.current.title })}</p>
              <p>{t('hub.ledger.fear', { n: new Intl.NumberFormat(lang).format(data.current.fear) })}</p>
            </>
          ) : null}
          <p>{t('hub.ledger.curses', { n: new Intl.NumberFormat(lang).format(curses) })}</p>
          {data.ledger.length === 0 ? (
            <p>{t('hub.ledger.none')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {data.ledger.map((r) => (
                <li key={r.id}>{t('hub.ledger.run', { title: r.title, status: t(`status.${r.status}` as MessageKey), seed: r.seed })}</li>
              ))}
            </ul>
          )}
        </>
      );
    case 'cabinet': {
      const slots = cabinetSlots(data.relics, broken);
      return (
        <>
          {heading(t('hub.cabinet.title'))}
          <ul className="hall-cabinet">
            {slots.map((relic, i) => {
              const door = relic ? doorsById.get(relic.legendId) : undefined;
              const name = relic ? (relic.name ?? t('world.relic.fallback', { title: door?.title ?? relic.legendId })) : null;
              return (
                // The cabinet is a fixed list of twelve slots in door order, so the index is a stable key.
                <li key={i} className="hall-cabinet-slot" data-filled={relic ? 'true' : 'false'} aria-hidden={relic ? undefined : 'true'}>
                  {relic && name ? (
                    <>
                      <img src={mediaUrl(mediaBase, relic.assetId)} width={64} height={64} alt="" loading="lazy" decoding="async" />
                      <span>{name}</span>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      );
    }
    case 'decoy':
      return (
        <>
          {heading(t(OBJECT_LABEL[panel.id] ?? 'hub.label.lamp'))}
          <p>{t(DECOY_RESULT[panel.id] ?? 'hub.lamp')}</p>
        </>
      );
    case 'door': {
      const door = doorsById.get(panel.id);
      if (!door) return null;
      const state = stateOf(door);
      return (
        <>
          {heading(door.title)}
          {state === 'locked' ? <p>{t('hub.door.locked')}</p> : null}
          {state === 'signin' ? <p>{t('hub.door.signin')}</p> : null}
          {state === 'open' && guest ? <p>{t('hub.door.reason.free')}</p> : null}
          <div className="flex flex-wrap gap-3">
            {state === 'open' ? (
              <button type="button" className="scene-button btn btn-secondary" onClick={() => onNavigate({ to: 'world', legendId: door.id })}>
                {t('hub.door.enter', { title: door.title })}
              </button>
            ) : state === 'locked' ? (
              <button type="button" className="scene-button btn btn-secondary" onClick={() => onNavigate({ to: 'tutorial' })}>
                {t('hall.start')}
              </button>
            ) : (
              <button type="button" className="scene-button btn btn-secondary" onClick={() => onNavigate({ to: 'signin' })}>
                {t('nav.signIn')}
              </button>
            )}
            <a href={door.atlasHref} className="scene-button btn btn-secondary" aria-label={t('hub.door.readNamed', { title: door.title })}>
              {t('hub.door.read')}
            </a>
          </div>
        </>
      );
    }
  }
}
