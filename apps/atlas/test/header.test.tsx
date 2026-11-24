import { describe, expect, it } from 'vitest';
import { SiteHeader } from '../src/components/SiteHeader';
import { translate, type Translate } from '../src/i18n/t';
import { attr, classes, renderInRouter, tags } from './helpers/renderInRouter';

// Requirements 22.3, 23.4, 33.1: the header has the logo, the legend list and the game as three different places.
const t: Translate = (key, vars) => translate('en', key, vars);

/** The header's links as { text, href, tag } in document order. */
const links = (html: string) =>
  [...html.matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a>/g)].map((m) => ({ tag: m[1]!, text: attr(m[1]!, 'aria-label') ?? m[2]!.replace(/<[^>]+>/g, '').trim(), inner: m[2]!, href: attr(m[1]!, 'href') }));

describe('atlas header', async () => {
  const html = await renderInRouter(<SiteHeader t={t} />);
  const all = links(html);
  const byText = (key: Parameters<Translate>[0]) => all.find((l) => l.text === t(key));

  it('has exactly three links, each a nav-item', () => {
    expect(all).toHaveLength(3);
    for (const l of all) expect(classes(l.tag), l.text).toContain('nav-item');
  });

  it('points the logo at /, the legend list at /legends and the game at /game/', () => {
    expect(byText('app.title')?.href).toBe('/');
    expect(byText('nav.home')?.href).toBe('/legends');
    expect(byText('nav.play')?.href).toBe('/game/');
  });

  it('gives every link its own href', () => {
    const hrefs = all.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('marks exactly one link as the current page on the home page', () => {
    expect(tags(html, 'a').filter((a) => attr(a, 'aria-current') === 'page')).toHaveLength(1);
    expect(attr(byText('app.title')!.tag, 'aria-current')).toBe('page');
  });

  it('names the nav landmark from the catalog', () => {
    expect(html).toContain(`aria-label="${t('nav.label')}"`);
  });

  it('shows a short Play label below 40rem and keeps the full name as the accessible name (label-in-name)', () => {
    const play = byText('nav.play')!;
    const name = attr(play.tag, 'aria-label');
    expect(name).toBe(t('nav.play'));
    const short = t('nav.playShort');
    expect(short.length).toBeLessThan(t('nav.play').length);
    expect(name!.toLowerCase()).toContain(short.toLowerCase());
    expect(play.inner).toMatch(new RegExp(`<span class="min-\\[40rem\\]:hidden">${short}</span>`));
    expect(play.inner).toMatch(new RegExp(`<span class="hidden min-\\[40rem\\]:inline">${t('nav.play')}</span>`));
    expect(classes(play.tag)).toContain('min-h-11');
  });

  it('the short-label check fails when the aria-label is removed', () => {
    const broken = html.replace(/ aria-label="Play Trick or True"/, '');
    expect(attr(links(broken).find((l) => l.href === '/game/')!.tag, 'aria-label')).toBeUndefined();
  });

  it('the duplicate-href check fails when two items share an href', () => {
    const broken = html.replace('href="/legends"', 'href="/game/"');
    const hrefs = links(broken).map((l) => l.href);
    expect(new Set(hrefs).size).not.toBe(hrefs.length);
  });
});
