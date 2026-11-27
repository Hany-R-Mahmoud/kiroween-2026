import { useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { signInGoogle, signInGoogleIdToken } from '../auth/client';
import { buttonWidth, GOOGLE_CLIENT_ID, loadGoogle, newNonce } from '../auth/google';
import { useT } from '../i18n/useT';
import { secondaryButtonClass } from './Field';

/**
 * "Continue with Google". Google's own button runs on our origin and hands back an ID token, which goes to Neon. If
 * Google's script cannot load (blocked, offline, slow) or no client ID is set, the old redirect button shows instead,
 * so Google sign-in never disappears. `onError` gets nothing: the page shows its one fixed message.
 */
export function GoogleSignIn({ busy, onBusy, onError }: { busy: boolean; onBusy: (b: boolean) => void; onError: () => void }) {
  const t = useT();
  const router = useRouter();
  const holder = useRef<HTMLDivElement>(null);
  const live = useRef({ busy, onBusy, onError });
  live.current = { busy, onBusy, onError };
  const [fallback, setFallback] = useState(!GOOGLE_CLIENT_ID);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let alive = true;
    const nonce = newNonce(); // one per page view
    void loadGoogle().then((google) => {
      const parent = holder.current;
      if (!alive || !parent) return;
      if (!google) return setFallback(true);
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        ux_mode: 'popup',
        nonce,
        callback: async ({ credential }) => {
          if (!credential || live.current.busy) return live.current.onError();
          live.current.onBusy(true);
          const ok = await signInGoogleIdToken(credential, nonce).catch(() => false);
          live.current.onBusy(false);
          if (!ok) return live.current.onError();
          await router.invalidate();
          await router.navigate({ to: '/' });
        },
      });
      google.accounts.id.renderButton(parent, { type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with', shape: 'rectangular', width: buttonWidth(parent.clientWidth) });
    });
    return () => {
      alive = false;
    };
  }, [router]);

  if (fallback) {
    return (
      <button type="button" className={secondaryButtonClass} disabled={busy} onClick={async () => (await signInGoogle().catch(() => false)) || onError()}>
        {t('form.google')}
      </button>
    );
  }
  // min-h-11 keeps the room Google's button will fill (44px), so the form does not jump when it appears
  return <div ref={holder} className="flex min-h-11 w-full justify-center" />;
}
