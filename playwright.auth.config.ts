import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/auth',
  testIgnore: '**/design-review.spec.ts',
  workers: 1,
  timeout: 90_000,
  use: { baseURL: 'http://127.0.0.1:3000', browserName: 'chromium', trace: 'off', screenshot: 'off' },
  webServer: {
    command: 'npm run dev', url: 'http://127.0.0.1:3000/api/health',
    reuseExistingServer: false, timeout: 180_000,
  },
});
