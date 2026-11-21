import { useT } from '../i18n/useT';
/**
 * Shown in place of the loading line when the first start call fails: says so and offers to start again. When the
 * server refused because the tutorial is not done (`onTutorial` given), it shows the Hall's locked-door message and
 * sends the player to the study instead of offering a retry that would fail the same way.
 */
export function StartRetry({ onRetry, onTutorial, buttonClass }: { onRetry: () => void; onTutorial?: () => void; buttonClass: string }) {
  const t = useT();
  if (onTutorial) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3" data-start-failed="tutorial">
        <p className="text-danger-ink">{t('hub.door.locked')}</p>
        <button type="button" className={buttonClass} onClick={onTutorial}>
          {t('hall.tutorial')}
        </button>
      </div>
    );
  }
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3" data-start-failed="true">
      <p className="text-danger-ink">{t('play.startFailed')}</p>
      <button type="button" className={buttonClass} onClick={onRetry}>
        {t('play.retry')}
      </button>
    </div>
  );
}
