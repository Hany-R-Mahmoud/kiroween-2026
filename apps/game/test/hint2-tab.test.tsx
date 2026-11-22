import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyHint2Reply, openBlankTab } from '../src/lib/hintTab.ts';

// Feature: ui-rework, Property 6: Hint 2 outcome never leaks or wastes a tab
// **Validates: Requirements 27.6, 27.7**
//
// The routes (`tutorial.tsx`, `world.$target.tsx`) import server functions and cannot be rendered under the plain
// Vitest config. `clickHint2` below runs the same `openBlankTab` and `applyHint2Reply` their `onHint2` handlers
// call (a source test below pins that both routes call them). Only the browser window and the server call are stand-ins.

type Reply = { kind: string; charged?: boolean; anchor?: string } | null;
type Result = { reply: Reply } | null; // null = the call threw (the route's `run` returns null)

function fakeWindow(log: string[]) {
  const state = { closes: 0, urls: [] as string[], closed: false };
  const win = {
    opener: 'parent' as unknown,
    get closed() {
      return state.closed;
    },
    close() {
      state.closes += 1;
      state.closed = true;
      log.push('close');
    },
    location: {
      replace(url: string) {
        state.urls.push(url);
        log.push('navigate');
      },
    },
  };
  return { win, state };
}

const href = (a: string) => `https://atlas.test/legends/x#${a}`;

async function clickHint2(opts: { popupBlocked: boolean; result: Result; log: string[] }) {
  const { win, state } = fakeWindow(opts.log);
  let opened = 0;
  const tab = openBlankTab(() => {
    opened += 1;
    opts.log.push('open');
    return opts.popupBlocked ? null : (win as unknown as Window);
  });
  expect(opened).toBe(1); // opened synchronously, inside the click, before the server is asked
  let blocked: string | null = null;
  // The server call: fear is raised when the reply arrives, before the handler's `.then` runs.
  const call = Promise.resolve(opts.result).then((r) => {
    opts.log.push('fear');
    return r;
  });
  void call.then((r) => {
    blocked = applyHint2Reply(tab, r?.reply, href);
  });
  // Flush microtasks without advancing any timer. Two ticks: the fear step, then the handler.
  await Promise.resolve();
  await Promise.resolve();
  return { win, state, blocked: () => blocked, tab };
}

const FAILURES: [string, Result][] = [
  ['network error', null],
  ['guest limit', null],
  ['rate limit (429)', null],
  ['another refusal', null],
  ['reply is not a hint', { reply: { kind: 'hint1' } }],
  ['null reply', { reply: null }],
];

describe('Hint 2 failure paths close the tab and show nothing', () => {
  it.each(FAILURES)('%s', async (_name, result) => {
    const log: string[] = [];
    const r = await clickHint2({ popupBlocked: false, result, log });
    expect(r.state.closes).toBe(1);
    expect(r.state.urls).toEqual([]);
    expect(r.blocked()).toBeNull();
    expect(log).not.toContain('navigate');
  });

  it('popup blocked plus a failure: nothing to close, no link, no URL', async () => {
    const log: string[] = [];
    const r = await clickHint2({ popupBlocked: true, result: null, log });
    expect(r.tab.opened).toBe(false);
    expect(r.state.closes).toBe(0);
    expect(r.state.urls).toEqual([]);
    expect(r.blocked()).toBeNull();
  });

  it('a free reply closes the tab and shows nothing', async () => {
    const r = await clickHint2({ popupBlocked: false, result: { reply: { kind: 'hint2', charged: false } }, log: [] });
    expect(r.state.closes).toBe(1);
    expect(r.state.urls).toEqual([]);
    expect(r.blocked()).toBeNull();
  });
});

describe('Hint 2 success paths', () => {
  const ok: Result = { reply: { kind: 'hint2', charged: true, anchor: 'ch-2' } };

  it('navigates the tab only after fear is raised; opener is null; no link shown', async () => {
    const log: string[] = [];
    const r = await clickHint2({ popupBlocked: false, result: ok, log });
    expect(r.win.opener).toBeNull();
    expect(r.state.urls).toEqual([href('ch-2')]);
    expect(log).toEqual(['open', 'fear', 'navigate']);
    expect(r.state.closes).toBe(0);
    expect(r.blocked()).toBeNull();
  });

  it('the tab stays blank until the reply: nothing is assigned before fear', async () => {
    const log: string[] = [];
    const { win, state } = fakeWindow(log);
    openBlankTab(() => win as unknown as Window);
    expect(state.urls).toEqual([]);
    expect(log).toEqual([]);
  });

  it('popup blocked plus success shows the link, after fear is raised', async () => {
    const log: string[] = [];
    const r = await clickHint2({ popupBlocked: true, result: ok, log });
    expect(r.blocked()).toBe(href('ch-2'));
    expect(r.state.urls).toEqual([]);
    expect(log).toEqual(['open', 'fear']);
  });

  it('charged without an anchor closes the tab and shows no link', async () => {
    const r = await clickHint2({ popupBlocked: false, result: { reply: { kind: 'hint2', charged: true } }, log: [] });
    expect(r.state.closes).toBe(1);
    expect(r.state.urls).toEqual([]);
    expect(r.blocked()).toBeNull();
  });
});

describe('both routes use the shared Hint 2 handler', () => {
  it.each(['tutorial.tsx', 'world.$target.tsx'])('%s calls openBlankTab and applyHint2Reply', (file) => {
    const src = readFileSync(new URL(`../src/routes/${file}`, import.meta.url), 'utf8');
    expect(src).toMatch(/openBlankTab\(\)/);
    expect(src).toMatch(/applyHint2Reply\(tab,/);
    expect(src).not.toMatch(/hint2Outcome\(/); // no private copy of the decision
  });
});
