import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

process.env.PLAYWRIGHT_BROWSERS_PATH = fileURLToPath(new URL('./.cache/ms-playwright', import.meta.url));
process.env.PLAYWRIGHT_SKIP_BROWSER_GC = '1';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:8011',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: [
    {
      command: 'node bootstrap/ssr/ssr.js',
      url: 'http://127.0.0.1:13714/health',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      env: { APP_ENV: 'testing' },
      command: 'php artisan serve --env=testing --host=127.0.0.1 --port=8011 --no-reload',
      url: 'http://127.0.0.1:8011/up',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
