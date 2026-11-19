import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

/** Loads `.env` from the repo root and returns the direct connection string. Only the variable name is ever printed. */
export function unpooledUrl(): string {
  config({ path: `${REPO_ROOT}.env`, quiet: true });
  const url = process.env['DATABASE_URL_UNPOOLED'];
  if (!url) {
    console.error('DATABASE_URL_UNPOOLED is not set. Copy .env.example to .env and fill it in (see docs/tech-decisions.md).');
    process.exit(2);
  }
  return url;
}
