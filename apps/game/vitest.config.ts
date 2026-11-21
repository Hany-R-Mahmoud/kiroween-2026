import { defineConfig } from 'vitest/config';

// Plain config on purpose: tests import pure modules and must not load the Start plugin, a server or a database.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'], testTimeout: 120_000, hookTimeout: 120_000 },
});
