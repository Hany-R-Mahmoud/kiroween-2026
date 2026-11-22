import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Reply } from '@kiroween/skeleton/client';
import { Hotspot } from '../src/components/Hotspot.tsx';
import { en } from '../src/i18n/en.ts';
import { translate } from '../src/i18n/t.ts';
import { replyLine } from '../src/lib/world.ts';

const src = (f: string) => readFileSync(new URL(`../src/components/${f}`, import.meta.url), 'utf8');
const t = (k: keyof typeof en) => translate('en', k);
const html = (badge?: 'lock' | 'signin') =>
  renderToStaticMarkup(createElement(Hotspot, { box: { id: 'h', x: 0, y: 0, w: 60, h: 60 }, label: 'Door', marked: false, markedText: 'm', badge, scale: 1, onActivate: () => {} }));

describe('hotspot glint', () => {
  it.each([[undefined], ['lock' as const], ['signin' as const]])('every hotspot (badge %s) has hotspot-glint', (badge) => {
    expect(html(badge)).toMatch(/class="[^"]*\bhotspot-glint\b/);
  });
  it('fails when the class is removed (checker self-test)', () => {
    expect(html().replace('hotspot-glint', '')).not.toMatch(/\bhotspot-glint\b/);
  });
  it('scene.css defines the glint with no pointer events and a static reduced-motion rule', () => {
    const css = readFileSync(new URL('../src/components/scene.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.hotspot-glint::before\s*\{[^}]*pointer-events:\s*none/);
    expect(css).toMatch(/prefers-reduced-motion[^{]*\{\s*\.hotspot-glint::before\s*\{[^}]*animation:\s*none/);
  });
});

describe('the reply row is always a non-empty status', () => {
  const cases: [string, Reply | null][] = [
    ['clue (opened something)', { kind: 'tap', key: 'tap.something', opened: ['p'], collected: 1 }],
    ['decoy (server text blank)', { kind: 'tap', text: ' ', opened: [], collected: 0 }],
    ['dead end (follow)', { kind: 'follow', result: 'dead', anchors: [] }],
    ['locked (no reply)', null],
  ];
  it.each(cases)('%s', (_n, reply) => {
    expect(replyLine(reply, t).trim()).not.toBe('');
  });
  it.each(['WorldPlay.tsx', 'TutorialRoom.tsx'])('%s mounts role="status" .scene-reply unconditionally', (f) => {
    const s = src(f);
    const m = /(\{[^{}\n]*\?\s*)?<p role="status" className="scene-reply">/.exec(s);
    expect(m).not.toBeNull();
    expect(m?.[1]).toBeUndefined();
  });
  it('WorldPlay prints replyLine in the row', () => {
    expect(src('WorldPlay.tsx')).toMatch(/className="scene-reply">\s*<Marked text=\{replyLine\(/);
  });
});
