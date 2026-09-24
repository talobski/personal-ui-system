import { describe, expect, it } from "vitest"
import { V1_MIGRATION_DEFAULTS, validateTheme } from "../index"
import type { Theme } from "../index"
import defaultFixture from "./fixtures/default.json"
import v1Fixture from "./fixtures/valid.json"

const migrate = (input: unknown): Theme => {
  const result = validateTheme(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
}

describe("v1 -> v2 migration (TSV2-01, TSV2-03)", () => {
  const v1 = v1Fixture as Record<string, any>
  const qe = migrate(v1Fixture)

  it("is deterministic", () => {
    expect(JSON.stringify(migrate(structuredClone(v1Fixture)))).toBe(JSON.stringify(qe))
  })

  it("keeps identity and revision", () => {
    expect(qe).toMatchObject({ id: "quiet-editorial", name: "Quiet Editorial", revision: 1, kind: "personal-ui-theme" })
    expect(qe.$extensions).toEqual(v1.$extensions)
  })

  it("carries every v1 value without semantic loss (colours compared as canonical OKLCH)", () => {
    for (const mode of ["light", "dark"] as const) {
      for (const [name, token] of Object.entries(v1.modes[mode].color as Record<string, { $value: string }>)) {
        const migrated = qe.colors[mode][name as keyof Theme["colors"]["light"]].$value
        // v1 percent alpha (e.g. `/ 10%`) becomes the equivalent decimal; every other v1 value is already canonical.
        expect(migrated, `${mode}.${name}`).toBe(token.$value.replace(/ \/ (\d+)%\)$/, (_m, p) => ` / ${Number(p) / 100})`))
      }
    }
    expect(qe.typography.sans.$value).toEqual(v1.typography.sans.$value)
    expect(qe.typography.mono.$value).toEqual(v1.typography.mono.$value)
    for (const name of ["sm", "md", "lg"] as const) expect(qe.radius[name].$value).toBe(v1.radius[name].$value)
    expect(qe.space).toEqual(v1.space)
    expect(qe.motion).toEqual(v1.motion)
    for (const tier of ["sm", "md", "lg"] as const) {
      expect(qe.shadow[tier].$value).toEqual(
        v1.shadow[tier].$value.map((layer: Record<string, string>) => ({ inset: false, ...layer, color: layer.color.replace(/ \/ (\d+)%\)$/, (_m, p) => ` / ${Number(p) / 100})`) }))
      )
    }
  })

  it("adds only the declared defaults for tokens v1 cannot express", () => {
    expect(qe.colors.light["destructive-foreground"].$value).toBe(V1_MIGRATION_DEFAULTS.destructiveForeground.light)
    expect(qe.colors.dark["destructive-foreground"].$value).toBe(V1_MIGRATION_DEFAULTS.destructiveForeground.dark)
    expect(qe.typography.serif.$value).toEqual([...V1_MIGRATION_DEFAULTS.serif])
    expect(qe.typography.serif.$value).toEqual(defaultFixture.typography.serif.$value)
    expect(qe.typography.tracking.$value).toBe("0em")
    // v1 rendered `--radius` from radius.md; v2 renders it from radius.base.
    expect(qe.radius.base.$value).toBe(v1.radius.md.$value)
    expect(qe.radius.xl.$value).toBe("0.75rem")
    expect(qe.shadow.default.$value).toEqual(qe.shadow.sm.$value)
    for (const tier of ["2xs", "xs", "xl", "2xl"] as const) expect(qe.shadow[tier].$value).toEqual(V1_MIGRATION_DEFAULTS.shadowTierDefaults[tier])
  })

  it("preserves what a v1 theme rendered for tiers it could not express (Tailwind v4.3.3 defaults)", () => {
    // Values as written in tailwindcss/theme.css: radius-xl 0.75rem; shadow-2xs `0 1px rgb(0 0 0 / 0.05)`;
    // shadow-xs `0 1px 2px 0 rgb(0 0 0 / 0.05)`; shadow-xl `0 20px 25px -5px .., 0 8px 10px -6px ..` at 0.1;
    // shadow-2xl `0 25px 50px -12px rgb(0 0 0 / 0.25)`.
    const css = (tier: keyof Theme["shadow"]) => qe.shadow[tier].$value.map((l) => `${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread} ${l.color}`).join(", ")
    expect(css("2xs")).toBe("0px 1px 0px 0px oklch(0 0 0 / 0.05)")
    expect(css("xs")).toBe("0px 1px 2px 0px oklch(0 0 0 / 0.05)")
    expect(css("xl")).toBe("0px 20px 25px -5px oklch(0 0 0 / 0.1), 0px 8px 10px -6px oklch(0 0 0 / 0.1)")
    expect(css("2xl")).toBe("0px 25px 50px -12px oklch(0 0 0 / 0.25)")
  })

  it("maps an empty v1 shadow (rendered `none`) to one transparent layer", () => {
    const input = structuredClone(v1Fixture) as Record<string, any>
    input.shadow.md.$value = []
    expect(migrate(input).shadow.md.$value).toEqual([V1_MIGRATION_DEFAULTS.emptyShadowLayer])
  })

  it("rejects v1 input that fails the frozen v1 schema with v1 paths", () => {
    const input = structuredClone(v1Fixture) as Record<string, any>
    input.modes.light.color.primary.$value = "#fff"
    input.typography.serif = { $type: "fontFamily", $value: ["x"] }
    const result = validateTheme(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.map((i) => i.path).sort()).toEqual(["modes.light.color.primary.$value", "typography"])
  })

  it("does not accept v2 shape under a v1 version or v1 shape under a v2 version", () => {
    expect(validateTheme({ ...structuredClone(defaultFixture), schemaVersion: "1.0" }).ok).toBe(false)
    expect(validateTheme({ ...structuredClone(v1Fixture), schemaVersion: "2.0" }).ok).toBe(false)
  })
})
