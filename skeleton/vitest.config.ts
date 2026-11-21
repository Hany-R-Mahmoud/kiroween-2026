import { defineConfig } from 'vitest/config';
// The play property files each run hundreds of full Runs (the atlas player alone takes about 150 s on an idle machine), so a
// fixed wall-clock limit fails when the CPU is shared (dev servers, other tests). Timeouts are generous and the number of files
// running at once is capped, so the heavy files do not slow each other down. Iteration counts are unchanged.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'], testTimeout: 900_000, hookTimeout: 120_000, maxWorkers: 4 },
});
