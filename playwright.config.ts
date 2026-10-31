import { defineConfig } from '@playwright/test';

/** BASE_URL defaults to a local production server (npm run build && npm start with SEED_DEMO=true). */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000', locale: 'fa-IR', screenshot: 'only-on-failure', trace: 'off' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1366, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
});
