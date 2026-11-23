import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:3001', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: { command: 'tsx scripts/dev.ts --fixture-e2e', url: 'http://127.0.0.1:3001/api/health', reuseExistingServer: false, timeout: 180000 }
});
