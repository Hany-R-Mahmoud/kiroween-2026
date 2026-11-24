import type { Translate } from '../i18n/t';

/** Link to the legend's world in the game. A plain anchor: the game is a separate app on the same domain. */
export function PlayLink({
  legendId,
  variant,
  t,
}: {
  legendId: string;
  variant: 'quiet' | 'primary';
  t: Translate;
}) {
  return (
    <a href={`/game/world/${legendId}`} className={variant === 'primary' ? 'btn btn-primary' : 'btn btn-ghost play-link-quiet'}>
      {t('legend.play')}
    </a>
  );
}
