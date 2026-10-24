import { describe, expect, it } from "vitest"
import { V1_MIGRATION_DEFAULTS, V3_MIGRATION_DEFAULTS, validateTheme } from "../index"
import type { Theme } from "../index"
import defaultFixture from "./fixtures/default.json"
import legacyDefaultV2_0 from "./fixtures/legacy/default.v2.0.json"
import legacyDefaultV2_1 from "./fixtures/legacy/default.v2.1.json"
import v1Fixture from "./fixtures/legacy/quiet-editorial.v1.json"
import quietEditorialFixture from "./fixtures/valid.json"

const migrate = (input: unknown): Theme => {
  const result = validateTheme(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
}

describe("v1 -> v3 migration (TSV2-01, TSV2-03, STHG-04)", () => {
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
    // v1 sans -> v2 sans -> v3 Body; v1 mono -> v3 mono.
    expect(qe.typography.body.font.$value).toEqual(v1.typography.sans.$value)
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
    // The v1 -> v2 serif default becomes the v3 Heading font; the v1 -> v2 tracking default reaches both roles.
    expect(qe.typography.heading.font.$value).toEqual([...V1_MIGRATION_DEFAULTS.serif])
    expect(qe.typography.heading.font.$value).not.toEqual(defaultFixture.typography.heading.font.$value)
    expect(qe.typography.heading.tracking.$value).toBe("0em")
    expect(qe.typography.body.tracking.$value).toBe("0em")
    expect(qe.typography.heading.weight.$value).toBe(V3_MIGRATION_DEFAULTS.headingWeight)
    expect(qe.typography.body.weight.$value).toBe(V3_MIGRATION_DEFAULTS.bodyWeight)
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

/** The exact owner-approved v2.x -> v3 typography mapping, on a v2.1 input with three distinct stacks. */
describe("v2.1 -> v3 semantic typography migration (STHG-03, STHG-04)", () => {
  // v2.1 cannot carry the v3-only `tones`, so the input is Default without them.
  const { tones: _defaultTones, ...defaultWithoutTones } = structuredClone(defaultFixture)
  const v21 = {
    ...defaultWithoutTones,
    $schema: "https://personal-ui.local/schema/theme-2.json",
    schemaVersion: "2.1",
    id: "saved-custom",
    name: "Saved Custom",
    revision: 12,
    typography: {
      sans: { $type: "fontFamily", $value: ["Inter Variable", "Inter", "ui-sans-serif", "system-ui", "sans-serif"] },
      serif: { $type: "fontFamily", $value: ["Fraunces Variable", "Fraunces", "ui-serif", "Georgia", "serif"] },
      mono: { $type: "fontFamily", $value: ["Geist Mono Variable", "Geist Mono", "ui-monospace", "monospace"] },
      tracking: { $type: "dimension", $value: "-0.0100em" },
    },
  }
  const migrated = migrate(v21)

  it("serif -> Heading font, sans -> Body font, mono -> Mono, tracking -> both roles, weights 600/400", () => {
    expect(V3_MIGRATION_DEFAULTS).toEqual({ headingWeight: 600, bodyWeight: 400 })
    expect(migrated.typography).toEqual({
      heading: {
        font: { $type: "fontFamily", $value: v21.typography.serif.$value },
        weight: { $type: "fontWeight", $value: 600 },
        tracking: { $type: "dimension", $value: "-0.01em" },
      },
      body: {
        font: { $type: "fontFamily", $value: v21.typography.sans.$value },
        weight: { $type: "fontWeight", $value: 400 },
        tracking: { $type: "dimension", $value: "-0.01em" },
      },
      mono: { $type: "fontFamily", $value: v21.typography.mono.$value },
    })
  })

  it("keeps identity, revision, and every non-typography value; output is canonical v3 and idempotent", () => {
    expect(migrated).toMatchObject({ schemaVersion: "3.0", $schema: "https://personal-ui.local/schema/theme-3.json", id: "saved-custom", name: "Saved Custom", revision: 12 })
    for (const key of ["colors", "radius", "space", "shadow", "motion", "sidebar", "$extensions"] as const) expect(migrated[key]).toEqual(defaultFixture[key])
    expect(migrate(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated)
    expect(JSON.stringify(migrate(structuredClone(v21)))).toBe(JSON.stringify(migrated))
  })

  it("rejects v2.1 input under the v3 version, v3 input under v2.1, and mixed legacy/semantic typography", () => {
    expect(validateTheme({ ...structuredClone(v21), schemaVersion: "3.0", $schema: "https://personal-ui.local/schema/theme-3.json" }).ok).toBe(false)
    expect(validateTheme({ ...structuredClone(migrated), schemaVersion: "2.1", $schema: "https://personal-ui.local/schema/theme-2.json" }).ok).toBe(false)
    expect(validateTheme({ ...structuredClone(migrated), typography: { ...migrated.typography, sans: v21.typography.sans } }).ok).toBe(false)
  })

  it("reports (never drops) an invalid legacy value with its v2.1 path", () => {
    const bad = structuredClone(v21) as Record<string, any>
    bad.typography.tracking.$value = "0.5em"
    const result = validateTheme(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.issues.map((issue) => issue.path)).toEqual(["typography.tracking.$value"])
  })
})

/**
 * STHG-04 committed fixtures. Both built-ins are canonical v3 files; the v1, v2.0, and v2.1 inputs live in
 * `fixtures/legacy/` so migration coverage never depends on a built-in staying legacy. Legacy migration retains serif Heading; NGIP-09 intentionally corrects only canonical built-ins.
 */
describe("committed built-ins are canonical v3; legacy inputs preserve their serif Heading", () => {
  const exact = (input: unknown, fixture: unknown) => expect(JSON.stringify(migrate(input))).toBe(JSON.stringify(fixture))

  it("keeps the legacy inputs at their frozen versions", () => {
    expect([v1Fixture.schemaVersion, legacyDefaultV2_0.schemaVersion, legacyDefaultV2_1.schemaVersion]).toEqual(["1.0", "2.0", "2.1"])
    expect(Object.keys(legacyDefaultV2_1.typography)).toEqual(["sans", "serif", "mono", "tracking"])
    expect("sidebar" in legacyDefaultV2_0).toBe(false)
  })

  it("commits Default and Quiet Editorial as canonical v3 built-ins", () => {
    for (const fixture of [defaultFixture, quietEditorialFixture]) {
      expect(fixture.schemaVersion).toBe("3.0")
      expect(fixture.$schema).toBe("https://personal-ui.local/schema/theme-3.json")
      expect(Object.keys(fixture.typography)).toEqual(["heading", "body", "mono"])
      exact(fixture, fixture)
    }
  })

  for (const [legacy, fixture] of [[v1Fixture, quietEditorialFixture], [legacyDefaultV2_1, defaultFixture], [legacyDefaultV2_0, defaultFixture]]) {
    it(`NGIP-10 ${legacy.id} ${legacy.schemaVersion} migration differs only in the intentional built-in Heading override and tones`, () => {
      const migrated = migrate(legacy)
      expect(migrated.typography.heading.font.$value).toEqual([...V1_MIGRATION_DEFAULTS.serif])
      // Migration adds no tones (a legacy theme renders the shared defaults); the built-in stores Secuna's palette.
      expect(migrated.tones).toBeUndefined()
      const corrected = structuredClone(migrated)
      corrected.typography.heading.font = structuredClone(corrected.typography.body.font)
      corrected.tones = structuredClone((fixture as { tones: typeof corrected.tones }).tones)
      expect(corrected).toEqual(fixture)
    })
  }

  it("the committed Quiet Editorial is the approved mapping of its legacy stacks", () => {
    const v1 = v1Fixture as Record<string, any>
    expect(quietEditorialFixture.typography).toEqual({
      heading: { font: v1.typography.sans, weight: { $type: "fontWeight", $value: 600 }, tracking: { $type: "dimension", $value: "0em" } },
      body: { font: v1.typography.sans, weight: { $type: "fontWeight", $value: 400 }, tracking: { $type: "dimension", $value: "0em" } },
      mono: v1.typography.mono,
    })
    expect(quietEditorialFixture).toMatchObject({ id: "quiet-editorial", name: "Quiet Editorial", revision: 1, $extensions: v1.$extensions })
  })
})
