import { defineConfig } from "@playwright/test"

const PORT = Number(process.env.WORKBENCH_PORT ?? 5174)

/**
 * Runs against the real `vite dev` server (not `vite preview`'s static build), so this specifically exercises the
 * real localhost product API middleware in `apps/workbench/vite.config.ts` end-to-end in a browser, without any
 * live Jev/TypeSafe call: `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY` is explicitly forced empty in this webServer's
 * environment below, overriding whatever the outer shell may have set, so the middleware can only ever resolve to
 * `transport.missing-credential` and can never reach `api.typesafe.ai`. See
 * `apps/workbench/src/server/designCommandHandler.test.ts` for the equivalent offline, non-browser evidence, and
 * `playwright.workbench.config.ts` for the separate `vite preview`-based suite used for build evidence.
 */
export default defineConfig({
  testDir: "e2e",
  testMatch: ["design-command-live-boundary.spec.ts"],
  reporter: "list",
  use: { baseURL: `http://127.0.0.1:${PORT}`, browserName: "chromium" },
  webServer: {
    command: `vite apps/workbench --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    env: {
      // Explicit, supervised, and empty: never inherits a real key from the outer environment.
      TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY: "",
      // These must never be read by the handler either; present here only so a violation would be observable if
      // the boundary ever regressed (it would show up as a used-sentinel value in outbound requests, which the
      // test also asserts never happen at all).
      TYPESAFE_LOOP_ENGINEERING_API_KEY: "loop-sentinel-must-never-be-read",
      TYPESAFE_API_KEY: "generic-sentinel-must-never-be-read",
    },
  },
})
