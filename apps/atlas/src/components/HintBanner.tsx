import { useState } from 'react';
import type { Translate } from '../i18n/t';

/** Slim bar shown when the atlas was opened from a game hint. Offers a way back to the game tab. */
export function HintBanner({ t }: { t: Translate }) {
  const [closeFailed, setCloseFailed] = useState(false);

  const back = () => {
    // The game cuts `opener`, so focus is a best effort; closing the script-opened tab is what returns the player.
    window.opener?.focus();
    window.close();
    // A tab that is still here after a short delay could not be closed (e.g. opened by the fallback link).
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') setCloseFailed(true);
    }, 150);
  };

  return (
    <div role="note" className="hint-banner">
      <p className="hint-banner-text">{t('hint.banner.text')}</p>
      <button type="button" className="btn btn-secondary hint-banner-btn" onClick={back}>
        {t('hint.banner.back')}
      </button>
      {closeFailed && (
        <p role="status" className="hint-banner-status">
          {t('hint.banner.closeFailed')}
        </p>
      )}
    </div>
  );
}
