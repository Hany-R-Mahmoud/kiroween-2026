import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BOOK_HEAD_SCRIPT } from '../src/bookHead';
import { KeepersNotePage } from '../src/components/KeepersNotePage';
import { translate } from '../src/i18n/t';
import { resolveAnchor } from '../src/server/anchor';

const run = (stored: string | null | 'throws') => {
  const root = { dataset: {} as Record<string, string> };
  const storage = {
    getItem: () => {
      if (stored === 'throws') throw new Error('blocked');
      return stored;
    },
  };
  new Function('document', 'localStorage', BOOK_HEAD_SCRIPT)({ documentElement: root }, storage);
  return root.dataset.book;
};

describe('atlas Book integration (5.5)', () => {
  it('head script: scroll choice gives off; absent, other or blocked storage gives on', () => {
    expect(run('scroll')).toBe('off');
    expect(run('pages')).toBe('on');
    expect(run(null)).toBe('on');
    expect(run('junk')).toBe('on');
    expect(run('throws')).toBe('on');
  });
  it('/anchor/keepers-note--ch-1 redirects to the Keeper\'s Note page at that anchor', async () => {
    const r = await resolveAnchor('keepers-note--ch-1', async () => 'keepers-note');
    expect(r).toEqual({ kind: 'redirect', href: '/legends/keepers-note#keepers-note--ch-1' });
  });
  it("keeps the Fiction label outside the Book's flow", () => {
    const t = (k: Parameters<typeof translate>[1], v?: Record<string, string | number>) => translate('en', k, v);
    const html = renderToStaticMarkup(
      <KeepersNotePage t={t} note={{ anchor: 'keepers-note--ch-1', label: 'FICTION-LABEL', title: 'T', oneLineHook: 'H', readingTimeMin: 2, chapterTitle: 'C', paragraphs: ['One.', 'Two.'], hook: 'Hook.' } as never} />,
    );
    expect(html.indexOf('FICTION-LABEL')).toBeLessThan(html.indexOf('class="book"'));
    expect(html).toContain('data-block=""');
    expect(html.split('id="keepers-note--ch-1"')).toHaveLength(2);
  });
});
