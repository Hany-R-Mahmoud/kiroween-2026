// The client play library bound to the real server functions. Routes call `playClientFor` once per visit.
// The logic and its tests are in `playClient.ts`, which has no server import.
import { redeemTutorialReceipt, startTutorial, startWorld, tutorialAct, worldAct } from '../server/functions';
import { createPlayClient, type PlayClient, type PlayApi } from './playClient';

export * from './playClient';

const api: PlayApi = { startWorld, worldAct, startTutorial, tutorialAct, redeemTutorialReceipt };

/**
 * `guest` true: tokens and progress are kept in `window.localStorage`. Signed-in: nothing is kept in the browser.
 * Browser only: call it from an effect or a handler, never while rendering on the server.
 */
// One client per mode for the whole page, so the single-flight queue is shared by every route and no caller can bypass it.
const shared: { guest?: PlayClient; signedIn?: PlayClient } = {};

export function playClientFor(guest: boolean): PlayClient {
  if (guest) return (shared.guest ??= createPlayClient(api, window.localStorage));
  return (shared.signedIn ??= createPlayClient(api, null));
}
