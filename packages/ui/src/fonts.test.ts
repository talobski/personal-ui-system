import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { describe, expect, it } from "vitest"
import { applyMutation, MUTATION_SCHEMA_VERSION, validateTheme } from "@personal-ui/core"
import defaultFixture from "@personal-ui/core/theme/fixtures/default.json"

import { findFontOption, FONT_CATALOG, FONT_OPTIONS } from "./lib/fonts"

const require = createRequire(import.meta.url)
const faces = readFileSync(new URL("./lib/font-faces.ts", import.meta.url), "utf8")
const imports = [...faces.matchAll(/^import "([^"]+)"$/gm)].map((m) => m[1]!)

describe("self-hosted font catalog (WCPR-06)", () => {
  it("is exactly the approved 24 families in order", () => {
    expect(FONT_OPTIONS.sans.map((f) => f.label)).toEqual(["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "DM Sans", "Outfit", "Work Sans", "Space Grotesk", "Google Sans", "Poppins", "IBM Plex Sans", "Zalando Sans", "Manrope"])
    expect(FONT_OPTIONS.serif.map((f) => f.label)).toEqual(["Playfair Display", "Merriweather", "Lora", "Fraunces", "Newsreader"])
    expect(FONT_OPTIONS.mono.map((f) => f.label)).toEqual(["JetBrains Mono", "Roboto Mono", "Source Code Pro", "IBM Plex Mono", "Geist Mono"])
    const all = [...FONT_OPTIONS.sans, ...FONT_OPTIONS.serif, ...FONT_OPTIONS.mono]
    expect(all).toHaveLength(24)
    expect(new Set(all.map((f) => f.id)).size).toBe(24)
  })

  it("writes deterministic stacks with generic fallbacks that core admits through setFontFamily", () => {
    const validated = validateTheme(defaultFixture)
    if (!validated.ok) throw new Error("default fixture invalid")
    const theme = validated.theme
    for (const family of ["sans", "serif", "mono"] as const) {
      const generic = { sans: "sans-serif", serif: "serif", mono: "monospace" }[family]
      for (const font of FONT_OPTIONS[family]) {
        expect(font.stack.at(-1)).toBe(generic)
        expect(font.stack[1] === font.label || font.stack[0] === font.label).toBe(true)
        // STHG-06: every catalog family is admissible for both semantic roles, whatever its category.
        for (const target of ["heading", "body"] as const) {
          const result = applyMutation(theme, { schemaVersion: MUTATION_SCHEMA_VERSION, requestId: `font-${font.id}`, base: { themeId: theme.id, revision: theme.revision }, operations: [{ op: "setFontFamily", target, value: font.stack }] })
          expect(result.ok, font.label).toBe(true)
          if (result.ok) expect(result.theme.typography[target].font.$value).toEqual(font.stack)
        }
        expect(findFontOption(family, font.stack)).toBe(font)
        expect(findFontOption("any", font.stack)).toBe(font)
      }
    }
    expect(FONT_CATALOG).toHaveLength(24)
    expect(FONT_CATALOG.map((f) => f.category)).toEqual([...Array(14).fill("sans"), ...Array(5).fill("serif"), ...Array(5).fill("mono")])
    expect(findFontOption("any", theme.typography.body.font.$value)).toBeUndefined()
    expect(FONT_OPTIONS.sans.find((f) => f.label === "Inter")!.stack).toEqual(["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"])
    expect(FONT_OPTIONS.mono.find((f) => f.label === "IBM Plex Mono")!.stack).toEqual(["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"])
  })

  it("serves every face from its exact pinned local package with only bundled font files", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { dependencies: Record<string, string> }
    const fontDeps = Object.keys(pkg.dependencies).filter((name) => name.startsWith("@fontsource"))
    expect(fontDeps).toHaveLength(24)
    for (const name of fontDeps) expect(pkg.dependencies[name]).toMatch(/^\d+\.\d+\.\d+$/)
    expect(new Set(imports.map((i) => i.split("/").slice(0, 2).join("/")))).toEqual(new Set(fontDeps))
    expect(fontDeps.filter((name) => name.startsWith("@fontsource/")).sort()).toEqual(["@fontsource/ibm-plex-mono", "@fontsource/lato", "@fontsource/poppins"])

    const registered = new Set<string>()
    for (const specifier of imports) {
      const css = readFileSync(require.resolve(specifier), "utf8")
      for (const [, family] of css.matchAll(/font-family: '([^']+)'/g)) registered.add(family!)
      const urls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]!)
      expect(urls.length, specifier).toBeGreaterThan(0)
      for (const url of urls) expect(url, specifier).toMatch(/^\.\/files\/[a-z0-9-]+\.woff2?$/)
      expect(css).not.toMatch(/https?:|@import/)
    }
    for (const font of [...FONT_OPTIONS.sans, ...FONT_OPTIONS.serif, ...FONT_OPTIONS.mono]) expect(registered, font.label).toContain(font.stack[0])
    expect(registered.size).toBe(24)
  })
})
