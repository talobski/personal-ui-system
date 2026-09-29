import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { applyProposal, COLOR_TOKENS, createProposalSession, diffThemeTokens, discardProposal, normalizeColor, renderShadcnTailwindCss, SIDEBAR_COLOR_TOKENS, SIDEBAR_TOKEN_ALIASES, stageProposal, validateTheme } from "@personal-ui/core"

import {
  createCustomTheme,
  customThemeId,
  editColor,
  editTheme,
  exportThemeJson,
  DEFAULT_THEME_ID,
  loadBuiltInThemes,
  previewVariablesCss,
} from "./lifecycle"
import { buildFontOperation, fontControlCopy, buildShadowColorOperation, COLOR_GROUPS, colorTokenLabel, NUMERIC_CONTROLS, pickedColorInput, pickerHex, parseNumericDraft, readFontStack, readShadowColor, TYPE_ROLE_GROUPS } from "./controls"
import type { NumericControlId } from "./controls"
import { deleteTheme, emptySaved, loadSaved, saveSelection, saveTheme, STORAGE_KEY } from "./persistence"
import type { StorageLike } from "./persistence"
import v1QuietEditorial from "@personal-ui/core/theme/fixtures/legacy/quiet-editorial.v1.json"

const builtIns = loadBuiltInThemes()
const BUILT_IN_IDS = builtIns.map((theme) => theme.id)
const defaultTheme = builtIns[0]!
/** Quiet Editorial, the accepted v1 fixture migrated to v3; most lifecycle tests keep exercising it. */
const canonical = builtIns[1]!
const VALID = "oklch(0.4 0.1 150)"

it("WSPF-05/06 muted pair debt stays measured; PUI-120 section triggers now use the Secondary pair, which clears 4.5:1", () => {
  const rgb = (color: string) => pickerHex(color).slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255)
  const luminance = (channels: number[]) => channels.reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i]! * (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4), 0)
  const ratio = (a: number[], b: number[]) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)
  // bg-muted is opaque, so the resting label pair is exactly muted-foreground on muted.
  const pairs = builtIns.flatMap(theme => (["light", "dark"] as const).map(mode => ({
    id: `${theme.id}/${mode}`,
    ratio: ratio(rgb(theme.colors[mode]["muted-foreground"].$value), rgb(theme.colors[mode].muted.$value)),
  })))
  // Measured, not hidden: the pre-approved deferred Default-theme debt is exactly one pairing at about 4.35:1.
  const below = pairs.filter(pair => pair.ratio < 4.5)
  expect(below.map(pair => pair.id)).toEqual(["default/light"])
  expect(below[0]!.ratio).toBeGreaterThan(4.3)
  expect(below[0]!.ratio).toBeLessThan(4.4)
  // Default-theme tokens are frozen in this phase.
  expect([defaultTheme.colors.light["muted-foreground"].$value, defaultTheme.colors.light.muted.$value]).toEqual(["oklch(0.555527 0 0)", "oklch(0.970151 0 0)"])
  expect([pickerHex(defaultTheme.colors.light["muted-foreground"].$value), pickerHex(defaultTheme.colors.light.muted.$value)]).toEqual(["#737373", "#f5f5f5"])
  // PUI-120: the section trigger is the accepted Secondary variant; its resting label pair is secondary-foreground on
  // secondary, and it clears 4.5:1 in both built-ins and modes.
  const secondary = builtIns.flatMap(theme => (["light", "dark"] as const).map(mode => ratio(rgb(theme.colors[mode]["secondary-foreground"].$value), rgb(theme.colors[mode].secondary.$value))))
  for (const value of secondary) expect(value).toBeGreaterThanOrEqual(4.5)
  const source = readFileSync(new URL("./LiveControls.tsx", import.meta.url), "utf8")
  expect(source).toContain('<Button variant="secondary" size="sm" className="h-auto w-fit cursor-pointer rounded-sm px-2 py-0.5 quiet-section-trigger text-[0.6875rem] uppercase has-[>svg]:px-2 [&[data-state=open]>svg]:rotate-180">')
  const trigger = source.match(/<CollapsibleTrigger asChild>[\s\S]*?<Button [^>]*className="([^"]+)"/)![1]!
  // No local colour, ring, shadow, or tactile treatment: the variant alone owns the surface.
  expect(trigger).not.toMatch(/text-foreground|text-muted|bg-|ring-|shadow|tactile|accent|\[#|oklch|rgb|hsl/i)
  expect(source).toMatch(/className="size-3 transition-transform motion-reduce:transition-none"/)
})

describe("WSPF-02/03/04/07/08/09 Workbench sidebar and preview source contract", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
  const preview = readFileSync(new URL("./PreviewFrame.tsx", import.meta.url), "utf8")
  const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8")

  it("gives the category ScrollArea the full sidebar width with its 16px inset inside the scrolling content", () => {
    // WSTP-06 supersedes the card fill: the category bar follows the Sidebar semantic (base background while off).
    expect(app).toContain('<SidebarGroup className="shrink-0 bg-sidebar p-0">')
    // PUI-120: the list is the default surface TabsList at content width (no transparent/line override).
    expect(app).toMatch(/<ScrollArea orientation="horizontal" type="auto" className="quiet-scroll-area w-full min-w-0 max-w-full overflow-hidden"[^>]*>\s*<div data-testid="category-inset" className="w-max p-4">\s*(?:\{\/\*[^*]*\*\/\}\s*)?<TabsList className="w-max flex-nowrap justify-start" aria-label="Editor categories">/)
    expect(app.match(/orientation="horizontal"/g)).toHaveLength(1)
    expect(app).toContain('<ScrollArea type="auto" className="quiet-scroll-area min-h-0 flex-1" data-testid="editor-scroll"')
  })

  it("PUI-120 keeps the official default surface trigger at natural width, with no local state styling", () => {
    const tabClass = readFileSync(new URL("./workbenchTabs.ts", import.meta.url), "utf8").match(/const CATEGORY_TRIGGER_CLASS =\s*"([^"]+)"/)![1]!
    expect(tabClass.split(" ")).toEqual(["flex-none", "shrink-0", "cursor-pointer"])
    // No equal-width stretch, wrapping, or local state/colour/shadow override of the official surface trigger.
    expect(tabClass).not.toMatch(/(?:^| )(?:flex-1|w-full|flex-wrap|hover:bg-|rounded-|py-|font-|bg-|text-|shadow|data-\[state)/)
    expect(app.match(/className=\{CATEGORY_TRIGGER_CLASS\}/g)).toHaveLength(5)
    expect(styles).not.toMatch(/tabs-trigger|quiet-categories/)
  })

  it("adds only a semantic bottom border to the 64px sidebar header", () => {
    expect(app).toContain('<SidebarHeader className="h-16 shrink-0 flex-row items-center border-b px-2 py-0">')
  })

  it("NGIP-07 uses official Tabs with shared trigger styling, left alignment, and mounted state panels", () => {
    expect(preview).toContain('<Tabs value={view} onValueChange={setView}')
    expect(preview).toContain('<TabsList className="w-max flex-nowrap justify-start" aria-label="Preview views">')
    // PUI-101/102: the final four-view order is Cards / Design system / App shells / States, every panel force-mounted.
    expect(Array.from(preview.matchAll(/<TabsTrigger value="([a-z-]+)" className=\{CATEGORY_TRIGGER_CLASS\}>([^<]+)<\/TabsTrigger>/g), match => [match[1], match[2]])).toEqual([["cards", "Cards"], ["design-system", "Design system"], ["app-shells", "App shells"], ["states", "States"]])
    expect(preview.match(/className=\{CATEGORY_TRIGGER_CLASS\}/g)).toHaveLength(4)
    expect(Array.from(preview.matchAll(/<TabsContent value="([a-z-]+)" forceMount className="[^"]*data-\[state=inactive\]:hidden"/g), match => match[1])).toEqual(["cards", "design-system", "app-shells", "states"])
    expect(preview).not.toMatch(/<Select|justify-center/)
    expect(preview).toContain('className="grid gap-4 p-4"')
    expect(preview).toContain('<TabsContent value="states" forceMount className="grid gap-6 data-[state=inactive]:hidden">')
  })

  it("gives the embedded document exactly one vertical root ScrollArea and suppresses document-root overflow", () => {
    expect(preview.match(/<ScrollArea /g)).toHaveLength(1)
    expect(preview).toMatch(/return \(\s*<ScrollArea type="auto" className="quiet-scroll-area h-dvh w-full" data-testid="preview-scroll"/)
    expect(preview).not.toMatch(/orientation=/)
    expect(preview).toContain('document.documentElement.classList.add("quiet-preview-document")')
    expect(styles).toContain(".quiet-preview-document, .quiet-preview-document body { height: 100%; overflow: hidden; }")
    // The Workbench never wraps the iframe in an outer ScrollArea.
    const viewport = app.slice(app.indexOf('<div className="quiet-preview-body">'), app.indexOf("</SidebarInset>"))
    expect(viewport).not.toContain("ScrollArea")
    expect(viewport).toContain('<iframe ref={iframeRef} title="Component preview" src="/?preview=1"')
  })
})

describe("WRCP-03/04 Other-tab labels and shared shadow colour interaction", () => {
  it("shortens only the approved visible labels; ids and operations are unchanged", () => {
    const labels = (["shadowOpacity", "shadowBlur", "shadowSpread", "shadowOffsetX", "shadowOffsetY", "motion"] as const).map(id => NUMERIC_CONTROLS[id].label)
    expect(labels).toEqual(["Opacity", "Blur", "Spread", "Offset X", "Offset Y", "Duration"])
    expect([NUMERIC_CONTROLS.radius.label, NUMERIC_CONTROLS.spacing.label, NUMERIC_CONTROLS.bodyTracking.label, NUMERIC_CONTROLS.headingWeight.label]).toEqual(["Radius", "Spacing", "Tracking", "Weight"])
    expect(NUMERIC_CONTROLS.motion.build(320, defaultTheme)).toEqual({ op: "setMotionDuration", value: "320ms" })
    expect(NUMERIC_CONTROLS.shadowBlur.build(10, defaultTheme)).toMatchObject({ op: "setShadowProfile", value: { blur: "10px" } })
  })

  it("renders Shadow color with the Colors-tab picker/text field and no stored-value helper", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
    const controls = readFileSync(new URL("./LiveControls.tsx", import.meta.url), "utf8")
    expect(app).toMatch(/<LiveColorField\s+key=\{`\$\{current\.id\}-shadow-color`\}\s+id="shadow-color"\s+label="Shadow color"\s+value=\{readShadowColor\(current\)\}\s+build=\{buildShadowColorOperation\}/)
    expect(app + controls).not.toMatch(/LiveTextField|canonicalNote|Stored as/)
    // A picked opaque sRGB hex enters the canonical shadow-profile operation and core stores canonical OKLCH.
    const picked = pickedColorInput("#ff0000", readShadowColor(defaultTheme))
    expect(picked).toBe("#ff0000")
    const result = editTheme(defaultTheme, buildShadowColorOperation(picked, defaultTheme))
    if (!result.ok) throw new Error("picked shadow colour rejected")
    expect(readShadowColor(result.theme)).toBe("oklch(0.627955 0.257683 29.23388)")
    expect(pickerHex(readShadowColor(result.theme))).toBe("#ff0000")
    expect(editTheme(defaultTheme, buildShadowColorOperation("rgba(0, 0, 0, 0.5)", defaultTheme)).ok).toBe(false)
  })
})

const memoryStorage = (initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => {
  const data = { ...initial }
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) }
}

describe("WTCP-03/09 baseline compatibility and concise font states", () => {
  it("keeps historical custom values while a saved Default selection resolves to the current fixture", () => {
    const custom = structuredClone(defaultTheme)
    custom.id = "historical-custom"
    custom.radius = { base: { $type: "dimension", $value: "1.475rem" }, sm: { $type: "dimension", $value: "1.225rem" }, md: { $type: "dimension", $value: "1.35rem" }, lg: { $type: "dimension", $value: "1.475rem" }, xl: { $type: "dimension", $value: "1.725rem" } }
    custom.space.base.$value = "0.3rem"
    custom.typography.body.font.$value = ["My Exact Font", "system-ui", "sans-serif"]
    const oldDefault = { ...custom, id: "default" }
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: { [custom.id]: custom, default: oldDefault }, activeId: "default", bases: { [custom.id]: "default" } }) })
    const loaded = loadSaved(storage, BUILT_IN_IDS)
    expect(loaded.activeId).toBe("default")
    expect(loaded.themes.default).toBeUndefined()
    expect(loaded.themes[custom.id]).toEqual(custom)
    expect(builtIns.find(t => t.id === loaded.activeId)!.radius.base.$value).toBe("0.7rem")
    expect(loadSaved(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ ...loaded, activeId: custom.id }) }), BUILT_IN_IDS).themes[custom.id]).toEqual(custom)
    const quiet = validateTheme(v1QuietEditorial)
    expect(quiet.ok).toBe(true)
    if (quiet.ok) {
      expect(quiet.theme.typography.heading.font.$value).toContain("serif")
      quiet.theme.typography.heading.font = structuredClone(quiet.theme.typography.body.font)
      expect(quiet.theme).toEqual(canonical)
    }
  })

  it.each([ ["body", "Sans-serif font...", "Custom sans-serif stack"], ["heading", "Sans-serif font...", "Custom sans-serif stack"], ["mono", "Monospace font...", "Custom monospace stack"] ] as const)("uses exact copy and exact stack equality for %s", (target, placeholder, custom) => {
    const stack = readFontStack(defaultTheme, target)
    expect(fontControlCopy([...stack], stack)).toBe(placeholder)
    expect(fontControlCopy(["Personal Font", ...stack], stack)).toBe(custom)
    // The copy follows the stack's own generic family, not the stack's slot.
    expect(fontControlCopy(["Personal Font", "Georgia", "serif"], stack)).toBe("Custom serif stack")
    expect(NUMERIC_CONTROLS.spacing.label).toBe("Spacing")
    expect(NUMERIC_CONTROLS.spacing.build(0.3, defaultTheme)).toEqual({ op: "setSpacingBase", value: "0.3rem" })
  })
})

describe("editColor", () => {
  it("applies a valid edit through the mutation API without touching the input", () => {
    const result = editColor(canonical, "light", "primary", VALID)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme.colors.light.primary.$value).toBe(VALID)
    expect(result.theme.colors.dark.primary.$value).toBe(canonical.colors.dark.primary.$value)
    expect(result.theme.revision).toBe(canonical.revision + 1)
    expect(canonical.colors.light.primary.$value).not.toBe(VALID)
  })

  it.each(["red", "#ffff0", "oklch(0.4 0.1)", "red; } body { display: none", "var(--x)", "", "oklch(0.7 0.4 150)"])(
    "blocks invalid value %j with a stable rule and path, yielding no theme",
    (value) => {
      const result = editColor(canonical, "dark", "ring", value)
      expect(result).toEqual({ ok: false, issues: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }] })
    }
  )
})

describe("built-in themes (TSV2-02, TSV2-03, TSV2-04)", () => {
  it("offers Default first, then Quiet Editorial, both canonical v3", () => {
    expect(BUILT_IN_IDS).toEqual([DEFAULT_THEME_ID, "quiet-editorial"])
    for (const theme of builtIns) expect(validateTheme(theme)).toEqual({ ok: true, theme })
    expect(defaultTheme.name).toBe("Default")
    expect(canonical.schemaVersion).toBe("3.0")
    expect(defaultTheme.schemaVersion).toBe("3.0")
  })

  it("accepts all four colour families through the manual colour path and stores canonical OKLCH", () => {
    for (const value of ["#336699", "rgb(51 102 153)", "hsl(210 50% 40%)", "oklch(0.5 0.1 250)"]) {
      const result = editColor(defaultTheme, "light", "primary", value)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.theme.colors.light.primary.$value).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/)
    }
  })
})

describe("manual controls (TSV2-10, TSV2-11)", () => {
  const cases: { id: NumericControlId; value: number; diff: string[]; css: string }[] = [
    { id: "headingWeight", value: 700, diff: ["typography.heading.weight"], css: "--font-weight-heading: 700;" },
    { id: "headingTracking", value: -0.02, diff: ["typography.heading.tracking"], css: "--tracking-heading: -0.02em;" },
    { id: "bodyWeight", value: 500, diff: ["typography.body.weight"], css: "--font-weight-body: 500;" },
    { id: "bodyTracking", value: 0.02, diff: ["typography.body.tracking"], css: "--tracking-body: 0.02em;" },
    { id: "radius", value: 0.5, diff: ["radius.base", "radius.lg", "radius.md", "radius.sm", "radius.xl"], css: "--radius: 0.5rem;" },
    { id: "spacing", value: 0.3, diff: ["space.base"], css: "--space-base: 0.3rem;" },
    { id: "density", value: 1.25, diff: ["space.density"], css: "--density: 1.25;" },
    { id: "motion", value: 320, diff: ["motion.durationBase"], css: "--motion-duration-base: 320ms;" },
    { id: "shadowOpacity", value: 0.2, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-sm: 0px 1px 3px 0px oklch(0 0 0 / 0.2)" },
    { id: "shadowBlur", value: 12, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-2xl: 0px 1px 12px 0px" },
    { id: "shadowSpread", value: 2, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-md: 0px 1px 3px 2px oklch(0 0 0 / 0.1), 0px 2px 4px 1px" },
    { id: "shadowOffsetX", value: -4, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-xs: -4px 1px 3px 0px" },
    { id: "shadowOffsetY", value: 6, diff: ["shadow.2xl", "shadow.2xs", "shadow.default", "shadow.lg", "shadow.md", "shadow.sm", "shadow.xl", "shadow.xs"], css: "--shadow-layers-2xs: 0px 6px 3px 0px" },
    // PUI-113: Strength alone is a design value but, with both targets off, still renders flat (no effects block).
    { id: "uiEffectsStrength", value: 80, diff: ["uiEffects.strength"], css: ":root {" },
  ]

  it("covers every numeric control", () => {
    expect(Object.keys(NUMERIC_CONTROLS).sort()).toEqual(cases.map((c) => c.id).sort())
  })

  it.each(cases)("$id: reads the Default value, applies one typed operation, and renders it", ({ id, value, diff, css }) => {
    const control = NUMERIC_CONTROLS[id]
    expect(Number.isFinite(control.read(defaultTheme))).toBe(true)
    expect(control.min).toBeLessThan(control.max)
    const result = editTheme(defaultTheme, control.build(value, defaultTheme))
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(result.theme.revision).toBe(defaultTheme.revision + 1)
    expect(control.read(result.theme)).toBeCloseTo(value, 6)
    expect(diffThemeTokens(defaultTheme, result.theme).map((entry) => entry.path)).toEqual(diff)
    expect(previewVariablesCss(result.theme)).toContain(css)
  })

  it("reads the Default slider values exactly", () => {
    const read = (id: NumericControlId) => NUMERIC_CONTROLS[id].read(defaultTheme)
    expect([read("headingWeight"), read("headingTracking"), read("bodyWeight"), read("bodyTracking")]).toEqual([600, 0, 400, 0])
    expect([read("radius"), read("spacing"), read("density"), read("motion")]).toEqual([0.7, 0.25, 1, 200])
    expect([read("shadowOpacity"), read("shadowBlur"), read("shadowSpread"), read("shadowOffsetX"), read("shadowOffsetY")]).toEqual([0.1, 3, 0, 0, 1])
  })

  it("keeps invalid numeric drafts local: nothing out of range or non-numeric parses", () => {
    const radius = NUMERIC_CONTROLS.radius
    expect(parseNumericDraft(radius, "0.5")).toBe(0.5)
    expect(parseNumericDraft(radius, " .5 ")).toBe(0.5)
    for (const draft of ["", "-", ".", "abc", "1rem", "3", "-0.1", "1e1", "NaN", "Infinity", "0x1"]) expect(parseNumericDraft(radius, draft), draft).toBeNull()
  })

  it("replaces whole font stacks for heading, body, and mono and rejects unsafe names", () => {
    for (const target of ["heading", "body", "mono"] as const) {
      const result = editTheme(defaultTheme, buildFontOperation(target, ["Inter Variable", "Inter", "system-ui"]))
      if (!result.ok) throw new Error("font edit failed")
      expect(readFontStack(result.theme, target)).toEqual(["Inter Variable", "Inter", "system-ui"])
      expect(diffThemeTokens(defaultTheme, result.theme).map((d) => d.path)).toEqual([target === "mono" ? "typography.mono" : `typography.${target}.font`])
    }
    expect(TYPE_ROLE_GROUPS.map((group) => [group.role, group.title, group.weight, group.tracking])).toEqual([
      ["heading", "Heading", "headingWeight", "headingTracking"],
      ["body", "Body", "bodyWeight", "bodyTracking"],
    ])
    for (const stack of [[], [""], ['x"; } a{'], ["Inter; color: red"]]) {
      expect(editTheme(defaultTheme, buildFontOperation("body", stack))).toEqual({ ok: false, issues: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }] })
    }
  })

  it("edits the shadow colour through the profile and rejects translucent or invalid colours", () => {
    expect(readShadowColor(defaultTheme)).toBe("oklch(0 0 0)")
    const result = editTheme(defaultTheme, buildShadowColorOperation("#1e3a8a", defaultTheme))
    if (!result.ok) throw new Error("shadow colour failed")
    expect(readShadowColor(result.theme)).toMatch(/^oklch\(/)
    expect(NUMERIC_CONTROLS.shadowOpacity.read(result.theme)).toBe(0.1)
    for (const raw of ["rgba(0,0,0,0.5)", "blue", ""]) {
      expect(editTheme(defaultTheme, buildShadowColorOperation(raw, defaultTheme))).toEqual({
        ok: false,
        issues: [{ ruleId: "mutation.invalid-value", path: "operations[0].value.color" }],
      })
    }
  })

  it("round-trips a manually edited theme through Save As, reload, and export", () => {
    let theme = defaultTheme
    for (const [id, value] of [["bodyTracking", 0.01], ["headingWeight", 800], ["radius", 0.75], ["shadowBlur", 8]] as const) {
      const edited = editTheme(theme, NUMERIC_CONTROLS[id].build(value, theme))
      if (!edited.ok) throw new Error("edit failed")
      theme = edited.theme
    }
    const copy = createCustomTheme(theme, "My Theme", BUILT_IN_IDS)
    if (!copy.ok) throw new Error("save as failed")
    const storage = memoryStorage()
    expect(saveTheme(storage, emptySaved(), copy.theme, BUILT_IN_IDS, DEFAULT_THEME_ID).ok).toBe(true)
    const reloaded = loadSaved(storage, BUILT_IN_IDS)
    expect(reloaded.themes["my-theme"]).toEqual(copy.theme)
    expect(reloaded.bases).toEqual({ "my-theme": DEFAULT_THEME_ID })
    expect(validateTheme(JSON.parse(exportThemeJson(copy.theme).json))).toEqual({ ok: true, theme: copy.theme })
  })
})

describe("Save As (WTEP-08)", () => {
  it("creates a schema-valid custom copy with a derived id, the given name, and revision 1, never touching the source", () => {
    const source = editColorOrThrow()
    const before = structuredClone(source)
    const result = createCustomTheme(source, "  My Warm   Theme 2 ", [canonical.id])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme).toMatchObject({ id: "my-warm-theme-2", name: "My Warm   Theme 2", revision: 1 })
    expect(result.theme.colors.light.primary.$value).toBe(VALID)
    expect(validateTheme(result.theme)).toEqual({ ok: true, theme: result.theme })
    expect(source).toEqual(before)
    expect(diffThemeTokens(source, result.theme)).toEqual([])
  })

  it("derives deterministic ids that never collide with built-in or saved ids", () => {
    expect(customThemeId("Default", BUILT_IN_IDS)).toBe("default-2")
    expect(customThemeId("Default", [...BUILT_IN_IDS, "default-2"])).toBe("default-3")
    expect(customThemeId("Quiet Editorial", BUILT_IN_IDS)).toBe("quiet-editorial-2")
    expect(customThemeId("Ocean", BUILT_IN_IDS)).toBe("ocean")
    expect(customThemeId("Ocean", BUILT_IN_IDS)).toBe(customThemeId("Ocean", BUILT_IN_IDS))
  })

  it("rejects names the theme schema rejects with one stable rule", () => {
    for (const name of ["", "   ", "Bad-Name!", "../etc", "a".repeat(81), "Tab\tName"]) {
      expect(createCustomTheme(canonical, name, [])).toEqual({ ok: false, issues: [{ ruleId: "workbench.save-as.invalid-name", path: "name" }] })
    }
  })
})

describe("grouped colour rows and native picker (WTEP-05, WTEP-06)", () => {
  it("lists every canonical colour token exactly once, in the approved groups", () => {
    expect(COLOR_GROUPS.map((group) => group.title)).toEqual(["Primary", "Secondary", "Accent", "Base", "Card", "Popover", "Muted", "Destructive", "Border, Input & Ring", "Charts", "Sidebar"])
    expect(COLOR_GROUPS.find((group) => group.id === "base")?.tokens).toEqual(["background", "foreground"])
    const tokens = COLOR_GROUPS.flatMap((group) => group.tokens)
    expect([...tokens].sort()).toEqual([...COLOR_TOKENS].sort())
    expect(new Set(tokens).size).toBe(COLOR_TOKENS.length)
  })

  it("shows the nearest sRGB hex for a canonical value, and picked hex round-trips through core to canonical oklch", () => {
    expect(pickerHex("oklch(0.499314 0.098664 250.433057)")).toBe("#336699")
    expect(pickerHex("oklch(1 0 0)")).toBe("#ffffff")
    expect(pickerHex("oklch(0 0 0)")).toBe("#000000")
    expect(pickerHex("not a colour")).toBe("#000000")
    for (const theme of builtIns) {
      for (const mode of ["light", "dark"] as const) {
        for (const token of COLOR_TOKENS) {
          const hex = pickerHex(theme.colors[mode][token].$value)
          expect(hex).toMatch(/^#[0-9a-f]{6}$/)
          const input = pickedColorInput(hex, theme.colors[mode][token].$value)
          const normalized = normalizeColor(input)
          expect(normalized.ok).toBe(true)
          const edited = editColor(theme, mode, token, input)
          expect(edited.ok).toBe(true)
          if (edited.ok && normalized.ok) expect(edited.theme.colors[mode][token].$value).toBe(normalized.value)
          if (edited.ok) expect(edited.theme.colors[mode][token].$value).toMatch(/^oklch\(/)
        }
      }
    }
  })

  it("keeps a token's alpha when the opaque picker changes its colour", () => {
    expect(pickedColorInput("#336699", "oklch(0.5 0.1 250)")).toBe("#336699")
    expect(pickedColorInput("#336699", "oklch(1 0 0 / 0.1)")).toBe("rgb(51 102 153 / 0.1)")
    const result = editColor(canonical, "dark", "border", pickedColorInput("#336699", "oklch(1 0 0 / 0.1)"))
    expect(result.ok && result.theme.colors.dark.border.$value).toMatch(/ \/ 0\.1\)$/)
  })
})

function editColorOrThrow() {
  const result = editColor(canonical, "light", "primary", VALID)
  if (!result.ok) throw new Error("edit failed")
  return result.theme
}

describe("persistence (TSV2-04, TSV2-12)", () => {
  it("round-trips saved themes, the selection, and the internal base through storage", () => {
    const storage = memoryStorage()
    const fork = createCustomTheme(editColorOrThrow(), "My Fork", BUILT_IN_IDS)
    if (!fork.ok) throw new Error("save as failed")
    const saved = saveTheme(storage, emptySaved(), fork.theme, BUILT_IN_IDS, canonical.id)
    expect(saved.ok).toBe(true)
    // A fresh read from the same storage models a browser refresh.
    expect(loadSaved(storage, BUILT_IN_IDS)).toEqual({ themes: { "my-fork": fork.theme }, activeId: "my-fork", bases: { "my-fork": canonical.id } })
  })

  it("fresh storage selects nothing, so the Workbench falls back to Default", () => {
    expect(loadSaved(memoryStorage(), BUILT_IN_IDS)).toEqual(emptySaved())
  })

  it("persists a built-in selection without saving any theme data", () => {
    const storage = memoryStorage()
    const next = saveSelection(storage, emptySaved(), "quiet-editorial")
    expect(next).toEqual({ themes: {}, activeId: "quiet-editorial", bases: {} })
    expect(loadSaved(storage, BUILT_IN_IDS).activeId).toBe("quiet-editorial")
    expect(JSON.parse(storage.data[STORAGE_KEY]!).themes).toEqual({})
  })

  it("drops a removed or unknown selection so the Workbench falls back safely", () => {
    for (const activeId of ["removed-theme", 7, null, "__proto__"]) {
      const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: {}, activeId, bases: {} }) })
      expect(loadSaved(storage, BUILT_IN_IDS).activeId).toBeNull()
    }
  })

  it("migrates a stored v1 theme to v3 on read (TSV2-12, STHG-04)", () => {
    const v1 = { ...structuredClone(v1QuietEditorial), id: "legacy-fork", name: "Legacy Fork" }
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: { "legacy-fork": v1 }, activeId: "legacy-fork" }) })
    const loaded = loadSaved(storage, BUILT_IN_IDS)
    expect(loaded.activeId).toBe("legacy-fork")
    expect(loaded.themes["legacy-fork"]?.schemaVersion).toBe("3.0")
    const migrated = validateTheme(v1)
    expect(migrated.ok && loaded.themes["legacy-fork"]?.typography).toEqual(migrated.ok && migrated.theme.typography)
    expect(loaded.themes["legacy-fork"]?.typography.heading.font.$value).toContain("serif")
    expect(loaded.themes["legacy-fork"]?.colors.light.primary.$value).toBe(canonical.colors.light.primary.$value)
    expect(loaded.bases).toEqual({})
  })

  it("never lets a saved theme shadow a built-in id", () => {
    const shadowing = { ...structuredClone(defaultTheme), name: "Impostor" }
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: { default: shadowing }, activeId: "default" }) })
    const loaded = loadSaved(storage, BUILT_IN_IDS)
    expect(loaded.themes).toEqual({})
    expect(loaded.activeId).toBe("default")
  })

  it("reserves every built-in id and does not write on rejection", () => {
    for (const theme of builtIns) {
      const storage = memoryStorage()
      expect(saveTheme(storage, emptySaved(), theme, BUILT_IN_IDS, theme.id)).toEqual({
        ok: false,
        issues: [{ ruleId: "workbench.save.reserved-id", path: "id" }],
      })
      expect(storage.data).toEqual({})
    }
  })

  it("reports storage failure with a stable rule", () => {
    const storage: StorageLike = { getItem: () => null, setItem: () => { throw new Error("quota") } }
    const fork = createCustomTheme(canonical, "My Fork", [])
    if (!fork.ok) throw new Error("save as failed")
    expect(saveTheme(storage, emptySaved(), fork.theme, [], canonical.id)).toEqual({
      ok: false,
      issues: [{ ruleId: "workbench.save.storage-unavailable", path: "" }],
    })
    expect(saveSelection(storage, emptySaved(), "default")).toEqual(emptySaved())
  })

  it("drops corrupt, invalid, or id-mismatched entries and bad bases instead of trusting them", () => {
    const fork = createCustomTheme(canonical, "Good", [])
    if (!fork.ok) throw new Error("save as failed")
    const bad = structuredClone(fork.theme)
    bad.colors.light.primary.$value = "red"
    const stored = { themes: { good: fork.theme, bad, mismatch: fork.theme }, activeId: "bad", bases: { good: "nope", bad: "default" } }
    expect(loadSaved(memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) }), BUILT_IN_IDS)).toEqual({ themes: { good: fork.theme }, activeId: null, bases: {} })
    expect(loadSaved(memoryStorage({ [STORAGE_KEY]: "{not json" }), BUILT_IN_IDS)).toEqual(emptySaved())
    expect(loadSaved(memoryStorage(), BUILT_IN_IDS)).toEqual(emptySaved())
  })
})

describe("export and preview css", () => {
  it("exports validated, deterministic, portable JSON that re-validates to the same theme", () => {
    const theme = editColorOrThrow()
    const out = exportThemeJson(theme)
    expect(out.filename).toBe("quiet-editorial.theme.json")
    expect(out.json.endsWith("\n")).toBe(true)
    expect(exportThemeJson(theme)).toEqual(out)
    const round = validateTheme(JSON.parse(out.json))
    expect(round).toEqual({ ok: true, theme })
  })

  it("derives preview variables from core's renderer, keeping :root/.dark and dropping @theme", () => {
    const css = previewVariablesCss(editColorOrThrow())
    expect(css).toContain(`--primary: ${VALID};`)
    expect(css).toContain(".dark {")
    expect(css).not.toContain("@theme")
    expect(renderShadcnTailwindCss(canonical)).toContain("@theme inline")
  })
})

const NOW = "2026-09-21T11:00:00Z"

describe("mutation proposal preview (non-committing)", () => {
  const envelope = (overrides: Record<string, unknown> = {}) => ({
    schemaVersion: "1.0",
    proposalId: "p-1",
    base: { themeId: canonical.id, revision: canonical.revision },
    provenance: { source: "agent", sourceId: "run-1", createdAt: "2026-09-21T10:00:00Z" },
    operations: [
      { op: "setMotionDuration", value: "320ms" },
      { op: "setColor", mode: "dark", token: "primary", value: "oklch(0.8 0.1 150)" },
      { op: "setRadius", value: "1rem" },
    ],
    ...overrides,
  })

  it("diffs active to candidate as sorted {path,before,after}", () => {
    const result = stageProposal(createProposalSession(), canonical, envelope(), NOW)
    if (!result.ok) throw new Error("stage failed")
    const diff = result.staged.evaluation.diff
    expect(diff).toEqual([
      { path: "colors.dark.primary", before: canonical.colors.dark.primary.$value, after: "oklch(0.8 0.1 150)" },
      { path: "motion.durationBase", before: canonical.motion.durationBase.$value, after: "320ms" },
      { path: "radius.md", before: canonical.radius.md.$value, after: "1rem" },
    ])
    expect(diff.map((entry) => entry.path)).toEqual([...diff.map((entry) => entry.path)].sort())
    for (const entry of diff) expect(Object.keys(entry).sort()).toEqual(["after", "before", "path"])
  })

  it("previews candidate CSS through the existing preview path without changing the active theme", () => {
    const before = JSON.stringify(canonical)
    const result = stageProposal(createProposalSession(), canonical, envelope(), NOW)
    if (!result.ok) throw new Error("stage failed")
    const candidateCss = previewVariablesCss(result.staged.candidate)
    expect(candidateCss).toContain("--motion-duration-base: 320ms;")
    expect(previewVariablesCss(canonical)).not.toContain("--motion-duration-base: 320ms;")
    expect(JSON.stringify(canonical)).toBe(before)
  })

  it("stage, discard, and stale leave active state and persistence byte-identical; only Apply then Save persists", () => {
    const fork = createCustomTheme(canonical, "My Fork", [])
    if (!fork.ok) throw new Error("save as failed")
    const storage = memoryStorage()
    const saved = saveTheme(storage, emptySaved(), fork.theme, BUILT_IN_IDS, canonical.id)
    if (!saved.ok) throw new Error("save failed")
    const active = fork.theme
    const request = (id: string) => envelope({ proposalId: id, base: { themeId: active.id, revision: active.revision } })
    const snapshot = () => ({ active: JSON.stringify(active), storage: JSON.stringify(storage.data) })
    const before = snapshot()

    // Staged then discarded.
    let session = stageProposal(createProposalSession(), active, request("a"), NOW).session
    expect(snapshot()).toEqual(before)
    session = discardProposal(session, active, "a", NOW).session
    expect(snapshot()).toEqual(before)

    // Staged, then the active revision moves: Apply is stale and applies nothing.
    session = stageProposal(session, active, request("b"), NOW).session
    const moved = editColor(active, "light", "primary", VALID)
    if (!moved.ok) throw new Error("edit failed")
    const stale = applyProposal(session, moved.theme, "b", NOW)
    expect(stale.ok).toBe(false)
    expect(stale.session.records.find((record) => record.proposalId === "b")?.status).toBe("stale")
    expect(stale.ok ? [] : stale.errors).toEqual([{ ruleId: "mutation.stale-revision", path: "base.revision" }])
    expect(moved.theme.revision).toBe(active.revision + 1)
    expect(moved.theme.radius.md.$value).toBe(active.radius.md.$value)
    expect(snapshot()).toEqual(before)

    // Applied: one revision step in memory, storage still untouched until Save.
    session = stageProposal(stale.session, active, request("c"), NOW).session
    const applied = applyProposal(session, active, "c", NOW)
    if (!applied.ok) throw new Error("apply failed")
    expect(applied.theme!.revision).toBe(active.revision + 1)
    expect(snapshot()).toEqual(before)
    expect(saveTheme(storage, saved.saved, applied.theme!, BUILT_IN_IDS, canonical.id).ok).toBe(true)
    expect(JSON.stringify(storage.data)).not.toBe(before.storage)
  })

})

describe("custom theme deletion (WSSP-06)", () => {
  const twoCustom = () => {
    const storage = memoryStorage()
    const studio = createCustomTheme(defaultTheme, "Studio", BUILT_IN_IDS)
    const archive = createCustomTheme(canonical, "Archive", BUILT_IN_IDS)
    if (!studio.ok || !archive.ok) throw new Error("expected valid copies")
    const first = saveTheme(storage, emptySaved(), archive.theme, BUILT_IN_IDS, canonical.id)
    if (!first.ok) throw new Error("expected save")
    const second = saveTheme(storage, first.saved, studio.theme, BUILT_IN_IDS, defaultTheme.id)
    if (!second.ok) throw new Error("expected save")
    return { storage, saved: second.saved, studio: studio.theme, archive: archive.theme }
  }

  it("removes the saved theme and its base record, persists Default as active, and keeps other custom themes", () => {
    const { storage, saved, studio, archive } = twoCustom()
    expect(saved.activeId).toBe(studio.id)
    const result = deleteTheme(storage, saved, studio.id, DEFAULT_THEME_ID)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.saved).toEqual({ themes: { [archive.id]: archive }, activeId: DEFAULT_THEME_ID, bases: { [archive.id]: canonical.id } })
    // The persisted format is unchanged and survives a reload: Default is restored, the deleted theme is gone.
    const reloaded = loadSaved(storage, BUILT_IN_IDS)
    expect(reloaded).toEqual(result.saved)
    expect(Object.keys(JSON.parse(storage.data[STORAGE_KEY]!)).sort()).toEqual(["activeId", "bases", "themes"])
  })

  it("never deletes a built-in or an unknown id, and writes nothing when rejected", () => {
    const { storage, saved } = twoCustom()
    const before = storage.data[STORAGE_KEY]
    for (const id of [...BUILT_IN_IDS, "missing"]) {
      expect(deleteTheme(storage, saved, id, DEFAULT_THEME_ID)).toEqual({ ok: false, issues: [{ ruleId: "workbench.delete.not-custom", path: "id" }] })
    }
    expect(storage.data[STORAGE_KEY]).toBe(before)
  })

  it("reports unavailable storage without changing the in-memory record", () => {
    const { saved, studio } = twoCustom()
    const broken: StorageLike = { getItem: () => null, setItem: () => { throw new Error("quota") } }
    expect(deleteTheme(broken, saved, studio.id, DEFAULT_THEME_ID)).toEqual({ ok: false, issues: [{ ruleId: "workbench.save.storage-unavailable", path: "" }] })
    expect(Object.hasOwn(saved.themes, studio.id)).toBe(true)
  })

  it("exposes the delete action only for the active custom theme, confirmed through ResponsiveDialog", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
    expect(app).toContain("const activeCustom = !builtInCopy && Object.hasOwn(saved.themes, current.id)")
    expect(app).toMatch(/\{activeCustom && \(\s*<ResponsiveDialog open=\{deleteOpen\}/)
    expect(app).toMatch(/<ResponsiveDialogTrigger asChild>\s*<SidebarMenuAction aria-label=\{`Delete \$\{current.name\}`\}/)
    expect(app).toMatch(/if \(locked \|\| builtInCopy \|\| !Object.hasOwn\(saved.themes, current.id\)\) return/)
    // The action is a sibling of the Select, never inside its trigger or rows.
    const trigger = app.slice(app.indexOf("<SelectTrigger"), app.indexOf("</Select>"))
    expect(trigger).not.toContain("SidebarMenuAction")
  })
})

describe("density boundary (WSSP-10)", () => {
  it("removes only the manual Density control; schema, renderer, mutation, persistence, and proposals keep density", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
    expect(app).not.toMatch(/numeric\("density"\)|NUMERIC_CONTROLS\.density|"Density"/)
    // Programmatic density is intact.
    const edited = editTheme(canonical, { op: "setDensity", value: 1.25 })
    expect(edited.ok).toBe(true)
    if (!edited.ok) return
    expect(edited.theme.space.density.$value).toBe(1.25)
    expect(renderShadcnTailwindCss(edited.theme)).toContain("--density: 1.25;")
    expect(editTheme(canonical, { op: "setDensity", value: 99 }).ok).toBe(false)
    const storage = memoryStorage()
    const copy = createCustomTheme(edited.theme, "Dense", BUILT_IN_IDS)
    if (!copy.ok) throw new Error("expected copy")
    const saved = saveTheme(storage, emptySaved(), copy.theme, BUILT_IN_IDS, canonical.id)
    expect(saved.ok).toBe(true)
    expect(loadSaved(storage, BUILT_IN_IDS).themes[copy.theme.id]!.space.density.$value).toBe(1.25)
    const v1 = validateTheme(v1QuietEditorial)
    expect(v1.ok && v1.theme.space.density.$value).toBeTypeOf("number")
    const proposal = { schemaVersion: "1.0", proposalId: "density-1", base: { themeId: canonical.id, revision: canonical.revision }, provenance: { source: "agent", sourceId: "density", createdAt: "2026-09-25T00:00:00Z" }, operations: [{ op: "setDensity", value: 1.5 }] }
    const staged = stageProposal(createProposalSession(), canonical, proposal, "2026-09-25T00:00:01Z")
    expect(staged.ok).toBe(true)
    if (staged.ok) expect(staged.staged.candidate.space.density.$value).toBe(1.5)
    expect(NUMERIC_CONTROLS.density.read(canonical)).toBe(canonical.space.density.$value)
  })
})

describe("WSTP-06/07/09 Sidebar tokens in the Workbench", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
  const controls = readFileSync(new URL("./LiveControls.tsx", import.meta.url), "utf8")

  it("exposes one Sidebar colour group with the eight exact visible labels", () => {
    const group = COLOR_GROUPS.filter((entry) => entry.id === "sidebar")
    expect(group).toHaveLength(1)
    expect(group[0]!.tokens).toEqual([...SIDEBAR_COLOR_TOKENS])
    expect(group[0]!.tokens.map(colorTokenLabel)).toEqual(["Background", "Foreground", "Primary", "Primary foreground", "Accent", "Accent foreground", "Border", "Ring"])
    // Base labels are unchanged; screen readers get the Sidebar context without changing the visible label.
    expect(colorTokenLabel("background")).toBe("Background")
    expect(app).toContain('labelPrefix={isSidebarColorToken(token) ? "Sidebar" : undefined}')
  })

  it("uses the official Switch with exact label and helper copy, and never gates the colour fields on the mode", () => {
    expect(controls).toContain('import { Switch } from "@personal-ui/ui/components/switch"')
    // PUI-93: one step smaller (text-xs), muted, a small gap below the trigger. PUI-98: no helper or status note in
    // either state and no description reference on the Switch.
    expect(controls).toContain('<Label htmlFor="sidebar-tokens-switch" className="text-xs text-muted-foreground">Use sidebar tokens</Label>')
    expect(controls).toContain('data-testid="control-sidebar-tokens" className="mt-2 gap-1.5"')
    expect(controls).not.toContain("Sidebar tokens are active.")
    expect(controls).not.toContain("Sidebar tokens are currently not applied.")
    expect(controls).not.toContain("sidebar-tokens-status")
    const sidebarSwitch = controls.slice(controls.indexOf("export function SidebarTokensSwitch"))
    expect(sidebarSwitch).not.toMatch(/aria-describedby|FieldDescription/)
    expect(sidebarSwitch).toContain('{error !== null && <FieldError data-testid="sidebar-tokens-error">{error}</FieldError>}')
    expect(controls).toContain('apply(() => ({ op: "setSidebarTokensEnabled", value: checked }))')
    // The fields render for every token in both states and are disabled only by the shared staging lock.
    expect(app).toContain('{group.id === "sidebar" && <SidebarTokensSwitch enabled={current.sidebar.useDedicatedTokens.$value} disabled={locked} apply={applyManual} />}')
    expect(app).not.toMatch(/useDedicatedTokens\.\$value\s*[?&]/)
    expect(app).not.toMatch(/dedicatedValuesInitialized/)
    expect(controls).not.toMatch(/dedicatedValuesInitialized/)
  })

  it("edits through the core mutation path: off keeps aliases live, first activation has no jump, on applies edits", () => {
    const editedBase = editColor(defaultTheme, "light", "background", "oklch(0.97 0.01 90)")
    if (!editedBase.ok) throw new Error("expected edit")
    const offCss = previewVariablesCss(editedBase.theme)
    for (const name of SIDEBAR_COLOR_TOKENS) expect(offCss).toContain(`  --${name}: var(--${SIDEBAR_TOKEN_ALIASES[name]});`)
    // A dedicated edit while off is stored but not applied.
    const dedicated = editColor(editedBase.theme, "light", "sidebar", "oklch(0.9 0.02 250)")
    if (!dedicated.ok) throw new Error("expected edit")
    expect(dedicated.theme.colors.light.sidebar.$value).toBe("oklch(0.9 0.02 250)")
    expect(previewVariablesCss(dedicated.theme)).toContain("  --sidebar: var(--background);")
    const on = editTheme(dedicated.theme, { op: "setSidebarTokensEnabled", value: true })
    if (!on.ok) throw new Error("expected edit")
    expect(previewVariablesCss(on.theme)).toContain("  --sidebar: oklch(0.9 0.02 250);")
    // First activation of a never-edited set snapshots the resolved aliases: identical resolved values.
    const firstOn = editTheme(editedBase.theme, { op: "setSidebarTokensEnabled", value: true })
    if (!firstOn.ok) throw new Error("expected edit")
    expect(previewVariablesCss(firstOn.theme)).toContain("  --sidebar: oklch(0.97 0.01 90);")
    expect(diffThemeTokens(editedBase.theme, firstOn.theme)).toEqual([{ path: "sidebar.useDedicatedTokens", before: false, after: true }])
  })

  it("saves, reloads, exports, and re-imports v3 Sidebar state under the unchanged storage key", () => {
    const on = editTheme(defaultTheme, { op: "setSidebarTokensEnabled", value: true })
    if (!on.ok) throw new Error("expected edit")
    const copy = createCustomTheme(on.theme, "Sidebar Test", BUILT_IN_IDS)
    if (!copy.ok) throw new Error("expected copy")
    const recolored = editColor(copy.theme, "dark", "sidebar-accent", "oklch(0.35 0.03 250)")
    if (!recolored.ok) throw new Error("expected edit")
    const storage = memoryStorage()
    const saved = saveTheme(storage, emptySaved(), recolored.theme, BUILT_IN_IDS, DEFAULT_THEME_ID)
    if (!saved.ok) throw new Error("expected save")
    expect(Object.keys(storage.data)).toEqual([STORAGE_KEY])
    expect(STORAGE_KEY).toBe("personal-ui-workbench/v1")
    const reloaded = loadSaved(storage, BUILT_IN_IDS)
    expect(reloaded.themes["sidebar-test"]).toEqual(recolored.theme)
    expect(reloaded.activeId).toBe("sidebar-test")
    const exported = JSON.parse(exportThemeJson(recolored.theme).json)
    expect(exported.schemaVersion).toBe("3.0")
    expect(exported.sidebar).toEqual({ useDedicatedTokens: { $type: "boolean", $value: true }, dedicatedValuesInitialized: true })
    expect(validateTheme(exported)).toEqual({ ok: true, theme: recolored.theme })
  })

  it("migrates a saved v2.0 custom theme on read without losing values, selection, or base record", () => {
    const v20 = structuredClone(defaultTheme) as Record<string, any>
    Object.assign(v20, { id: "legacy-v20", name: "Legacy V20", revision: 4, schemaVersion: "2.0", $schema: "https://personal-ui.local/schema/theme-2.json" })
    v20.typography = { sans: v20.typography.body.font, serif: v20.typography.heading.font, mono: v20.typography.mono, tracking: v20.typography.body.tracking }
    delete v20.sidebar
    for (const mode of ["light", "dark"]) for (const name of SIDEBAR_COLOR_TOKENS) delete v20.colors[mode][name]
    v20.colors.light.primary.$value = VALID
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: { "legacy-v20": v20 }, activeId: "legacy-v20", bases: { "legacy-v20": "quiet-editorial" } }) })
    const loaded = loadSaved(storage, BUILT_IN_IDS)
    const theme = loaded.themes["legacy-v20"]!
    expect(loaded.activeId).toBe("legacy-v20")
    expect(loaded.bases).toEqual({ "legacy-v20": "quiet-editorial" })
    expect(theme).toMatchObject({ schemaVersion: "3.0", revision: 4, name: "Legacy V20" })
    expect(theme.typography).toEqual(defaultTheme.typography)
    expect(theme.colors.light.primary.$value).toBe(VALID)
    expect(theme.colors.light["sidebar-primary"].$value).toBe(VALID)
    expect(theme.sidebar.useDedicatedTokens.$value).toBe(false)
    // Rendering is unchanged by migration: the Sidebar follows the same base semantics as before.
    expect(previewVariablesCss(theme)).toContain("  --sidebar: var(--background);")
  })

  it("STHG-04 migrates a saved v2.1 custom theme with the exact semantic mapping, keeping selection, base, and Sidebar state", () => {
    const initialized = editTheme(defaultTheme, { op: "setSidebarTokensEnabled", value: true })
    if (!initialized.ok) throw new Error("expected edit")
    const v21 = structuredClone(initialized.theme) as Record<string, any>
    Object.assign(v21, { id: "legacy-v21", name: "Legacy V21", revision: 9, schemaVersion: "2.1", $schema: "https://personal-ui.local/schema/theme-2.json" })
    v21.typography = {
      sans: { $type: "fontFamily", $value: ["Manrope Variable", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"] },
      serif: { $type: "fontFamily", $value: ["Lora Variable", "Lora", "ui-serif", "Georgia", "serif"] },
      mono: { $type: "fontFamily", $value: ["Roboto Mono Variable", "Roboto Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"] },
      tracking: { $type: "dimension", $value: "0.015em" },
    }
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ themes: { "legacy-v21": v21 }, activeId: "legacy-v21", bases: { "legacy-v21": "default" } }) })
    const loaded = loadSaved(storage, BUILT_IN_IDS)
    const theme = loaded.themes["legacy-v21"]!
    expect([loaded.activeId, loaded.bases]).toEqual(["legacy-v21", { "legacy-v21": "default" }])
    expect(theme).toMatchObject({ schemaVersion: "3.0", revision: 9, name: "Legacy V21" })
    expect(theme.typography.heading).toEqual({ font: v21.typography.serif, weight: { $type: "fontWeight", $value: 600 }, tracking: { $type: "dimension", $value: "0.015em" } })
    expect(theme.typography.body).toEqual({ font: v21.typography.sans, weight: { $type: "fontWeight", $value: 400 }, tracking: { $type: "dimension", $value: "0.015em" } })
    expect(theme.typography.mono).toEqual(v21.typography.mono)
    expect(theme.sidebar).toEqual(initialized.theme.sidebar)
    expect(theme.colors).toEqual(initialized.theme.colors)
  })

  it("never lets a staged Sidebar proposal reach the active theme before Apply", () => {
    const proposal = { schemaVersion: "1.0", proposalId: "sidebar-1", base: { themeId: defaultTheme.id, revision: defaultTheme.revision }, provenance: { source: "fixture", sourceId: "wstp", createdAt: "2026-09-26T00:00:00Z" }, operations: [{ op: "setSidebarTokensEnabled", value: true }] }
    const staged = stageProposal(createProposalSession(), defaultTheme, proposal, "2026-09-26T00:00:00Z")
    if (!staged.ok) throw new Error("expected staged")
    expect(previewVariablesCss(defaultTheme)).toContain("  --sidebar: var(--background);")
    expect(previewVariablesCss(staged.staged.candidate)).not.toContain("  --sidebar: var(--background);")
    // Chrome renders only the active theme; the candidate only reaches the preview state.
    expect(app).toContain("const activeCss = React.useMemo(() => previewVariablesCss(current), [current])")
  })
})

describe("WSTP-11/12/13 Sidebar geometry, typography rows, selector, tabs, and pointer affordances", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
  const controls = readFileSync(new URL("./LiveControls.tsx", import.meta.url), "utf8")
  const button = readFileSync(new URL("../../../packages/ui/src/components/button.tsx", import.meta.url), "utf8")

  it("sets only the official desktop --sidebar-width to 28rem", () => {
    expect(app).toContain('style={{ "--sidebar-width": "28rem" } as React.CSSProperties}')
    expect(app.match(/--sidebar-width/g)).toHaveLength(1)
    expect(app).not.toMatch(/--sidebar-width-mobile|w-\[28rem\]|28rem\]/)
    expect(readFileSync(new URL("../../../packages/ui/src/components/sidebar.tsx", import.meta.url), "utf8")).toContain('const SIDEBAR_WIDTH_MOBILE = "18rem"')
  })

  it("uses the shared 5rem label geometry for font rows and numeric rows, and exact role Font/Weight/Tracking copy (STHG-06)", () => {
    expect(TYPE_ROLE_GROUPS.map((group) => group.title)).toEqual(["Heading", "Body"])
    expect(controls).toContain('export const LABELLED_ROW_CLASS = "grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-center gap-[0.375rem]"')
    expect(controls).toContain('export const NUMERIC_ROW_CLASS = "grid min-w-0 grid-cols-[5rem_minmax(0,1fr)_max-content] items-center gap-[0.375rem]"')
    expect(controls).toContain("<div className={LABELLED_ROW_CLASS} data-testid={`${id}-row`}>")
    expect(controls).toContain("<div className={NUMERIC_ROW_CLASS} data-testid={`${id}-row`}>")
    expect(controls).not.toMatch(/6rem_minmax|className="sr-only">\s*\{label\}/)
    // Physical rem geometry only: no spacing-scale utilities in the label column contract.
    expect(controls).not.toMatch(/grid-cols-\[(?:var|calc)/)
    expect(app).toContain('<ControlSection key={role} id={`type-${role}`} title={title}>')
    expect(app).toContain('<ControlSection id="type-mono" title="Mono">')
    expect(app).not.toMatch(/title="Font families"|id="tracking"|id="fonts"/)
    expect(NUMERIC_CONTROLS.bodyTracking.label).toBe("Tracking")
    expect(NUMERIC_CONTROLS.bodyTracking.build(0.02, defaultTheme)).toEqual({ op: "setTracking", target: "body", value: "0.02em" })
    expect(NUMERIC_CONTROLS.headingWeight.build(700, defaultTheme)).toEqual({ op: "setFontWeight", target: "heading", value: 700 })
  })

  it("renders the active theme name and every dropdown theme name at font-medium", () => {
    expect(app).toContain('<span className="truncate font-medium">{current.name}</span>')
    expect(app).toContain('<span className="font-medium">{theme.name}</span>')
    expect(app).toContain('<span className="font-medium">{saved.themes[id]!.name}</span>')
  })

  it("shows Colors / Typography / Geometry / Effects / Command with px-2 triggers; Effects keeps the internal other value (PUI-94)", () => {
    const tabs = [...app.matchAll(/<TabsTrigger value="([a-z]+)" className=\{CATEGORY_TRIGGER_CLASS\} onMouseDown=\{focusCategoryTrigger\}>([A-Za-z]+)<\/TabsTrigger>/g)].map((match) => [match[1], match[2]])
    expect(tabs).toEqual([["colors", "Colors"], ["typography", "Typography"], ["geometry", "Geometry"], ["other", "Effects"], ["command", "Command"]])
    expect(app.match(/<TabsTrigger /g)).toHaveLength(5)
    // Every category trigger takes focus before Radix's mousedown activation hides the outgoing panel, so the mobile
    // sheet's focus restoration never pulls focus off the pressed tab.
    expect(app).toContain("if (event.button === 0) event.currentTarget.focus({ focusVisible: false })")
    const panel = (value: string) => {
      const start = app.indexOf(`<TabsContent className="data-[state=inactive]:hidden" value="${value}" forceMount>`)
      expect(start, value).toBeGreaterThan(-1)
      return app.slice(start, app.indexOf("</TabsContent>", start))
    }
    const sections = (value: string) => [...panel(value).matchAll(/<ControlSection id="([a-z-]+)"/g)].map((match) => match[1])
    // Each section appears exactly once, in exactly one panel; control IDs and builders are unchanged.
    expect(sections("geometry")).toEqual(["radius", "spacing"])
    expect(sections("other")).toEqual(["shadow", "ui-effects", "motion"])
    for (const id of ["radius", "spacing", "shadow", "ui-effects", "motion"]) expect(app.match(new RegExp(`<ControlSection id="${id}"`, "g"))).toHaveLength(1)
    expect(panel("geometry")).toContain('{numeric("radius")}')
    expect(panel("geometry")).toContain('{numeric("spacing")}')
    expect(panel("other")).toContain('{numeric("motion")}')
    expect(panel("other")).toContain('id="shadow-color"')
    // PUI-120: px-2 now comes from the official default trigger itself; the Workbench adds no padding override.
    const trigger = readFileSync(new URL("./workbenchTabs.ts", import.meta.url), "utf8").match(/const CATEGORY_TRIGGER_CLASS =\s*"([^"]+)"/)![1]!.split(" ")
    expect(readFileSync(new URL("../../../packages/ui/src/components/tabs.tsx", import.meta.url), "utf8")).toContain("px-2 py-1 text-sm")
    expect(trigger.filter((token) => /^p[xy]?-/.test(token))).toEqual([])
    expect(trigger).not.toContain("px-3")
  })

  it("adds pointer cursors only at bounded enabled call sites; the public Button stays unchanged", () => {
    // PUI-120: the section trigger is now the Secondary variant; its bounded pointer cursor is unchanged.
    expect(controls).toMatch(/<Button variant="secondary" size="sm" className="h-auto w-fit cursor-pointer /)
    expect(app).toContain('<SidebarTrigger className="size-8 cursor-pointer" />')
    // STHG-12: below 640px Export and Save are icon-only (names kept) so the recovery group fits the toolbar.
    expect(app).toContain('<Button variant="ghost" size="sm" className="cursor-pointer max-sm:w-8 max-sm:px-0" title="Export" disabled={locked} onClick={() => { endGesture(); download(exportThemeJson(currentRef.current)) }}>')
    expect(app).toContain('<Button variant="ghost" size="sm" className="cursor-pointer max-sm:w-8 max-sm:px-0" title="Save" disabled={locked} onClick={save}>')
    expect(app).toContain('<span className="max-sm:sr-only">Export</span>')
    // PUI-68: recovery actions show a pointer only while enabled; disabled ones keep a default cursor.
    for (const name of ["Undo", "Redo", "Reset"]) expect(app).toContain(`<Button variant="ghost" size="icon" className="size-8 enabled:cursor-pointer disabled:cursor-default" aria-label="${name}" title="${name}"`)
    // A short button-height semantic separator sits between the recovery group and Export; PUI-80 shares the one
    // definition with the separator after the colour-mode Switch, so both boundaries match by construction.
    expect(app).toContain('function ToolbarSeparator() {\n  return <div role="separator" aria-orientation="vertical" className="h-8 w-px shrink-0 bg-border" />\n}')
    expect(app).toMatch(/data-testid="history-controls"[\s\S]*?<\/div>\s*<ToolbarSeparator \/>[\s\S]*?title="Export"/)
    expect(app.match(/role="separator" aria-orientation="vertical"/g)).toHaveLength(1)
    expect(app).not.toContain("Export JSON")
    // Disabled buttons drop pointer events, so no pointer cursor can show while disabled.
    expect(button).toContain("disabled:pointer-events-none")
    expect(button).not.toContain("cursor-pointer")
    // Labels, sliders, and static copy receive no pointer cursor.
    expect(controls).not.toMatch(/<(?:FieldLabel|Slider|FieldDescription|span)[^>]*cursor-pointer/)
  })

  it("CGS-10/11 groups the right toolbar as colour-mode Switch | history | export/save with an icon-only thumb (PUI-80)", () => {
    const toolbar = app.slice(app.indexOf('data-testid="workbench-toolbar"'), app.indexOf('title="Save"'))
    const at = (needle: string) => { const index = toolbar.indexOf(needle); expect(index, needle).toBeGreaterThan(-1); return index }
    const order = ["<SidebarTrigger", 'className="ml-auto flex items-center gap-2"', 'id="color-mode-switch"', "<ToolbarSeparator />", 'data-testid="history-controls"', 'aria-label="Undo"', 'aria-label="Redo"', 'aria-label="Reset"', "</ResponsiveDialog>\n            </div>\n            <ToolbarSeparator />", 'title="Export"'].map(at)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    // No visible label: a stable accessible name, the shared Switch semantics, and a mode-mirroring thumb glyph.
    expect(app).not.toMatch(/>\s*Dark mode\s*</)
    expect(app).not.toContain('htmlFor="color-mode-switch"')
    expect(toolbar).toContain('aria-label="Toggle dark mode"')
    expect(toolbar).toContain('checked={mode === "dark"}')
    expect(toolbar).toContain('thumbContent={mode === "dark" ? <Moon aria-hidden="true" data-icon="moon" className="size-2.5" /> : <Sun aria-hidden="true" data-icon="sun" className="size-2.5" />}')
    expect(toolbar).toContain('onCheckedChange={(checked) => { endGesture(); setMode(checked ? "dark" : "light") }}')
  })
})
