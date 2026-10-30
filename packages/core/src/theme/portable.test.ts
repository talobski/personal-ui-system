import { describe, expect, it } from "vitest"
import { renderPortableThemeCss, renderShadcnTailwindCss, resolveTones, toPortableTheme, uiEffectsTokens, validateTheme } from "../index"
import type { Theme } from "../index"
import amberDusk from "./fixtures/amber-dusk.json"
import defaultFixture from "./fixtures/default.json"
import quietEditorial from "./fixtures/valid.json"

const valid = (input: unknown): Theme => {
  const result = validateTheme(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
}
const builtIns = [defaultFixture, quietEditorial, amberDusk].map(valid)
const tactile = valid({ ...structuredClone(builtIns[0]!), uiEffects: uiEffectsTokens({ effect: "tactile", strength: 35 }) })
/** The same design under a distinctive identity, so any identity leak is detectable in the output. */
const rebrand = (theme: Theme, id: string, name: string, revision: number): Theme =>
  valid({ ...structuredClone(theme), id, name, revision, $extensions: { "personal-ui-system": { displayName: name } } })
const json = (theme: Theme) => JSON.stringify(toPortableTheme(theme), null, 2)
const DESIGN_KEYS = ["colors", "tones", "typography", "radius", "space", "shadow", "motion", "sidebar"]

describe("portable theme export", () => {
  it("CSS carries no generator, Personal UI, theme identity, revision or 'Do not edit' header", () => {
    for (const source of [...builtIns, tactile]) {
      const theme = rebrand(source, "acme-secret", "Acme Secret", 987654)
      const css = renderPortableThemeCss(theme)
      expect(css.startsWith(":root {\n")).toBe(true)
      for (const leak of ["@personal-ui", "personal-ui", "UI Theme Workbench", "renderShadcnTailwindCss", "acme-secret", "Acme Secret", "revision", "987654", "Do not edit"]) {
        expect(css, leak).not.toContain(leak)
      }
      // Only the header differs from the internal render: the stylesheet itself is unchanged.
      const internal = renderShadcnTailwindCss(theme)
      expect(internal.slice(internal.indexOf("\n") + 1)).toBe(css)
    }
    expect(renderPortableThemeCss(tactile)).toContain("/* UI effects: tactile, strength 35. */")
  })

  it("JSON drops $schema, schemaVersion, kind, id, name, revision, $extensions and internal Sidebar bookkeeping", () => {
    for (const source of [...builtIns, tactile]) {
      const theme = rebrand(source, "acme-secret", "Acme Secret", 987654)
      const portable = toPortableTheme(theme)
      for (const key of ["$schema", "schemaVersion", "kind", "id", "name", "revision", "$extensions"]) expect(portable, key).not.toHaveProperty(key)
      expect(portable.sidebar).not.toHaveProperty("dedicatedValuesInitialized")
      const text = json(theme)
      for (const leak of ["personal-ui", "acme-secret", "Acme Secret", "revision", "987654", "schema"]) expect(text, leak).not.toContain(leak)
    }
  })

  it("JSON keeps every design token: colours, resolved tones, typography, radius, space, shadows, motion, Sidebar source and UI effects", () => {
    for (const theme of [...builtIns, tactile]) {
      const portable = toPortableTheme(theme)
      expect(Object.keys(portable)).toEqual(theme.uiEffects ? [...DESIGN_KEYS, "uiEffects"] : DESIGN_KEYS)
      expect(portable.colors).toEqual(theme.colors)
      expect(portable.tones).toEqual(resolveTones(theme))
      expect(portable.typography).toEqual(theme.typography)
      expect(portable.radius).toEqual(theme.radius)
      expect(portable.space).toEqual(theme.space)
      expect(portable.shadow).toEqual(theme.shadow)
      expect(portable.motion).toEqual(theme.motion)
      expect(portable.sidebar).toEqual({ useDedicatedTokens: theme.sidebar.useDedicatedTokens })
      expect(portable.uiEffects).toEqual(theme.uiEffects)
    }
  })

  it("identical design under different names, ids and revisions exports byte-identical JSON and CSS", () => {
    for (const source of [...builtIns, tactile]) {
      const a = rebrand(source, "client-one", "Client One", 1)
      const b = rebrand(source, "other-brand-x", "Other Brand X", 97)
      expect(json(a)).toBe(json(b))
      expect(renderPortableThemeCss(a)).toBe(renderPortableThemeCss(b))
      // A genuine design difference still shows up.
      const recolored = valid({ ...structuredClone(b), colors: { ...b.colors, light: { ...b.colors.light, primary: { $type: "color", $value: "oklch(0.5 0.1 200)" } } } })
      expect(json(recolored)).not.toBe(json(a))
      expect(renderPortableThemeCss(recolored)).not.toBe(renderPortableThemeCss(a))
    }
  })
})
