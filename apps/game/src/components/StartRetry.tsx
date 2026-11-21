import { useT } from '../i18n/useT';

/** Shown in place of the loading line when the first start call fails: says so and offers to start again. */
export function StartRetry({ onRetry, buttonClass }: { onRetry: () => void; buttonClass: string }) {
  const t = useT();
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3" data-start-failed="true">
      <p className="text-danger-ink">{t('play.startFailed')}</p>
      <button type="button" className={buttonClass} onClick={onRetry}>
        {t('play.retry')}
      </button>
    </div>
  );
}
