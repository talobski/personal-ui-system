// Usage (from apps/workbench): vite build --config <this file>; vite preview --config <this file>
import { mergeConfig } from "vite"
import base from "../../../../../apps/workbench/vite.config.ts"
import { coreAlias } from "./core-alias.mjs"
export default mergeConfig({ resolve: { alias: coreAlias } }, base)
