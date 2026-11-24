import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type KeyboardEvent,
  type TransitionEvent,
} from 'react';
import { assetUrl } from '../assets/assetUrl.ts';
import { useImageBase } from '../assets/imageBaseContext.ts';
import { imageUrl, responsiveImage } from '../assets/imageCdn.ts';
import { ART, BG_ART, HOLO_SIZES, HOLO_STEPS } from './holo/geometry.ts';
import { createMotion, type Face, type MotionController } from './holo/motion.ts';
import type { HoloRenderer } from './holo/renderer.ts';
import { useReducedMotion } from './holo/useReducedMotion.ts';

/** All visible text comes from the caller. The component has no literal UI text. */
export interface HoloCardStrings {
  title: string;
  line: string;
  link: string;
  /** Accessible name of the front button. */
  name: string;
  turnBack: string;
}

/** Asset ids of the four card layers. */
export interface HoloCardLayers {
  background: string;
  subject: string;
  frame: string;
  back: string;
}

export interface HoloCardProps {
  layers: HoloCardLayers;
  strings: HoloCardStrings;
  href: string;
  className?: string;
}

/** Longest wait for `transitionend` before focus moves anyway. */
const FOCUS_FALLBACK_MS = 900;

type ImgAttrs = Pick<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'srcSet' | 'sizes' | 'crossOrigin' | 'width' | 'height'
>;

/** Image attributes for one layer. With a CDN base: responsive copies and anonymous CORS. Without: the local URL. */
function layerAttrs(id: string, base: string, size: { w: number; h: number }): ImgAttrs {
  const responsive = responsiveImage({
    id,
    base,
    axis: 'w',
    steps: HOLO_STEPS,
    width: size.w,
    height: size.h,
    sizes: HOLO_SIZES,
  });
  if (responsive) {
    return {
      src: responsive.src,
      srcSet: responsive.srcSet,
      sizes: responsive.sizes,
      crossOrigin: 'anonymous',
      width: size.w,
      height: size.h,
    };
  }
  return {
    src: base ? imageUrl(id, base) : assetUrl(id),
    crossOrigin: base ? 'anonymous' : undefined,
    width: size.w,
    height: size.h,
  };
}

export function HoloCard({ layers, strings, href, className }: HoloCardProps) {
  const base = useImageBase();
  const reduced = useReducedMotion();

  const [face, setFace] = useState<Face>('front');
  const [armed, setArmed] = useState(false);

  const sceneRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const motionRef = useRef<MotionController | null>(null);
  const rendererRef = useRef<HoloRenderer | null>(null);
  const bgImgRef = useRef<HTMLImageElement>(null);
  const subjectImgRef = useRef<HTMLImageElement>(null);
  const frameImgRef = useRef<HTMLImageElement>(null);
  const backImgRef = useRef<HTMLImageElement>(null);
  const focusTimer = useRef(0);
  // Where focus goes once the flip settles. Null when nothing is pending.
  const pendingFocus = useRef<'front' | 'back' | null>(null);
  // Last face reported by the motion controller. The `face` state follows it.
  const settledFace = useRef<Face>('front');

  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  // Motion controller: created after hydration, destroyed on unmount.
  useEffect(() => {
    const scene = sceneRef.current;
    const tilt = tiltRef.current;
    const flip = flipRef.current;
    if (!scene || !tilt || !flip) return undefined;
    const motion = createMotion({
      scene,
      tilt,
      flip,
      reduced: reducedRef.current,
      // Called only when the spin has come to rest. Inert state and focus follow this face.
      onSettle: (next) => {
        if (next === settledFace.current) return;
        settledFace.current = next;
        pendingFocus.current = next;
        setFace(next);
      },
    });
    motionRef.current = motion;
    return () => {
      motion.destroy();
      motionRef.current = null;
    };
  }, []);

  // WebGL renderer: lazy chunk, loaded after hydration once the front images are decoded.
  // Any failure leaves the HTML layers in place.
  useEffect(() => {
    const scene = sceneRef.current;
    const host = frontRef.current;
    const background = bgImgRef.current;
    const subject = subjectImgRef.current;
    const frame = frameImgRef.current;
    if (!scene || !host || !background || !subject || !frame) return undefined;

    let cancelled = false;
    let idleHandle = 0;
    let idleIsCallback = false;
    const cleanups: Array<() => void> = [];

    const ready = (img: HTMLImageElement): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const settle = (): void => {
          if (img.naturalWidth === 0) {
            reject(new Error('image failed'));
            return;
          }
          // decode() can reject for an already-usable image; the load is what matters.
          img.decode().then(resolve, resolve);
        };
        if (img.complete) {
          settle();
          return;
        }
        const onLoad = (): void => {
          cleanup();
          settle();
        };
        const onError = (): void => {
          cleanup();
          reject(new Error('image failed'));
        };
        const cleanup = (): void => {
          img.removeEventListener('load', onLoad);
          img.removeEventListener('error', onError);
        };
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);
        cleanups.push(cleanup);
      });

    const start = async (): Promise<void> => {
      const motion = motionRef.current;
      if (!motion || cancelled) return;
      const { createHoloRenderer } = await import('./holo/renderer.ts');
      if (cancelled) return;
      const created = createHoloRenderer({
        scene,
        host,
        images: { background, subject, frame },
        motion,
        reduced: reducedRef.current,
        onFailure: () => {
          rendererRef.current = null;
        },
      });
      if (!created) return;
      if (cancelled) {
        created.destroy();
        return;
      }
      rendererRef.current = created;
      created.setReduced(reducedRef.current);
    };

    const schedule = (): void => {
      if (cancelled) return;
      const run = (): void => {
        start().catch(() => {
          // Chunk or renderer failure: the HTML layers stay.
        });
      };
      if (typeof window.requestIdleCallback === 'function') {
        idleIsCallback = true;
        idleHandle = window.requestIdleCallback(run, { timeout: 2000 });
      } else {
        idleHandle = window.setTimeout(run, 200);
      }
    };

    Promise.all([ready(background), ready(subject), ready(frame)]).then(schedule, () => {
      // An image errored (for example CORS): stay on the HTML fallback.
    });

    return () => {
      cancelled = true;
      for (const fn of cleanups) fn();
      if (idleIsCallback) window.cancelIdleCallback(idleHandle);
      else window.clearTimeout(idleHandle);
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  // Never empty: each layer shows once its image has decoded (or at hydration if it is already complete).
  useEffect(() => {
    const imgs = [bgImgRef.current, subjectImgRef.current, frameImgRef.current, backImgRef.current];
    const cleanups: Array<() => void> = [];
    let gone = false;
    // Hiding not-yet-decoded layers only applies once script runs: without JS the server HTML stays visible.
    sceneRef.current?.setAttribute('data-js', '');
    for (const img of imgs) {
      if (!img || img.hasAttribute('data-ready')) continue;
      const mark = (): void => {
        if (!gone && img.naturalWidth > 0) img.setAttribute('data-ready', '');
      };
      if (img.complete && img.naturalWidth > 0) {
        mark();
        continue;
      }
      const onLoad = (): void => {
        // decode() can reject for a usable image; the load is what matters.
        img.decode().then(mark, mark);
      };
      img.addEventListener('load', onLoad);
      cleanups.push(() => img.removeEventListener('load', onLoad));
    }
    return () => {
      gone = true;
      for (const fn of cleanups) fn();
    };
  }, [armed]);

  useEffect(() => {
    motionRef.current?.setReduced(reduced);
    rendererRef.current?.setReduced(reduced);
  }, [reduced]);

  useEffect(
    () => () => {
      window.clearTimeout(focusTimer.current);
    },
    [],
  );

  const settleFocus = useCallback(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    window.clearTimeout(focusTimer.current);
    (target === 'back' ? linkRef.current : frontRef.current)?.focus();
  }, []);

  // Focus moves once per change of the settled face, after the inert attributes have been updated.
  useEffect(() => {
    if (!pendingFocus.current) return;
    if (reducedRef.current) {
      // Crossfade: wait for the opacity transition, with a timer as a safety net.
      window.clearTimeout(focusTimer.current);
      focusTimer.current = window.setTimeout(settleFocus, FOCUS_FALLBACK_MS);
    } else {
      settleFocus();
    }
  }, [face, settleFocus]);

  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>): void => {
    if (event.propertyName !== 'opacity' || !reducedRef.current) return;
    settleFocus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && face === 'back') {
      event.preventDefault();
      motionRef.current?.turnBy(-1);
    }
  };

  const arm = (): void => {
    if (!armed) setArmed(true);
  };

  const back = layerAttrs(layers.back, base, ART);
  const backImg: ImgAttrs = armed
    ? back
    : { crossOrigin: back.crossOrigin, width: back.width, height: back.height };

  const rootClass = className ? `holo-scene ${className}` : 'holo-scene';

  return (
    <div
      ref={sceneRef}
      className={rootClass}
      onPointerEnter={arm}
      onPointerDown={arm}
      onFocus={arm}
      onKeyDown={onKeyDown}
    >
      <div ref={tiltRef} className="holo-tilt">
        <div className="holo-shadow" aria-hidden="true" />
        <div ref={flipRef} className="holo-flip" data-face={face} onTransitionEnd={onTransitionEnd}>
          <button
            ref={frontRef}
            type="button"
            className="holo-front holo-face"
            aria-label={strings.name}
            inert={face === 'back'}
            onClick={() => motionRef.current?.turnBy(1)}
          >
            <span className="holo-art" aria-hidden="true">
              <img
                ref={bgImgRef}
                className="holo-layer holo-layer-bg"
                alt=""
                decoding="async"
                draggable={false}
                {...layerAttrs(layers.background, base, BG_ART)}
              />
              <img
                ref={subjectImgRef}
                className="holo-layer holo-layer-subject"
                alt=""
                decoding="async"
                draggable={false}
                {...layerAttrs(layers.subject, base, ART)}
              />
              <img
                ref={frameImgRef}
                className="holo-layer holo-layer-frame"
                alt=""
                decoding="async"
                draggable={false}
                {...layerAttrs(layers.frame, base, ART)}
              />
              <span className="holo-fx" />
            </span>
            <span className="holo-title" aria-hidden="true">
              {strings.title}
            </span>
          </button>
          <div className="holo-back holo-face" inert={face === 'front'}>
            <img
              ref={backImgRef}
              className="holo-back-img"
              alt=""
              decoding="async"
              draggable={false}
              {...backImg}
            />
            <div className="holo-back-body">
              <div className="holo-back-plate">
                <h2 className="holo-back-title">{strings.title}</h2>
                <p className="holo-back-line">{strings.line}</p>
                <div className="holo-back-actions">
                  <a ref={linkRef} className="btn btn-primary" href={href}>
                    {strings.link}
                  </a>
                  <button type="button" className="btn" onClick={() => motionRef.current?.turnBy(-1)}>
                    {strings.turnBack}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
