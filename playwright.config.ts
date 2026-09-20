import { defineConfig } from "@playwright/test"

const PORT = 6006

// Runs against the static Storybook build (`pnpm build:storybook` first).
export default defineConfig({
  testDir: "e2e",
  testIgnore: "workbench.spec.ts",
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: "chromium" },
  projects: [
    { name: "mobile-390x844", use: { viewport: { width: 390, height: 844 } } },
    { name: "desktop-1440x900", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // serve's default clean-URL redirect (/iframe.html -> /iframe) drops the story query string;
    // the config path is resolved relative to the served directory.
    command: `serve storybook-static --listen ${PORT} --no-clipboard --config ../e2e/serve.json`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    env: { NO_UPDATE_CHECK: "1" },
  },
})
