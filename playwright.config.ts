import { defineConfig } from '@playwright/test'

// QA suite — drives the demo build (VITE_DEMO_MODE=true via .env.local) with the
// system Chrome (no browser download). Run: npx playwright test
export default defineConfig({
  testDir: './qa',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 900 }
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --port 5173',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60_000
  }
})
