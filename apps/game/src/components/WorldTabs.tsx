import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useT } from '../i18n/useT.ts';
import './scene.css';

export type WorldTab = 'scene' | 'question' | 'notebook' | 'leads';

const ORDER: readonly WorldTab[] = ['scene', 'question', 'notebook', 'leads'];

const LABEL_KEY = {
  scene: 'world.tab.scene',
  question: 'world.question',
  notebook: 'world.notebook',
  leads: 'world.leads',
} as const;

/** Id of the tab button, for `aria-labelledby` on its panel. */
export const worldTabId = (tab: WorldTab): string => `world-tab-${tab}`;
/** Id the panel for a tab must carry, matching `aria-controls`. */
export const worldPanelId = (tab: WorldTab): string => `world-panel-${tab}`;

interface WorldTabsProps {
  /** The tab that is selected now. */
  tab: WorldTab;
  onSelect: (tab: WorldTab) => void;
}

/**
 * The tab strip for the world screen: Scene, Question, Notebook and Leads.
 * Arrow keys move between visible tabs (the direction follows `document.dir`), Home and End jump to the ends.
 * The Scene tab carries `world-tab-scene` so CSS can hide it from 64rem up, where the scene is always on screen.
 */
export function WorldTabs({ tab, onSelect }: WorldTabsProps) {
  const t = useT();
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const all = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    // A tab hidden by CSS has no layout box; skip it. Without layout (server, tests) every tab counts.
    const shown = all.filter((b) => b.getClientRects().length > 0);
    const buttons = shown.length > 0 ? shown : all;
    const at = buttons.findIndex((b) => b === document.activeElement);
    if (at < 0) return;
    const rtl = document.dir === 'rtl';
    let next = -1;
    if (e.key === 'ArrowRight') next = at + (rtl ? -1 : 1);
    else if (e.key === 'ArrowLeft') next = at + (rtl ? 1 : -1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    else return;
    e.preventDefault();
    const target = buttons[(next + buttons.length) % buttons.length];
    if (!target) return;
    target.focus();
    const id = ORDER.find((o) => worldTabId(o) === target.id);
    if (id) onSelect(id);
  };

  return (
    // Arrow keys are handled on the tablist, the standard tabs pattern.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div ref={listRef} role="tablist" aria-label={t('world.tabs.label')} className="world-tabs" onKeyDown={onKeyDown}>
      {ORDER.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={worldTabId(id)}
          aria-selected={tab === id}
          aria-controls={worldPanelId(id)}
          tabIndex={tab === id ? 0 : -1}
          className={`scene-button btn btn-secondary world-tab${id === 'scene' ? ' world-tab-scene' : ''}`}
          onClick={() => onSelect(id)}
        >
          {t(LABEL_KEY[id])}
        </button>
      ))}
    </div>
  );
}
