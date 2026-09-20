import { defineConfig } from "vitest/config"

export default defineConfig({
  test: { include: ["packages/core/src/**/*.test.ts", "apps/workbench/src/**/*.test.ts","tools/loop/jev/**/*.test.ts"] },
})
