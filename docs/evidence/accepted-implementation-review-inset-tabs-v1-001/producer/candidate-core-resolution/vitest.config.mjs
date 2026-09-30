// Usage (from the repository root): vitest run --config <this file> [files]
import { defineConfig, mergeConfig } from "vitest/config"
import base from "../../../../../vitest.config.ts"
import { coreAlias } from "./core-alias.mjs"
export default mergeConfig(base, defineConfig({ root: new URL("../../../../../", import.meta.url).pathname, resolve: { alias: coreAlias } }))
