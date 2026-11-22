import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { useT } from '../i18n/useT';
import { Marked } from './Marked';

export interface HintAreaProps {
  /** Name of the active puzzle, or null when none is open (the area then asks the player to open one). */
  puzzle: string | null;
  /** False for a hidden, locked or solved puzzle (see `isHintable`): the area shows no buttons. */
  offered: boolean;
  busy: boolean;
  /** The Hint 1 text to show in the sheet, or null when none has been asked for. */
  hint1Text: string | null;
  /** The free chapter link, set once Hint 2 was used for this puzzle. */
  hint2Href: string | null;
  /** Set only after a charged Hint 2 whose tab the browser blocked: the sentence and the chapter link show. */
  blockedHref?: string | null;
  onHint1: () => void;
  onHint2: () => void;
}

/**
 * The one hint area of a puzzle set: one Hint 1 and one Hint 2 for the active puzzle. Busy uses `aria-disabled`
 * (never `disabled`) so keyboard focus is kept. The Hint 1 text opens in a sheet over the scene and does not push the page.
 */
export function HintArea({ puzzle, offered, busy, hint1Text, hint2Href, blockedHref = null, onHint1, onHint2 }: HintAreaProps) {
  const t = useT();
  // The sheet is open while there is text and the player has not closed that text for this puzzle.
  const sheetKey = `${puzzle ?? ''}\u0000${hint1Text ?? ''}`;
  const [closedKey, setClosedKey] = useState<string | null>(null);
  const sheetOpen = offered && hint1Text !== null && closedKey !== sheetKey;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && sheetOpen) setClosedKey(sheetKey);
  };
  // Keyboard focus is never dropped to the page (task 8.3): closing the sheet goes back to Hint 1, and when the Hint 2
  // button is replaced by the chapter link, a focus left on the page body moves to that link.
  const hint1Ref = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const link = hint2Href ?? blockedHref;
  useEffect(() => {
    if (link && document.activeElement === document.body) linkRef.current?.focus();
  }, [link]);

  if (!puzzle) {
    return (
      <div className="hint-area scene-hints">
        <p className="text-muted">{t('hint.area.pick')}</p>
      </div>
    );
  }
  if (!offered) return null;
  return (
    <div className="hint-area scene-hints" onKeyDown={onKey}>
      <p className="hint-puzzle text-muted">{puzzle}</p>
      <div className="hint-buttons">
        <button
          ref={hint1Ref}
          type="button"
          className="scene-button btn btn-secondary"
          aria-label={t('hint.1.named', { puzzle })}
          aria-disabled={busy || undefined}
          onClick={() => {
            if (busy) return;
            setClosedKey(null);
            onHint1();
          }}
        >
          {t('hint.1')}
        </button>
        {link ? (
          <a ref={linkRef} href={link} target="_blank" rel="noopener" className="scene-button btn btn-secondary" data-hint2-link="true" aria-label={t('hint.2.again.named', { puzzle })}>
            {t('hint.2.again')}
          </a>
        ) : (
          <button type="button" className="scene-button btn btn-secondary" aria-label={t('hint.2.named', { puzzle })} aria-disabled={busy || undefined} onClick={() => !busy && onHint2()}>
            {t('hint.2')}
          </button>
        )}
      </div>
      {blockedHref ? <p role="status" className="hint-blocked text-muted">{t('hint.2.blocked')}</p> : null}
      {sheetOpen ? (
        <div className="hint-sheet mood-worn" role="region" aria-label={t('hint.1')}>
          <p className="world-hint">
            <Marked text={hint1Text} />
          </p>
          <button type="button" className="scene-button btn btn-ghost" onClick={() => {
              setClosedKey(sheetKey);
              hint1Ref.current?.focus();
            }}>
            {t('tut.close')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
