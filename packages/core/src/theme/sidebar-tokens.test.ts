import { describe, expect, it } from "vitest"
import {
  applyMutation,
  BASE_COLOR_TOKENS,
  COLOR_TOKENS,
  createProposalSession,
  describeOperations,
  diffThemeTokens,
  discardProposal,
  applyProposal,
  MUTATION_SCHEMA_VERSION,
  renderShadcnTailwindCss,
  SIDEBAR_COLOR_TOKENS,
  SIDEBAR_TOKEN_ALIASES,
  stageProposal,
  THEME_SCHEMA_VERSION,
  validateMutation,
  validateTheme,
} from "../index"
import type { Theme, ThemeOperation } from "../index"
import defaultFixture from "./fixtures/default.json"
import v1Fixture from "./fixtures/valid.json"

/** WSTP-03 to WSTP-09 at the core boundary: canonical v2.1 Sidebar colours, migration, source selection, mutation. */

const valid = (input: unknown): Theme => {
  const result = validateTheme(input)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.theme
}

const MODES = ["light", "dark"] as const
const base = valid(defaultFixture)

/** The frozen v2.0 shape of a theme: 24 colours per mode, no Sidebar state. */
function asV2_0(theme: Theme): Record<string, any> {
  const copy = structuredClone(theme) as Record<string, any>
  copy.schemaVersion = "2.0"
  delete copy.sidebar
  for (const mode of MODES) for (const name of SIDEBAR_COLOR_TOKENS) delete copy.colors[mode][name]
  return copy
}

const edit = (theme: Theme, ...operations: ThemeOperation[]): Theme => {
  const result = applyMutation(theme, { schemaVersion: MUTATION_SCHEMA_VERSION, requestId: "t", base: { themeId: theme.id, revision: theme.revision }, operations })
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result.theme
}

/** Resolves what each Sidebar variable renders to in a mode, following one level of `var(--alias)`. */
function resolvedSidebar(theme: Theme, mode: "light" | "dark"): Record<string, string> {
  const css = renderShadcnTailwindCss(theme)
  const block = css.slice(css.indexOf(mode === "light" ? ":root {" : ".dark {"), css.indexOf("}", css.indexOf(mode === "light" ? ":root {" : ".dark {")))
  const value = (name: string) => new RegExp(`^  --${name}: (.*);$`, "m").exec(block)?.[1]
  return Object.fromEntries(
    SIDEBAR_COLOR_TOKENS.map((name) => {
      const raw = value(name)!
      const alias = /^var\(--([a-z0-9-]+)\)$/.exec(raw)?.[1]
      return [name, alias ? theme.colors[mode][alias as keyof Theme["colors"]["light"]].$value : raw]
    })
  )
}

describe("canonical Theme v2.1 (WSTP-03)", () => {
  it("has exactly the eight new Sidebar colours per mode and the approved source state", () => {
    expect(THEME_SCHEMA_VERSION).toBe("2.1")
    expect(SIDEBAR_COLOR_TOKENS).toEqual([
      "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
      "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring",
    ])
    expect(COLOR_TOKENS).toEqual([...BASE_COLOR_TOKENS, ...SIDEBAR_COLOR_TOKENS])
    expect(COLOR_TOKENS).toHaveLength(32)
    for (const mode of MODES) expect(Object.keys(base.colors[mode])).toEqual([...COLOR_TOKENS])
    expect(Object.keys(base.sidebar)).toEqual(["useDedicatedTokens", "dedicatedValuesInitialized"])
    expect(COLOR_TOKENS.some((name) => /sidebar-(?:input|card)/.test(name))).toBe(false)
  })

  it("normalizes dedicated colours with the unchanged canonical colour rules", () => {
    const initialized = edit(base, { op: "setSidebarTokensEnabled", value: true })
    const input = structuredClone(initialized) as Record<string, any>
    input.colors.light.sidebar.$value = "#ff0000"
    input.colors.dark["sidebar-ring"].$value = "hsl(0 100% 50% / 50%)"
    const theme = valid(input)
    expect(theme.colors.light.sidebar.$value).toBe("oklch(0.627955 0.257683 29.23388)")
    expect(theme.colors.dark["sidebar-ring"].$value).toBe("oklch(0.627955 0.257683 29.23388 / 0.5)")
  })
})

describe("backward compatibility (WSTP-04)", () => {
  it("migrates strict v2.0 input deterministically, preserving every value and starting off/uninitialized", () => {
    const v20 = asV2_0(base)
    const migrated = valid(v20)
    expect(JSON.stringify(valid(structuredClone(v20)))).toBe(JSON.stringify(migrated))
    expect(migrated).toEqual(base)
    for (const mode of MODES) {
      for (const name of BASE_COLOR_TOKENS) expect(migrated.colors[mode][name]).toEqual(v20.colors[mode][name])
      for (const name of SIDEBAR_COLOR_TOKENS) expect(migrated.colors[mode][name].$value).toBe(v20.colors[mode][SIDEBAR_TOKEN_ALIASES[name]].$value)
    }
    expect(migrated.sidebar).toEqual({ useDedicatedTokens: { $type: "boolean", $value: false }, dedicatedValuesInitialized: false })
    for (const key of ["typography", "radius", "space", "shadow", "motion", "$extensions", "id", "name", "revision"] as const) expect(migrated[key]).toEqual(v20[key])
  })

  it("keeps a customized v2.0 theme's values and identity", () => {
    const v20 = asV2_0(base)
    Object.assign(v20, { id: "my-custom", name: "My Custom", revision: 7 })
    v20.colors.light.background.$value = "oklch(0.9 0.02 90)"
    v20.colors.dark.ring.$value = "oklch(0.5 0.1 200)"
    const migrated = valid(v20)
    expect(migrated).toMatchObject({ id: "my-custom", name: "My Custom", revision: 7, schemaVersion: "2.1" })
    expect(migrated.colors.light.sidebar.$value).toBe("oklch(0.9 0.02 90)")
    expect(migrated.colors.dark["sidebar-ring"].$value).toBe("oklch(0.5 0.1 200)")
  })

  it("v2.0 stays strict: no Sidebar colours or state, and no unknown keys", () => {
    const withToken = asV2_0(base)
    withToken.colors.light.sidebar = { $type: "color", $value: "oklch(1 0 0)" }
    expect(validateTheme(withToken).ok).toBe(false)
    const withState = asV2_0(base)
    withState.sidebar = base.sidebar
    expect(validateTheme(withState).ok).toBe(false)
  })

  it("migrates v1 through v2.0 to v2.1; the Quiet Editorial result is a complete canonical v2.1 theme", () => {
    const qe = valid(v1Fixture)
    expect(qe.schemaVersion).toBe("2.1")
    expect(qe.sidebar.useDedicatedTokens.$value).toBe(false)
    for (const mode of MODES) for (const name of SIDEBAR_COLOR_TOKENS) expect(qe.colors[mode][name].$value).toBe(qe.colors[mode][SIDEBAR_TOKEN_ALIASES[name]].$value)
    expect(validateTheme(JSON.parse(JSON.stringify(qe)))).toEqual({ ok: true, theme: qe })
  })
})

describe("initialization (WSTP-05)", () => {
  it("base edits keep an uninitialized set synchronized with its aliases", () => {
    const next = edit(base, { op: "setColor", mode: "light", token: "background", value: "oklch(0.95 0.01 90)" }, { op: "setColor", mode: "dark", token: "accent", value: "oklch(0.3 0.02 250)" })
    expect(next.sidebar.dedicatedValuesInitialized).toBe(false)
    expect(next.colors.light.sidebar.$value).toBe("oklch(0.95 0.01 90)")
    expect(next.colors.dark["sidebar-accent"].$value).toBe("oklch(0.3 0.02 250)")
  })

  it("first activation snapshots both modes from the current resolved aliases, with no visual change", () => {
    const edited = edit(base, { op: "setColor", mode: "dark", token: "border", value: "oklch(0.4 0 0)" })
    const on = edit(edited, { op: "setSidebarTokensEnabled", value: true })
    expect(on.sidebar).toEqual({ useDedicatedTokens: { $type: "boolean", $value: true }, dedicatedValuesInitialized: true })
    for (const mode of MODES) expect(resolvedSidebar(on, mode)).toEqual(resolvedSidebar(edited, mode))
    expect(on.colors.dark["sidebar-border"].$value).toBe("oklch(0.4 0 0)")
  })

  it("activation inside one request snapshots after earlier operations of that request", () => {
    const on = edit(base, { op: "setColor", mode: "light", token: "primary", value: "oklch(0.5 0.1 200)" }, { op: "setSidebarTokensEnabled", value: true })
    expect(on.colors.light["sidebar-primary"].$value).toBe("oklch(0.5 0.1 200)")
  })

  it("the first dedicated colour edit initializes both modes while staying off", () => {
    const next = edit(base, { op: "setColor", mode: "light", token: "sidebar", value: "oklch(0.97 0.01 250)" })
    expect(next.sidebar).toEqual({ useDedicatedTokens: { $type: "boolean", $value: false }, dedicatedValuesInitialized: true })
    expect(next.colors.light.sidebar.$value).toBe("oklch(0.97 0.01 250)")
    for (const name of SIDEBAR_COLOR_TOKENS) expect(next.colors.dark[name].$value).toBe(base.colors.dark[SIDEBAR_TOKEN_ALIASES[name]].$value)
    // Still off: the live Sidebar keeps rendering the base aliases.
    expect(resolvedSidebar(next, "light")).toEqual(resolvedSidebar(base, "light"))
  })

  it("after initialization dedicated values are independent of base edits and preserved while off", () => {
    const initialized = edit(base, { op: "setColor", mode: "light", token: "sidebar", value: "oklch(0.97 0.01 250)" })
    const baseEdited = edit(initialized, { op: "setColor", mode: "light", token: "background", value: "oklch(0.9 0 0)" }, { op: "setColor", mode: "light", token: "accent", value: "oklch(0.8 0 0)" })
    expect(baseEdited.colors.light.sidebar.$value).toBe("oklch(0.97 0.01 250)")
    expect(baseEdited.colors.light["sidebar-accent"].$value).toBe(base.colors.light.accent.$value)
    const toggled = edit(edit(baseEdited, { op: "setSidebarTokensEnabled", value: true }), { op: "setSidebarTokensEnabled", value: false })
    expect(toggled.colors).toEqual(baseEdited.colors)
    expect(toggled.sidebar.dedicatedValuesInitialized).toBe(true)
  })

  it("disabling an uninitialized set is a no-op and never initializes it", () => {
    const next = edit(base, { op: "setSidebarTokensEnabled", value: false })
    expect(next.sidebar).toEqual(base.sidebar)
    expect(diffThemeTokens(base, next)).toEqual([])
  })

  it("an uninitialized imported set is re-synchronized to its aliases on parse", () => {
    const input = structuredClone(base) as Record<string, any>
    input.colors.light.sidebar.$value = "oklch(0.5 0.05 20)"
    expect(valid(input).colors.light.sidebar.$value).toBe(base.colors.light.background.$value)
  })
})

describe("source selection (WSTP-06)", () => {
  it("off emits the eight exact aliases in both modes, including sidebar from background (not card)", () => {
    const css = renderShadcnTailwindCss(base)
    const blocks = [css.slice(css.indexOf(":root {"), css.indexOf(".dark {")), css.slice(css.indexOf(".dark {"), css.indexOf("@theme inline"))]
    for (const block of blocks) {
      for (const name of SIDEBAR_COLOR_TOKENS) expect(block).toContain(`  --${name}: var(--${SIDEBAR_TOKEN_ALIASES[name]});`)
      expect(block).not.toContain("--sidebar: var(--card)")
    }
    expect(SIDEBAR_TOKEN_ALIASES).toEqual({
      sidebar: "background", "sidebar-foreground": "foreground", "sidebar-primary": "primary", "sidebar-primary-foreground": "primary-foreground",
      "sidebar-accent": "accent", "sidebar-accent-foreground": "accent-foreground", "sidebar-border": "border", "sidebar-ring": "ring",
    })
    for (const name of SIDEBAR_COLOR_TOKENS) expect(css).toContain(`  --color-${name}: var(--${name});`)
    expect(css).not.toMatch(/--(?:color-)?sidebar-(?:input|card)/)
  })

  it("on emits the dedicated values immediately, per mode", () => {
    const on = edit(base, { op: "setSidebarTokensEnabled", value: true }, { op: "setColor", mode: "dark", token: "sidebar", value: "oklch(0.2 0.02 250)" })
    const css = renderShadcnTailwindCss(on)
    const dark = css.slice(css.indexOf(".dark {"), css.indexOf("@theme inline"))
    expect(dark).toContain("  --sidebar: oklch(0.2 0.02 250);")
    expect(css.slice(0, css.indexOf(".dark {"))).toContain(`  --sidebar: ${base.colors.light.background.$value};`)
    expect(css).not.toMatch(/--sidebar[a-z-]*: var\(/)
    // Inputs keep the ordinary input token.
    expect(css).toContain(`  --input: ${base.colors.light.input.$value};`)
  })
})

describe("mutation, diff, and proposal (WSTP-08)", () => {
  it("admits the Sidebar colours in setColor and exactly one new operation", () => {
    expect(describeOperations().map((o) => o.name)).toHaveLength(12)
    expect(describeOperations().at(-1)).toEqual({ name: "setSidebarTokensEnabled", fields: ["op", "value"] })
    const request = (operations: unknown[]) => ({ schemaVersion: MUTATION_SCHEMA_VERSION, requestId: "r", base: { themeId: base.id, revision: base.revision }, operations })
    for (const token of SIDEBAR_COLOR_TOKENS) expect(validateMutation(request([{ op: "setColor", mode: "light", token, value: "#fff" }]), base).ok).toBe(true)
    expect(validateMutation(request([{ op: "setColor", mode: "light", token: "sidebar-input", value: "#fff" }]), base)).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-token", path: "operations[0].token" }] })
    expect(validateMutation(request([{ op: "setSidebarTokensEnabled", value: "true" }]), base)).toEqual({ ok: false, errors: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }] })
    expect(validateMutation(request([{ op: "setSidebarTokensEnabled", value: true, initialized: true }]), base)).toEqual({ ok: false, errors: [{ ruleId: "mutation.unknown-field", path: "operations[0].initialized" }] })
    // Initialization bookkeeping is not an operation, field, or value anywhere in the closed vocabulary.
    expect(JSON.stringify(describeOperations())).not.toMatch(/initiali[sz]/i)
  })

  it("diffs expose the enabled state and dedicated colours, never the initialization flag", () => {
    const on = edit(base, { op: "setSidebarTokensEnabled", value: true })
    expect(diffThemeTokens(base, on)).toEqual([{ path: "sidebar.useDedicatedTokens", before: false, after: true }])
    const recolored = edit(on, { op: "setColor", mode: "light", token: "sidebar-border", value: "oklch(0.5 0 0)" })
    expect(diffThemeTokens(on, recolored)).toEqual([{ path: "colors.light.sidebar-border", before: base.colors.light.border.$value, after: "oklch(0.5 0 0)" }])
    // Before initialization a base edit reports only the base token, not its generated Sidebar copy.
    const baseEdit = edit(base, { op: "setColor", mode: "light", token: "primary", value: "oklch(0.5 0.1 200)" })
    expect(diffThemeTokens(base, baseEdit).map((entry) => entry.path)).toEqual(["colors.light.primary"])
    for (const theme of [on, recolored, baseEdit]) expect(JSON.stringify(diffThemeTokens(base, theme))).not.toMatch(/dedicatedValuesInitialized/)
  })

  it("stages, applies, and discards through the unchanged proposal lifecycle; staging never changes the active theme", () => {
    const proposal = (id: string) => ({
      schemaVersion: "1.0",
      proposalId: id,
      base: { themeId: base.id, revision: base.revision },
      provenance: { source: "fixture", sourceId: "wstp-08", createdAt: "2026-09-26T00:00:00Z" },
      operations: [{ op: "setSidebarTokensEnabled", value: true }, { op: "setColor", mode: "light", token: "sidebar", value: "oklch(0.96 0.02 250)" }],
    })
    const active = structuredClone(base)
    const staged = stageProposal(createProposalSession(), active, proposal("p1"), "2026-09-26T00:00:00Z")
    if (!staged.ok) throw new Error(JSON.stringify(staged.errors))
    expect(active).toEqual(base)
    expect(staged.staged.candidate.sidebar.useDedicatedTokens.$value).toBe(true)
    expect(staged.staged.evaluation.diff.map((entry) => entry.path)).toEqual(["colors.light.sidebar", "sidebar.useDedicatedTokens"])
    expect(staged.staged.css).toContain("  --sidebar: oklch(0.96 0.02 250);")
    const applied = applyProposal(staged.session, active, "p1", "2026-09-26T00:00:01Z")
    expect(applied.ok && applied.theme?.colors.light.sidebar.$value).toBe("oklch(0.96 0.02 250)")
    const restaged = stageProposal(createProposalSession(), active, proposal("p2"), "2026-09-26T00:00:00Z")
    if (!restaged.ok) throw new Error("expected staged")
    const discarded = discardProposal(restaged.session, active, "p2", "2026-09-26T00:00:01Z")
    expect(discarded.ok && discarded.theme).toBeUndefined()
    expect(active).toEqual(base)
    // Stale handling is unchanged: a moved base fails closed.
    const moved = edit(active, { op: "setColor", mode: "light", token: "ring", value: "oklch(0.5 0 0)" })
    const stale = applyProposal(stageProposal(createProposalSession(), active, proposal("p3"), "2026-09-26T00:00:00Z").session, moved, "p3", "2026-09-26T00:00:02Z")
    expect(stale).toMatchObject({ ok: false, errors: [{ ruleId: "mutation.stale-revision", path: "base.revision" }] })
  })
})

describe("persistence and portability (WSTP-09)", () => {
  it("round-trips an initialized, enabled v2.1 theme through JSON without loss", () => {
    const on = edit(base, { op: "setSidebarTokensEnabled", value: true }, { op: "setColor", mode: "dark", token: "sidebar-accent", value: "oklch(0.35 0.03 250)" })
    const reloaded = valid(JSON.parse(JSON.stringify(on)))
    expect(reloaded).toEqual(on)
    expect(JSON.stringify(reloaded)).toBe(JSON.stringify(on))
    expect(renderShadcnTailwindCss(reloaded)).toBe(renderShadcnTailwindCss(on))
  })
})
