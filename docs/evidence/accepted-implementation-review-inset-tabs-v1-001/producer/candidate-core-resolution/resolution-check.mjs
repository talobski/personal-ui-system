// Usage (from the repository root): node <this file>. Shows where `@personal-ui/core` resolves with the override config
// and prints the Tactile runtime CSS TabsList rule the Workbench would post.
import { fileURLToPath } from "node:url"
import { createServer } from "vite"
const root = fileURLToPath(new URL("../../../../../", import.meta.url))
const server = await createServer({ configFile: fileURLToPath(new URL("./vitest.config.mjs", import.meta.url)), server: { middlewareMode: true, hmr: false }, logLevel: "silent" })
const resolved = await server.pluginContainer.resolveId("@personal-ui/core", `${root}apps/workbench/src/lifecycle.ts`)
console.log("@personal-ui/core ->", resolved.id)
const life = await server.ssrLoadModule(`${root}apps/workbench/src/lifecycle.ts`)
const [def] = life.loadBuiltInThemes()
const on = life.editTheme(def, { op: "setUiEffects", value: { effect: "tactile", strength: 50 } }).theme
const css = life.previewVariablesCss(on)
console.log(css.slice(css.indexOf('  :where([data-slot="tabs-list"]')).trimEnd())
await server.close()
