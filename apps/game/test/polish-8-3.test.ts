import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en.ts';
import { dialogKeyAction } from '../src/lib/focus.ts';

const read = (p: string): string => readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');

describe('task 8.3 polish', () => {
  it('Escape closes the ending dialog and Tab keeps focus on its button', () => {
    expect(dialogKeyAction('Escape')).toBe('close');
    expect(dialogKeyAction('Tab')).toBe('trap');
    expect(dialogKeyAction('a')).toBeNull();
  });
  it('the Hall wires the dialog key handler and returns focus on close', () => {
    const hall = read('../src/components/Hall.tsx');
    expect(hall).toMatch(/data-ending="true" onKeyDown=\{onEndingKey\}/);
    expect(hall).toMatch(/dialogKeyAction\(e\.key\)/);
    expect(hall).toMatch(/endingOpener\.restore\(\)/);
  });
  it('the empty-slot string is gone and the tutorial reward key exists', () => {
    expect(JSON.stringify(en)).not.toContain('An empty slot');
    expect(en['tut.reward.line'].length).toBeGreaterThan(10);
  });
  it('spirit body colour is explicit: two classes, book ink, not left to bundle order', () => {
    const css = read('../src/styles/theme.css');
    expect(css).toMatch(/\.spirit-panel-body\.spirit-caption \{[^}]*color: var\(--book-ink\)/);
  });
});
