// The Hint 2 blank-tab flow (Requirement 27). The tab opens inside the click, before the server is asked, so a
// pop-up blocker allows it. It stays `about:blank` until the server confirms the hint and fear is raised; the chapter
// address comes only from the server reply. Any failure closes it in the same tick, with no link shown.
export interface HintTab {
  /** False when the browser blocked the tab. */
  opened: boolean;
  goTo(url: string): void;
  close(): void;
}
export type OpenWindow = (url: string, target: string) => Window | null;
/** Called synchronously inside the click handler. */
export function openBlankTab(open: OpenWindow = (u, t) => window.open(u, t)): HintTab {
  let w: Window | null = null;
  try {
    w = open('about:blank', '_blank'); // no 'noopener' here: it would make open() return null
  } catch {
    w = null;
  }
  if (w) {
    try {
      w.opener = null; // cut the link before anything else happens
    } catch {
      /* a window that refuses the write is still closed on failure */
    }
  }
  return {
    opened: w !== null,
    goTo: (url) => {
      if (w) w.location.replace(url);
    },
    close: () => {
      if (w && !w.closed) w.close();
    },
  };
}
/** What the server said. `failed` covers every null reply and every reply that is not a hint. */
export type Hint2Server = { kind: 'charged'; href: string | null } | { kind: 'free' } | { kind: 'failed' };
export type Hint2Outcome = { navigate: string | null; closeTab: boolean; showBlockedLink: string | null };
/** The whole decision, pure. `failed` and `free` close the tab and show nothing. */
export function hint2Outcome(tabOpened: boolean, server: Hint2Server): Hint2Outcome {
  if (server.kind !== 'charged') return { navigate: null, closeTab: true, showBlockedLink: null };
  if (tabOpened) return { navigate: server.href, closeTab: server.href === null, showBlockedLink: null };
  return { navigate: null, closeTab: false, showBlockedLink: server.href };
}
/** Maps a reply (or null) to the server kind. A reply that is not a hint is a failure. */
export function hint2Server(reply: { kind: string; charged?: boolean; anchor?: string } | null | undefined, hrefOf: (anchor: string) => string | null): Hint2Server {
  if (!reply || reply.kind !== 'hint2') return { kind: 'failed' };
  if (reply.charged !== true) return { kind: 'free' };
  return { kind: 'charged', href: reply.anchor ? hrefOf(reply.anchor) : null };
}
/** The reply step of the click handler, shared by both routes and the tests. Returns the link to show when the tab was blocked. */
export function applyHint2Reply(
  tab: HintTab,
  reply: { kind: string; charged?: boolean; anchor?: string } | null | undefined,
  hrefOf: (anchor: string) => string | null,
): string | null {
  const out = hint2Outcome(tab.opened, hint2Server(reply, hrefOf));
  if (out.navigate) tab.goTo(out.navigate);
  if (out.closeTab) tab.close();
  return out.showBlockedLink;
}
