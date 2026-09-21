import { defineConfig } from "vitest/config"

export default defineConfig({
  ssr: { noExternal: ["@loop-engineering/jev-core"] },
  test: {
    include: [
      "packages/core/src/**/*.test.ts",
      "packages/ui/src/**/*.test.ts",
      "apps/workbench/src/**/*.test.ts",
      "tools/loop/jev/**/*.test.ts",
    ],
  },
})
