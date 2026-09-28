import { defineConfig } from '@playwright/test';

// End-to-end tests run the production build in Chromium (software WebGL is fine, just slow).
// In this repo's cloud sessions Chromium is pre-installed: set PW_CHROMIUM_PATH=/opt/pw-browsers/chromium.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 1100, height: 700 },
    launchOptions: {
      executablePath: process.env['PW_CHROMIUM_PATH'] || undefined,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    },
  },
  webServer: [
    {
      command: 'npx vite build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173/',
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
    {
      // the same build served the way GitHub Pages serves a project site: from a subpath
      command: 'npx vite build --outDir dist-pages && npx vite preview --outDir dist-pages --port 4174 --strictPort --base /claude-code/',
      url: 'http://localhost:4174/claude-code/',
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
    },
  ],
});
