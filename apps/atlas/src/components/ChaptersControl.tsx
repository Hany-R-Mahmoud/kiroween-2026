import type { AtlasLegend } from '@kiroween/skeleton/client';
import { useId, useRef } from 'react';
import type { Translate } from '../i18n/t';
import { InlineText } from './StoryText';

const contentsLink = 'nav-item contents-link';

/** The legend's table of contents as a native popover opened from the Book control row (no page height). */
export function ChaptersControl({ legend, t }: { legend: AtlasLegend; t: Translate }) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const close = () => panelRef.current?.hidePopover?.();
  return (
    <>
      <button type="button" className="btn btn-secondary" popoverTarget={id}>
        {t('legend.chapters')}
      </button>
      <div id={id} ref={panelRef} popover="auto" className="chapters-panel panel panel-raised">
        <nav aria-label={t('legend.contents')}>
          <ol className="flex flex-col font-ui text-sm">
            {legend.chapters.map((c) => (
              <li key={c.anchor}>
                <a href={`#${c.anchor}`} className={contentsLink} onClick={close}>
                  <span>
                    <span className="font-display">{t('legend.chapter', { n: c.ordinal })}</span>
                    {': '}
                    <InlineText text={c.title} t={t} />
                  </span>
                </a>
              </li>
            ))}
            <li>
              <a href={`#${legend.versionsAnchor}`} className={contentsLink} onClick={close}>
                {t('legend.versions')}
              </a>
            </li>
            <li>
              <a href="#sources" className={contentsLink} onClick={close}>
                {t('legend.sources')}
              </a>
            </li>
          </ol>
        </nav>
      </div>
    </>
  );
}
