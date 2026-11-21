import type { CSSProperties, ReactNode } from 'react';
import { mediaUrl } from '../lib/media.ts';
import { useScenePaint } from './ScenePaint.tsx';
import './fear.css';

export const SPIRIT_FRAME_ASSET = 'shared-game-ui-frame-01';
/** The shared paper texture the panel text sits on; it waits for the scene like the frame does. */
export const PAPER_ASSET = 'shared-atlas-paper-01';
/** `<legend-id>-game-spirit-01` is the full figure and `-02` the close one. */
export const spiritAsset = (legendId: string, variant: 'full' | 'close'): string => `${legendId}-game-spirit-${variant === 'full' ? '01' : '02'}`;

/** The full figure in the scene's corner. Decorative (no spirit prose, no names). */
export function SpiritCorner({ legendId, mediaBase }: { legendId: string; mediaBase: string }) {
  const { firstSceneLoaded } = useScenePaint();
  return (
    <div className="spirit-corner">
      {firstSceneLoaded ? <img src={mediaUrl(mediaBase, spiritAsset(legendId, 'full'))} width={1600} height={2400} alt="" loading="lazy" decoding="async" /> : null}
    </div>
  );
}

/**
 * The question panel: the close figure beside the question, inside the dialog frame. Children hold the question text,
 * options and reaction line, all passed in so this part owns only the picture and the frame.
 */
export function SpiritPanel({ legendId, mediaBase, children }: { legendId: string; mediaBase: string; children: ReactNode }) {
  const { firstSceneLoaded } = useScenePaint();
  return (
    <section className="spirit-panel" style={firstSceneLoaded ? { backgroundImage: `url("${mediaUrl(mediaBase, SPIRIT_FRAME_ASSET)}")` } : undefined}>
      <div
        className="spirit-panel-body spirit-caption book-paper"
        style={firstSceneLoaded ? ({ '--book-paper-image': `url("${mediaUrl(mediaBase, PAPER_ASSET)}")` } as CSSProperties) : undefined}
      >{children}</div>
      <div className="spirit-close">
        {firstSceneLoaded ? <img src={mediaUrl(mediaBase, spiritAsset(legendId, 'close'))} width={1600} height={2400} alt="" loading="lazy" decoding="async" /> : null}
      </div>
    </section>
  );
}
