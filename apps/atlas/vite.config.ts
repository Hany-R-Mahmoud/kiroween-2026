import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { media } from './vite.media.ts';
/**
 * Start's own env plugin loads .env files from Vite's `root` (apps/atlas) and ignores `envDir`. This loads them from
 * `envDir` into the server's process.env instead. Variables already set in the real environment win.
 * shortcut: copied from apps/game/vite.config.ts (the game may not change this phase); move both into the skeleton later.
 */
const serverEnvFromEnvDir = (): Plugin => ({
  name: 'kiroween:server-env-from-envdir',
  enforce: 'pre',
  configResolved(config) {
    for (const [k, v] of Object.entries(loadEnv(config.mode, config.envDir || config.root, ''))) process.env[k] ??= v;
  },
});
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
// The atlas owns `/` on the shared domain; the game lives under /game and the atlas never serves anything there.
export default defineConfig({
  // the one .env for the whole workspace lives at the repo root
  envDir: repoRoot,
  // Only variables with this prefix are ever put in the browser bundle. None exist, so nothing in .env can reach the client.
  envPrefix: 'KIROWEEN_PUBLIC_',
  server: { port: 3001 },
  resolve: { tsconfigPaths: true },
  // the React plugin must come after Start's plugin. Nitro builds the Vercel output and runs only on Vercel (VERCEL is set
  // there), so local builds, serve-build.mjs and the smoke scripts keep using Start's own server output.
  plugins: [serverEnvFromEnvDir(), media(`${repoRoot}assets`), tanstackStart(), ...(process.env.VERCEL ? [nitro()] : []), viteReact(), tailwindcss()],
});
