import { useEffect, useRef, useState } from 'react';
import { stripMarks } from '@kiroween/skeleton/client';
import { useT } from '../i18n/useT.ts';
import './scene.css';

interface SceneNavProps {
  /** Scene names from content, in order. */
  names: readonly string[];
  current: number;
  onSelect: (index: number) => void;
  /** Leaves the World. Omit in the hall. */
  onHall?: () => void;
  /** Id of the viewer heading that receives focus on a scene change. */
  headingId: string;
}

/**
 * The bar above the viewer: scene tabs, previous, next and back to the hall, all plain buttons.
 * With one scene (the tutorial room) only the hall button shows. A polite live region announces scene changes.
 */
export function SceneNav({ names, current, onSelect, onHall, headingId }: SceneNavProps) {
  const t = useT();
  const total = names.length;
  const [announcement, setAnnouncement] = useState('');
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (total < 2) return;
    document.getElementById(headingId)?.focus();
    setAnnouncement(t('world.scene', { n: current + 1, total, name: stripMarks(names[current] ?? '') }));
    // `t` changes identity every render and must not retrigger the announcement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const many = total > 1;
  return (
    <div className="scene-nav">
      {onHall ? (
        <button type="button" className="scene-button scene-hall btn btn-ghost" onClick={onHall}>
          <span aria-hidden="true" className="icon-dir">
            {'←'}
          </span>
          <span>{t('world.hall')}</span>
        </button>
      ) : null}
      {many ? (
        <nav
          aria-label={t('world.nav')}
          className="scene-tabs"
          // A focused tab that is only partly in the row is brought fully into view (the browser leaves it half hidden in RTL).
          onFocus={(e) => (e.target as HTMLElement).scrollIntoView?.({ block: 'nearest', inline: 'nearest' })}
        >
          <button type="button" className="scene-button btn btn-secondary" disabled={current <= 0} onClick={() => onSelect(current - 1)}>
            {t('world.prev')}
          </button>
          {names.map((name, i) => (
            <button
              key={name + i}
              type="button"
              className="scene-button scene-tab btn btn-secondary"
              aria-current={i === current ? 'true' : undefined}
              onClick={() => onSelect(i)}
            >
              {stripMarks(name)}
            </button>
          ))}
          <button type="button" className="scene-button btn btn-secondary" disabled={current >= total - 1} onClick={() => onSelect(current + 1)}>
            {t('world.next')}
          </button>
        </nav>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
