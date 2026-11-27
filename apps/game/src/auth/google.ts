// Google Identity Services ("Sign In With Google" button). Docs: developers.google.com/identity/gsi/web/guides/client-library
// and .../reference/js-reference. The library must be loaded from Google's own URL; self-hosting it is not supported.
export const GSI_SRC = 'https://accounts.google.com/gsi/client';
/** The Google web client ID. Public, not a secret. Empty when unset: the page then keeps only the redirect button. */
export const GOOGLE_CLIENT_ID: string = import.meta.env.KIROWEEN_PUBLIC_GOOGLE_CLIENT_ID ?? '';
export interface GsiCredentialResponse {
  credential?: string;
}
export interface GsiApi {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (r: GsiCredentialResponse) => void; ux_mode: 'popup'; nonce: string }): void;
      renderButton(parent: HTMLElement, options: { type: 'standard'; theme: 'filled_black'; size: 'large'; text: 'continue_with'; shape: 'rectangular'; width: string }): void;
    };
  };
}
declare global {
  interface Window {
    google?: GsiApi;
  }
}
/** A fresh random nonce (32 hex characters) from the browser's CSPRNG: one per page view. */
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
/** Button width in pixels for a container: Google allows at most 400, and a button under 200 looks cramped. */
export function buttonWidth(containerPx: number): string {
  return String(Math.min(400, Math.max(200, Math.floor(containerPx))));
}
const LOAD_TIMEOUT_MS = 10_000;
let loading: Promise<GsiApi | null> | undefined;
/** Loads Google's script once. Resolves null when it is blocked, offline or too slow; never rejects. */
export function loadGoogle(): Promise<GsiApi | null> {
  if (window.google) return Promise.resolve(window.google);
  loading ??= new Promise<GsiApi | null>((resolve) => {
    const script = document.createElement('script');
    const done = (api: GsiApi | null) => {
      clearTimeout(timer);
      if (!api) loading = undefined; // allow a later page view to try again
      resolve(api);
    };
    const timer = setTimeout(() => done(null), LOAD_TIMEOUT_MS);
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => done(window.google ?? null);
    script.onerror = () => done(null);
    document.head.appendChild(script);
  });
  return loading;
}
