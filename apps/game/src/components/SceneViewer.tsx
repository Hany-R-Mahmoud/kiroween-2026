import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { stripMarks } from '@kiroween/skeleton/client';
import { useT } from '../i18n/useT.ts';
import { clampPan, panToReveal } from '../lib/pan.ts';
import { mediaUrl } from '../lib/media.ts';
import { buttonPan, isDrag, keyPan, lostCaptureEndsDrag } from '../lib/viewerInput.ts';
import { MIN_TARGET_PX, SCENE_HEIGHT, SCENE_WIDTH, type SceneLayout } from '../layout/types.ts';
import { Hotspot } from './Hotspot.tsx';
import './scene.css';

const MIN_SCALE = 0.25;

export interface ViewerHotspot {
  /** Content hotspot id without the legend prefix; matches `HotspotBox.id`. */
  id: string;
  /** Accessible name (story text). */
  label: string;
  marked: boolean;
  /** Drawn overlay on the Hotspot (Hall doors). */
  badge?: 'lock' | 'signin';
}

interface SceneViewerProps {
  layout: SceneLayout;
  /** Scene name from content. Shown as the heading and used as the region's accessible name. */
  name: string;
  /** Scene alt text from content. */
  alt: string;
  /** Media base: empty for same origin, or the atlas origin. */
  mediaBase: string;
  hotspots: readonly ViewerHotspot[];
  onActivate: (hotspotId: string) => void;
  /** Id for the heading, so scene navigation can move focus to it. */
  headingId: string;
  /** Pan to start from (screen px, 0 or negative). */
  initialPan?: number;
  onPanChange?: (pan: number) => void;
  /** PageUp (-1) and PageDown (+1) while the viewer has focus. */
  onStep?: (delta: -1 | 1) => void;
  /** Dev only (`?layout=1`): outline every tap box with its id. Ignored in a production build. */
  outline?: boolean;
}

interface Drag {
  pointerId: number;
  startX: number;
  startPan: number;
  active: boolean;
}

/**
 * The pannable scene. Plain DOM: one wide image and absolutely placed buttons inside a clipped viewport.
 * Pan is physical x on purpose (fixed painted image; steering i18n-rtl.md exception), so the stage is `direction: ltr`.
 */
export function SceneViewer({ layout, name, alt, mediaBase, hotspots, onActivate, headingId, initialPan = 0, onPanChange, onStep, outline }: SceneViewerProps) {
  const t = useT();
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pan, setPanState] = useState(initialPan);

  const scale = size.height > 0 ? Math.max(MIN_SCALE, size.height / SCENE_HEIGHT) : MIN_SCALE;
  const sceneWidth = SCENE_WIDTH * scale;
  const minPan = Math.min(0, size.width - sceneWidth);

  const setPan = useCallback(
    (next: number) => {
      const clamped = clampPan(next, size.width, sceneWidth);
      setPanState(clamped);
      onPanChange?.(clamped);
    },
    [size.width, sceneWidth, onPanChange],
  );

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keep the pan inside bounds when the viewport or scale changes.
  useEffect(() => {
    setPanState((p) => clampPan(p, size.width, sceneWidth));
  }, [size.width, sceneWidth]);

  const endDrag = (e: ReactPointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (d.active) {
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      if (viewportRef.current?.hasPointerCapture(e.pointerId)) viewportRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startPan: pan, active: false };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    if (!d.active) {
      if (!isDrag(dx)) return;
      // Capture only after the threshold, so a plain tap still reaches the Hotspot button.
      d.active = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setPan(d.startPan + dx);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // PageUp and PageDown change scene from anywhere in the viewer; pan keys apply only when the viewport itself has focus.
    if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      onStep?.(e.key === 'PageUp' ? -1 : 1);
      return;
    }
    if (e.target !== e.currentTarget) return;
    const target = keyPan(e.key, pan, minPan);
    if (target === null) return;
    setPan(target);
    e.preventDefault();
  };
  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-hotspot]')?.dataset.hotspot;
    const box = layout.hotspots.find((b) => b.id === id);
    if (!box) return;
    setPan(panToReveal(pan, { x: box.x * scale, width: Math.max(MIN_TARGET_PX, box.w * scale) }, size.width, sceneWidth));
  };

  const byId = new Map(hotspots.map((h) => [h.id, h]));

  return (
    <section className="scene-viewer" aria-labelledby={headingId}>
      <h2 id={headingId} tabIndex={-1} className="scene-heading">
        {stripMarks(name)}
      </h2>
      <div
        ref={viewportRef}
        className="scene-viewport"
        role="region"
        aria-label={stripMarks(name)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={(e) => {
          if (lostCaptureEndsDrag(e.target, e.currentTarget)) endDrag(e);
        }}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div className="scene-stage" style={{ inlineSize: `${sceneWidth}px`, transform: `translateX(${pan}px)` }}>
          <img
            className="scene-image"
            src={mediaUrl(mediaBase, layout.assetId)}
            alt={stripMarks(alt)}
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            fetchPriority="high"
            draggable={false}
          />
          {layout.hotspots.map((box) => {
            const s = box.sprite;
            if (!s) return null;
            return (
              <span
                key={`sprite-${box.id}`}
                className="scene-sprite"
                style={{ transform: `translate(${s.x * scale}px, ${s.y * scale}px)`, inlineSize: `${s.w * scale}px`, blockSize: `${s.h * scale}px` }}
              >
                <img
                  src={mediaUrl(mediaBase, s.assetId)}
                  alt=""
                  width={s.crop ? s.w * 2 : s.w}
                  height={s.h}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className={s.crop === 'right' ? 'scene-sprite-img scene-sprite-right' : s.crop ? 'scene-sprite-img scene-sprite-half' : 'scene-sprite-img'}
                />
              </span>
            );
          })}
          {layout.hotspots.map((box) => {
            const h = byId.get(box.id);
            if (!h) return null;
            return <Hotspot key={box.id} box={box} label={h.label} marked={h.marked} badge={h.badge} markedText={t('hint.mark')} scale={scale} onActivate={onActivate} />;
          })}
          {import.meta.env.DEV && outline
            ? layout.hotspots.map((box) => (
                <span
                  key={`outline-${box.id}`}
                  className="scene-outline"
                  aria-hidden="true"
                  style={{ transform: `translate(${box.x * scale}px, ${box.y * scale}px)`, inlineSize: `${box.w * scale}px`, blockSize: `${box.h * scale}px` }}
                >
                  {box.id}
                </span>
              ))
            : null}
        </div>
      </div>
      <div className="scene-pan">
        <button type="button" className="scene-button" disabled={pan >= 0} onClick={() => setPan(buttonPan(pan, 1, size.width, sceneWidth))}>
          <span aria-hidden="true">{'‹'}</span>
          <span>{t('world.panLeft')}</span>
        </button>
        <button type="button" className="scene-button" disabled={pan <= minPan} onClick={() => setPan(buttonPan(pan, -1, size.width, sceneWidth))}>
          <span>{t('world.panRight')}</span>
          <span aria-hidden="true">{'›'}</span>
        </button>
      </div>
    </section>
  );
}
