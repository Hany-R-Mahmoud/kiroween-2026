import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

// Migrations need the direct (unpooled) string. The value is never printed; only the variable name is.
const url = process.env['DATABASE_URL_UNPOOLED'];
if (!url && process.argv.includes('migrate')) throw new Error('DATABASE_URL_UNPOOLED is not set (see .env.example)');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  ...(url ? { dbCredentials: { url } } : {}),
});
