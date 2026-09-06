import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './minitool-e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    headless: true,
    viewport: { width: 390, height: 844 },
  },
  projects: [
    {
      name: 'chromium-minitool-artifact',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
