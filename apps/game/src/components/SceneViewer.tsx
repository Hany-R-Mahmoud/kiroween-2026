import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { stripMarks, useImageBase } from '@kiroween/skeleton/client';
import { MoodFog } from '@kiroween/skeleton/mood';
import { useT } from '../i18n/useT.ts';
import { clampPan, panToReveal } from '../lib/pan.ts';
import { imageAttrs, mediaUrl } from '../lib/media.ts';
import { buttonPan, isDrag, keyPan, lostCaptureEndsDrag } from '../lib/viewerInput.ts';
import { MIN_TARGET_PX, SCENE_HEIGHT, SCENE_WIDTH, type SceneLayout } from '../layout/types.ts';
import { Hotspot } from './Hotspot.tsx';
import { useScenePaint } from './ScenePaint.tsx';
import './scene.css';

const MIN_SCALE = 0.25;

export interface ViewerHotspot {
  /** Content hotspot id without the legend prefix; matches `HotspotBox.id`. */
  id: string;
  /** Accessible name (story text). */
  label: string;
  marked: boolean;
  /** Drawn overlay on the Hotspot (Hall doors). */
  badge?: 'lock' | 'signin' | 'free';
}

interface SceneViewerProps {
  layout: SceneLayout;
  /** Scene name from content. Shown as the heading and used as the region's accessible name. */
  name: string;
  /** Scene alt text from content. */
  alt: string;
  /** Media base: empty for same origin, or the atlas origin. */
  mediaBase: string;
  /** CSS width of the scene image for `sizes` (its CSS height times 8/3). Defaults to the world and tutorial screens. */
  imageSizes?: string;
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
/** Height steps of the CDN copies of a 4096x1536 scene; the width descriptors follow from the aspect ratio. */
const SCENE_HEIGHTS = [600, 900, 1200] as const;
/** The Hall scene is `--scene-h: clamp(18rem, 64dvh, 40rem)` tall (scene.css), so its image is that times 4096/1536 wide. */
export const HALL_SCENE_SIZES = 'clamp(48rem, 170.67dvh, 106.67rem)';
/** The world and tutorial scenes fill the space left under the top bar (scene.css `.scene-screen .scene-viewport`). */
export const SCENE_SCREEN_SIZES = 'min(110dvh, 100rem)';
export function SceneViewer({ layout, name, alt, mediaBase, imageSizes = SCENE_SCREEN_SIZES, hotspots, onActivate, headingId, initialPan = 0, onPanChange, onStep, outline }: SceneViewerProps) {
  const t = useT();
  const { loadedSceneId, onSceneSettled } = useScenePaint();
  const imageBase = useImageBase();
  // Dev only: the Hall and the tutorial read `?layout=1` from the address after hydration; the World screen passes `outline`.
  const [urlOutline, setUrlOutline] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV) setUrlOutline(new URLSearchParams(window.location.search).get('layout') === '1');
  }, []);
  const showOutline = outline ?? urlOutline;
  const imgRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  // A pan button that reaches the end becomes disabled and would drop keyboard focus; focus moves to the other one (task 8.3).
  const panLeftRef = useRef<HTMLButtonElement>(null);
  const panRightRef = useRef<HTMLButtonElement>(null);
  const panFocus = useRef<HTMLButtonElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pan, setPanState] = useState(initialPan);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const next = panFocus.current;
    panFocus.current = null;
    const a = document.activeElement;
    if (next && (a === document.body || (a instanceof HTMLButtonElement && a.disabled))) next.focus();
  }, [pan]);

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

  // The scene image can finish before hydration, so no load event would fire: settle once if it is already complete.
  useEffect(() => {
    if (imgRef.current?.complete) onSceneSettled(layout.assetId);
  }, [layout.assetId, onSceneSettled]);

  // Keep the pan inside bounds when the viewport or scale changes.
  useEffect(() => {
    setPanState((p) => clampPan(p, size.width, sceneWidth));
  }, [size.width, sceneWidth]);

  const endDrag = (e: ReactPointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (d.active) {
      setDragging(false);
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
      setDragging(true);
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
        className="scene-viewport mood-vignette-inset"
        data-scene-id={layout.sceneId}
        data-dragging={dragging || undefined}
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
            ref={imgRef}
            className="scene-image"
            {...imageAttrs(mediaBase, imageBase, layout.assetId, { axis: 'h', steps: SCENE_HEIGHTS, width: SCENE_WIDTH, height: SCENE_HEIGHT, sizes: imageSizes })}
            alt={stripMarks(alt)}
            width={SCENE_WIDTH}
            height={SCENE_HEIGHT}
            fetchPriority="high"
            draggable={false}
            onLoad={() => onSceneSettled(layout.assetId)}
            onError={() => onSceneSettled(layout.assetId)}
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
                {loadedSceneId === layout.assetId ? (
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
                ) : null}
              </span>
            );
          })}
          <MoodFog />
          {layout.hotspots.map((box) => {
            const h = byId.get(box.id);
            if (!h) return null;
            return <Hotspot key={box.id} box={box} label={h.label} marked={h.marked} badge={h.badge} markedText={t('hint.mark')} scale={scale} onActivate={onActivate} />;
          })}
          {import.meta.env.DEV && showOutline
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
        <button ref={panLeftRef} type="button" className="scene-button btn btn-secondary" disabled={pan >= 0} onClick={() => {
            panFocus.current = panRightRef.current;
            setPan(buttonPan(pan, 1, size.width, sceneWidth));
          }}>
          <span aria-hidden="true">{'‹'}</span>
          <span>{t('world.panLeft')}</span>
        </button>
        <button ref={panRightRef} type="button" className="scene-button btn btn-secondary" disabled={pan <= minPan} onClick={() => {
            panFocus.current = panLeftRef.current;
            setPan(buttonPan(pan, -1, size.width, sceneWidth));
          }}>
          <span>{t('world.panRight')}</span>
          <span aria-hidden="true">{'›'}</span>
        </button>
      </div>
    </section>
  );
}
