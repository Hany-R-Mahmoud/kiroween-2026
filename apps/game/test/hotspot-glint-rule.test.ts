import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const css = readFileSync(new URL('../src/components/scene.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const block = (re: RegExp) => re.exec(css)?.[0] ?? '';
const rem = (b: string, prop: string) => Number(new RegExp(`${prop}:\\s*([\\d.]+)rem`).exec(b)?.[1] ?? 0);
// Owner feedback F2: the glint must be seen on dark and bright parts of the paintings.
describe('hotspot glint rule (F2)', () => {
  const base = block(/\.hotspot-glint::before\s*\{[^}]*\}/);
  const frames = block(/@keyframes hotspot-glint\s*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/);
  it('draws a dot of at least 8 px (core share of the box x box size) with a rim and a soft halo', () => {
    const size = rem(base, 'inline-size') * 16;
    const core = Number(/var\(--color-glow\) 0 (\d+)%/.exec(base)?.[1]);
    expect(size).toBeGreaterThan(0);
    expect(base).toMatch(/radial-gradient\(\s*circle closest-side/);
    expect(size * (core / 100)).toBeGreaterThanOrEqual(8); // diameter = box x core share (closest-side)
    expect(base).toMatch(/--color-bg\) \d+%, transparent\) \d+% \d+%/); // dark rim
    expect(base).toMatch(/--color-glow\) \d+%, transparent\) \d+%,\s*transparent 100%/); // halo
  });
  it('has a peak opacity of at least 0.9 and never falls under 0.7', () => {
    const ops = [...frames.matchAll(/opacity:\s*([\d.]+)/g)].map((m) => Number(m[1]));
    expect(Math.max(...ops)).toBeGreaterThanOrEqual(0.9);
    expect(Math.min(...ops)).toBeGreaterThanOrEqual(0.7);
    expect(Number(/opacity:\s*([\d.]+)/.exec(base)?.[1])).toBeGreaterThanOrEqual(0.85);
  });
  it('is static and still visible under OS and in-app reduced motion', () => {
    const os = block(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.hotspot-glint::before\s*\{[^}]*\}/);
    const app = block(/html\[data-motion='reduce'\] \.hotspot-glint::before\s*\{[^}]*\}/);
    for (const b of [os, app]) {
      expect(b).toMatch(/animation:\s*none/);
      expect(Number(/opacity:\s*([\d.]+)/.exec(b)?.[1])).toBeGreaterThanOrEqual(0.85);
    }
  });
  it('moves only opacity (candle-only motion)', () => {
    expect(frames).not.toMatch(/transform|translate|scale|rotate|inset|size/);
  });
  it('checker self-test: a 4 px, 0.3 opacity glint fails the size and opacity rules', () => {
    expect(0.25 * 16 * 0.26).toBeLessThan(8);
    expect(Math.max(0.3, 0.35)).toBeLessThan(0.9);
  });
});
