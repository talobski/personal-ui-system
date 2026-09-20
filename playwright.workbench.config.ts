import { defineConfig } from "@playwright/test"

const PORT = 5173

// Runs against the production workbench build (`pnpm build:workbench` first).
export default defineConfig({
  testDir: "e2e",
  testMatch: "workbench.spec.ts",
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: "chromium" },
  projects: [
    { name: "workbench-mobile-390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "workbench-desktop-1440x900", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: `vite preview apps/workbench --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
  },
})
