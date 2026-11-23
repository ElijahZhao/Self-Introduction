import { defineConfig } from 'vitest/config';

// Unit tests only cover pure logic under src/. The Playwright suite in
// tests/e2e has its own runner and must not be collected here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
