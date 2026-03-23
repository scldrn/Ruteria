import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import path from 'path'

// Cargar .env.local para que los tests tengan acceso a las variables de entorno
config({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  // Los specs e2e comparten la misma BD local y mutan datos reales.
  // Forzar un solo worker evita flakiness entre sprints.
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer — app must be running separately
})
