import { defineConfig } from 'vitest/config';
// Plain config on purpose: tests render components and call pure modules; they never load the Start plugin, a server
// or a database.
export default defineConfig({
  test: { include: ['test/**/*.test.{ts,tsx}'] },
});
