import { atlasLegendFromModel } from '@kiroween/skeleton/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { allLegends } from '../../../skeleton/test/helpers/legends.ts';
import { LegendPage } from '../src/components/LegendPage';
import { translate, type Translate } from '../src/i18n/t';

// Every legend page rendered from the parsed content files, with no database (R11.1).
const t: Translate = (key, vars) => translate('en', key, vars);
const pages = allLegends.map((l) => ({ l, html: renderToStaticMarkup(<LegendPage legend={atlasLegendFromModel(l)} t={t} />) }));
const ids = (html: string) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]!);
const tags = (html: string, name: string) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ');

describe.each(pages.map((p) => [p.l.id, p] as const))('legend page %s', (_id, { l, html }) => {
  it('has every anchor in the content exactly once as an element id', () => {
    const all = ids(html);
    expect(l.anchors.length).toBeGreaterThan(10);
    for (const a of l.anchors) expect(all.filter((x) => x === a), a).toHaveLength(1);
    expect(new Set(all).size, 'duplicate ids').toBe(all.length);
  });

  it('resolves every Hint 2 anchor of its puzzle slots and final puzzle to one of those ids', () => {
    const all = new Set(ids(html));
    const hint2 = [...l.world.slots.map((s) => s.hint2Anchor), ...(l.world.finalPuzzle.hint2Anchor ? [l.world.finalPuzzle.hint2Anchor] : [])];
    expect(hint2.length).toBeGreaterThan(0);
    for (const a of hint2) expect(all.has(a), a).toBe(true);
  });

  it('labels every [Dramatization] visibly and leaves no raw story markers', () => {
    const sources = [l.coldOpen, l.documentedTold.closing, ...l.chapters.flatMap((c) => [c.text, c.hook]), ...l.versions.map((v) => v.paragraph), ...l.documentedTold.rows.flatMap((r) => [r.documented, r.told])];
    const expected = sources.join('\n').split('[Dramatization]').length - 1;
    expect(tags(html, 'span').filter((s) => s.includes('class="dramatization"'))).toHaveLength(expected);
    expect(text(html)).not.toContain('[Dramatization]');
    expect(text(html)).not.toMatch(/\*[^\s*]/);
  });

  it('gives every image a width, a height and alt text; only the hero is eager, with high priority', () => {
    const imgs = tags(html, 'img');
    expect(imgs.length).toBe(l.chapters.length + 1);
    for (const img of imgs) {
      expect(img, img).toMatch(/\swidth="\d+"/);
      expect(img, img).toMatch(/\sheight="\d+"/);
      expect(img, img).toMatch(/\salt="[^"]+"/);
    }
    const eager = imgs.filter((i) => !i.includes('loading="lazy"'));
    expect(eager).toHaveLength(1);
    expect(eager[0]).toContain('fetchPriority="high"');
    expect(eager[0]).toContain(`/media/${l.id}/atlas/${l.id}-atlas-hero-01.webp`);
    expect(html).toContain(`alt="Illustration for chapter 1: ${l.chapters[0]!.title.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`);
  });

  it('links sources out only over http(s), with rel="noopener noreferrer"', () => {
    const links = tags(html, 'a').filter((a) => !a.includes('href="#') && !a.includes(`href="/game/world/${l.id}"`));
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(a, a).toMatch(/href="https?:\/\//);
      expect(a, a).toContain('rel="noopener noreferrer"');
    }
  });

  it('never links a source whose URL is not http(s)', () => {
    const v = atlasLegendFromModel(l);
    const unsafe = { ...v, sources: [{ ...v.sources[0]!, url: 'javascript:alert(1)' }, { ...v.sources[0]!, id: 'S99', url: '' }] };
    const out = renderToStaticMarkup(<LegendPage legend={unsafe} t={t} />);
    expect(tags(out, 'a').filter((a) => !a.includes('href="#') && !a.includes(`href="/game/world/${l.id}"`))).toEqual([]);
    expect(out).not.toContain('javascript:');
  });

  it('has one h1, and shows versions in the file order', () => {
    expect(tags(html, 'h1')).toHaveLength(1);
    const anchors = new Set(l.versions.map((v) => v.anchor));
    const order = ids(html).filter((i) => anchors.has(i));
    expect(order).toEqual(l.versions.map((v) => v.anchor));
  });
});
