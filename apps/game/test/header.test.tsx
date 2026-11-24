import { readFileSync } from 'node:fs';
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GameHeader, atlasHome } from '../src/components/GameHeader';
import { translate } from '../src/i18n/t';

const t = (k: Parameters<typeof translate>[1]) => translate('en', k);

async function render(ui: ReactElement): Promise<string> {
  const root = createRootRoute({ component: () => ui });
  const paths = ['/', '/account', '/sign-in'].map((path) => createRoute({ getParentRoute: () => root, path }));
  const router = createRouter({ routeTree: root.addChildren(paths.slice(0)), history: createMemoryHistory({ initialEntries: ['/'] }) });
  await router.load();
  return renderToStaticMarkup(<RouterProvider router={router} />);
}
const header = (name: string | null, atlasOrigin = '') => render(<GameHeader t={t} name={name} atlasOrigin={atlasOrigin} onSignOut={() => undefined} />);
const tags = (html: string, name: string) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'g'))].map((m) => m[0]);
const attr = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)?.[1];

describe('game header', () => {
  it('links the atlas by href, same origin when ATLAS_ORIGIN is unset', async () => {
    const html = await header(null);
    expect(tags(html, 'a').some((a) => attr(a, 'href') === '/legends')).toBe(true);
    const atlas = [...html.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)].find((m) => m[1] === t('nav.atlas'));
    expect(atlas && attr(atlas[0], 'href')).toBe('/legends');
  });
  it('uses the configured atlas origin', async () => {
    const html = await header(null, 'https://atlas.example');
    expect(html).toContain('href="https://atlas.example/legends"');
    expect(atlasHome('https://atlas.example/')).toBe('https://atlas.example/legends');
  });
  it('fails the atlas lookup when the link is removed', async () => {
    const html = (await header(null)).replace(new RegExp(`<a\\b[^>]*>${t('nav.atlas')}</a>`), '');
    expect(html).not.toContain(t('nav.atlas'));
  });
  it('has a menu button wired to a popover holding Hall, Account and Sign in', async () => {
    const html = await header(null);
    const button = tags(html, 'button')[0] ?? '';
    expect(attr(button, 'popovertarget')).toBe('app-menu');
    const menu = tags(html, 'div').find((d) => attr(d, 'id') === 'app-menu') ?? '';
    expect(menu).toMatch(/\spopover="auto"/);
    const inside = html.slice(html.indexOf(menu));
    for (const key of ['nav.hall', 'nav.account', 'nav.signIn'] as const) expect(inside).toContain(t(key));
    expect(inside).not.toContain(t('nav.signOut'));
    expect(html.indexOf(t('nav.atlas'))).toBeLessThan(html.indexOf(menu));
  });
  it('shows Sign out instead of Sign in for a signed-in visitor', async () => {
    const inside = (await header('Ada')).split('id="app-menu"')[1] ?? '';
    expect(inside).toContain(t('nav.signOut'));
    expect(inside).not.toContain(t('nav.signIn'));
  });
  it('shows the menu inline from 40rem and hides the button there', () => {
    const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    const media = /@media \(min-width: 40rem\)\s*{([\s\S]*?)\n  }\n}/.exec(css.slice(css.indexOf('Game header menu')))?.[1] ?? '';
    expect(media).toMatch(/\.nav-menu[^{]*{\s*display: contents/);
    expect(media).toMatch(/\.nav-menu-button\s*{\s*display: none/);
  });
});
