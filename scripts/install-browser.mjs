import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, ['node_modules/playwright/cli.js', 'install', 'chromium'], {
  cwd: root, stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: fileURLToPath(new URL('../.cache/ms-playwright', import.meta.url)), PLAYWRIGHT_SKIP_BROWSER_GC: '1' },
});
process.exitCode = result.status ?? 1;
