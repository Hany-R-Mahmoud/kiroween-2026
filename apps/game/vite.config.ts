import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Start's own env plugin loads .env files from Vite's `root` (apps/game) and ignores `envDir`. This loads them from
 * `envDir` into the server's process.env instead. Variables already set in the real environment win.
 */
const serverEnvFromEnvDir = (): Plugin => ({
  name: 'kiroween:server-env-from-envdir',
  enforce: 'pre',
  configResolved(config) {
    for (const [k, v] of Object.entries(loadEnv(config.mode, config.envDir || config.root, ''))) process.env[k] ??= v;
  },
});

// The atlas will own `/` on the same domain, so this app lives under /game. Vite `base` places assets and
// server-function URLs under /game; the router base path must also be set explicitly, or pages 404 (Task 2 spike).
export default defineConfig({
  base: '/game/',
  // the one .env for the whole workspace lives at the repo root
  envDir: fileURLToPath(new URL('../../', import.meta.url)),
  // Only variables with this prefix are ever put in the browser bundle. None exist, so nothing in .env (database,
  // auth secret) can reach the client even if someone gives it the usual VITE_ prefix.
  envPrefix: 'KIROWEEN_PUBLIC_',
  server: { port: 3000 },
  resolve: { tsconfigPaths: true },
  // the React plugin must come after Start's plugin
  plugins: [serverEnvFromEnvDir(), tanstackStart({ router: { basepath: '/game' } }), viteReact(), tailwindcss()],
});
