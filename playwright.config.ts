import { defineConfig } from '@playwright/test';

/**
 * End-to-end smoke: the stage is a WebGL canvas, so unit tests can only cover
 * pure helpers. This suite checks the things that actually broke during the
 * audit — a blank stage, an overlay that never releases, a modal that ignores
 * the back button — on the built bundle.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Pin the UI language: the app guesses from navigator.language, and CI
    // runners default to en-US.
    locale: 'zh-CN',
    // Software WebGL for headless CI: without this the stage falls back and the
    // smoke test would be asserting the degraded path by accident.
    launchOptions: {
      args: ['--enable-unsafe-swiftshader', '--no-sandbox'],
      // Local runs reuse the system Chromium; CI installs Playwright's own.
      ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
        : {}),
    },
  },
  webServer: {
    command: 'npm run preview:e2e',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
