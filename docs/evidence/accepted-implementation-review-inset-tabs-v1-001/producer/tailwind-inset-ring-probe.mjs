import { readFileSync, realpathSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
const require = createRequire(path.resolve("package.json"))
const pkgJson = require.resolve("tailwindcss/package.json")
const twDir = path.dirname(pkgJson)
const { compile } = await import(path.join(twDir, "dist/lib.mjs"))
const version = JSON.parse(readFileSync(pkgJson, "utf8")).version
// Use the committed rendered default theme (its @theme inline maps --color-border to var(--border)).
const themeCss = readFileSync("packages/core/src/theme/fixtures/default.css", "utf8")
const input = `@import "tailwindcss/utilities";\n@import "tailwindcss/theme";\n${themeCss}`
const compiler = await compile(input, {
  base: process.cwd(),
  loadStylesheet: async (id, base) => {
    const name = id.replace(/^tailwindcss\/?/, "") || "index"
    const file = path.join(twDir, `${name}.css`)
    return { path: file, base: twDir, content: readFileSync(file, "utf8") }
  },
})
const out = compiler.build(["inset-ring-1", "inset-ring-border/80", "ring-1", "ring-border/80"])
console.log("tailwindcss", version, "at", realpathSync(twDir))
const pick = (sel) => { const i = out.indexOf(sel + " {"); if (i < 0) return `${sel}: NOT FOUND`; let depth = 0, j = out.indexOf("{", i); for (let k = j; k < out.length; k++) { if (out[k] === "{") depth++; else if (out[k] === "}") { depth--; if (!depth) return out.slice(i, k + 1) } } }
for (const s of [".inset-ring-1", ".inset-ring-border\\/80", ".ring-1", ".ring-border\\/80"]) console.log(pick(s))
const props = out.match(/@property --tw-inset-ring-(shadow|color)[^}]*}/g); console.log(props?.join("\n"))
