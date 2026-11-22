import { FEAR } from '@kiroween/skeleton/client';
import { useT } from '../i18n/useT';
import { mediaUrl } from '../lib/media.ts';
import { useScenePaint } from './ScenePaint.tsx';
import './fear.css';

export const FEAR_FRAME_ASSET = 'shared-game-ui-fear-01';

/** The meter value clamped to 0..FEAR.max and rounded, for both the fill and the text. */
export const clampFear = (n: number): number => (Number.isFinite(n) ? Math.min(FEAR.max, Math.max(0, Math.round(n))) : 0);

/**
 * The fear meter: frame image, a fill, and the same value as text ("Fear: n of 100") so it never relies on the picture.
 * The fill's inline size is the percentage; in RTL the fill grows from the inline start.
 */
export function FearMeter({ value, mediaBase }: { value: number; mediaBase: string }) {
  const t = useT();
  const { firstSceneLoaded } = useScenePaint();
  const n = clampFear(value);
  return (
    <div className="fear-meter-row">
    <div className="fear-meter">
      <div
        className="fear-meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={FEAR.max}
        aria-valuenow={n}
        aria-label={t('fear.meter', { n })}
      >
        <div className="fear-meter-fill" style={{ inlineSize: `${(n / FEAR.max) * 100}%` }} />
      </div>
      {firstSceneLoaded ? <img className="fear-meter-frame" src={mediaUrl(mediaBase, FEAR_FRAME_ASSET)} width={1024} height={256} alt="" loading="lazy" decoding="async" /> : null}
    </div>
      <span className="fear-meter-text" aria-hidden="true">{t('fear.meter', { n })}</span>
    </div>
  );
}
