import { defineConfig, devices } from '@playwright/test';
import { bddOutput } from './e2e/bdd.config';

export default defineConfig({
  // Generated spec files land in .features-gen/ — that is the testDir
  testDir: bddOutput,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Single worker: all tests share the seeded store; parallel runs would
  // race on mutable fixtures (create/edit/delete scenarios)
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    // ── 1. Setup: seed DB + save admin storageState ──────────────────────────
    {
      name: 'setup',
      testDir: 'e2e/support',
      testMatch: /.*global-setup\.ts/,
    },

    // ── 2. BDD tests: run after setup ────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // storageState is NOT set here: scenarios get auth via
        // the Before({ tags: '@admin' }) hook in common.steps.ts
      },
      dependencies: ['setup'],
    },
  ],
});
