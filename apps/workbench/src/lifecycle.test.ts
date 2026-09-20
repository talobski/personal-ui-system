import { describe, expect, it } from "vitest"
import { renderShadcnTailwindCss, validateTheme } from "@personal-ui/core"

import { diffThemes, editColor, editTheme, exportThemeJson, forkTheme, loadCanonicalTheme, previewVariablesCss } from "./lifecycle"
import { emptySaved, loadSaved, saveTheme, STORAGE_KEY } from "./persistence"
import type { StorageLike } from "./persistence"
import { SETTING_IDS, SETTINGS } from "./settings"

const canonical = loadCanonicalTheme()
const VALID = "oklch(0.4 0.1 150)"

const memoryStorage = (initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } => {
  const data = { ...initial }
  return { data, getItem: (key) => data[key] ?? null, setItem: (key, value) => void (data[key] = value) }
}

describe("editColor", () => {
  it("applies a valid edit through the mutation API without touching the input", () => {
    const result = editColor(canonical, "light", "primary", VALID)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme.modes.light.color.primary.$value).toBe(VALID)
    expect(result.theme.modes.dark.color.primary.$value).toBe(canonical.modes.dark.color.primary.$value)
    expect(result.theme.revision).toBe(canonical.revision + 1)
    expect(canonical.modes.light.color.primary.$value).not.toBe(VALID)
  })

  it.each(["red", "#fff", "oklch(0.4 0.1)", "red; } body { display: none", "var(--x)", ""])(
    "blocks invalid value %j with a stable rule and path, yielding no theme",
    (value) => {
      const result = editColor(canonical, "dark", "ring", value)
      expect(result).toEqual({ ok: false, issues: [{ ruleId: "mutation.invalid-value", path: "operations[0].value" }] })
    }
  )
})

describe("editTheme settings (one representative target per remaining category)", () => {
  const cases = [
    { id: "radius", raw: "1rem", diffPath: "radius.md", css: "--radius-scale-md: 1rem;" },
    { id: "density", raw: "1.25", diffPath: "space.density", css: "--density: 1.25;" },
    { id: "font", raw: "Source Serif", diffPath: "typography.sans", css: '--font-family-sans: "Source Serif", system-ui, sans-serif;' },
    { id: "shadow", raw: "12px", diffPath: "shadow.md", css: "--shadow-layers-md: 0px 4px 12px -2px oklch(0 0 0 / 10%);" },
    { id: "motion", raw: "320ms", diffPath: "motion.durationBase", css: "--motion-duration-base: 320ms;" },
  ] as const

  it("covers every setting", () => {
    expect([...SETTING_IDS].sort()).toEqual(cases.map((c) => c.id).sort())
  })

  it.each(cases)("$id: applies through the mutation API, bumps the revision, revalidates, and appears in the diff", ({ id, raw, diffPath, css }) => {
    const result = editTheme(canonical, SETTINGS[id].build(raw))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme.revision).toBe(canonical.revision + 1)
    expect(validateTheme(result.theme).ok).toBe(true)
    expect(SETTINGS[id].read(result.theme)).toBe(raw)
    expect(diffThemes(canonical, result.theme).map((entry) => entry.path)).toEqual([diffPath])
    expect(renderShadcnTailwindCss(result.theme)).toContain(css)
  })

  it.each([
    { id: "radius", raw: "red; } body { display: none", rule: "mutation.invalid-value" },
    { id: "density", raw: "abc", rule: "mutation.invalid-value" },
    { id: "density", raw: "9", rule: "mutation.invalid-value" },
    { id: "density", raw: "", rule: "mutation.invalid-value" },
    { id: "font", raw: 'x"; } a{', rule: "mutation.invalid-value" },
    { id: "shadow", raw: "-3px", rule: "mutation.invalid-value" },
    { id: "motion", raw: "200", rule: "mutation.invalid-value" },
  ] as const)("$id: blocks %j with a stable rule and path, yielding no theme", ({ id, raw, rule }) => {
    expect(editTheme(canonical, SETTINGS[id].build(raw))).toEqual({ ok: false, issues: [{ ruleId: rule, path: "operations[0].value" }] })
  })

  it("round-trips an edited non-color theme through export and saved state", () => {
    const edited = editTheme(canonical, SETTINGS.shadow.build("12px"))
    if (!edited.ok) throw new Error("edit failed")
    const fork = forkTheme(edited.theme, "my-fork", "My Fork", [])
    if (!fork.ok) throw new Error("fork failed")
    const storage = memoryStorage()
    expect(saveTheme(storage, emptySaved(), fork.theme, [canonical.id]).ok).toBe(true)
    expect(loadSaved(storage).themes["my-fork"]).toEqual(fork.theme)
    expect(validateTheme(JSON.parse(exportThemeJson(fork.theme).json))).toEqual({ ok: true, theme: fork.theme })
  })
})

describe("forkTheme", () => {
  it("creates a schema-valid fork with the new id/name and revision 1", () => {
    const result = forkTheme(editColorOrThrow(), "my-fork", "My Fork", [canonical.id])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.theme).toMatchObject({ id: "my-fork", name: "My Fork", revision: 1 })
    expect(result.theme.modes.light.color.primary.$value).toBe(VALID)
    expect(validateTheme(result.theme).ok).toBe(true)
  })

  it("rejects malformed ids/names and duplicate ids with stable rules", () => {
    expect(forkTheme(canonical, "Bad Id", "Ok", [])).toEqual({ ok: false, issues: [{ ruleId: "workbench.fork.invalid", path: "id" }] })
    expect(forkTheme(canonical, "ok-id", "Bad-Name!", [])).toEqual({ ok: false, issues: [{ ruleId: "workbench.fork.invalid", path: "name" }] })
    expect(forkTheme(canonical, "", "", []).ok).toBe(false)
    expect(forkTheme(canonical, canonical.id, "Same", [canonical.id])).toEqual({
      ok: false,
      issues: [{ ruleId: "workbench.fork.duplicate-id", path: "id" }],
    })
  })
})

function editColorOrThrow() {
  const result = editColor(canonical, "light", "primary", VALID)
  if (!result.ok) throw new Error("edit failed")
  return result.theme
}

describe("diffThemes", () => {
  it("is empty for identical themes and ignores id, name, and revision", () => {
    expect(diffThemes(canonical, canonical)).toEqual([])
    const forked = forkTheme(canonical, "other", "Other", [])
    if (!forked.ok) throw new Error("fork failed")
    expect(diffThemes(canonical, forked.theme)).toEqual([])
  })

  it("reports exactly the changed token paths, sorted, with before/after values", () => {
    const edited = editColorOrThrow()
    const next = editColor(edited, "dark", "background", "oklch(0.1 0.01 250)")
    if (!next.ok) throw new Error("edit failed")
    expect(diffThemes(canonical, next.theme)).toEqual([
      { path: "modes.dark.color.background", baseline: canonical.modes.dark.color.background.$value, current: "oklch(0.1 0.01 250)" },
      { path: "modes.light.color.primary", baseline: canonical.modes.light.color.primary.$value, current: VALID },
    ])
  })
})

describe("persistence", () => {
  it("round-trips saved themes and the active id through storage", () => {
    const storage = memoryStorage()
    const fork = forkTheme(editColorOrThrow(), "my-fork", "My Fork", [])
    if (!fork.ok) throw new Error("fork failed")
    const saved = saveTheme(storage, emptySaved(), fork.theme, [canonical.id])
    expect(saved.ok).toBe(true)
    // A fresh read from the same storage models a browser refresh.
    expect(loadSaved(storage)).toEqual({ themes: { "my-fork": fork.theme }, activeId: "my-fork" })
  })

  it("reserves the canonical id and does not write on rejection", () => {
    const storage = memoryStorage()
    expect(saveTheme(storage, emptySaved(), canonical, [canonical.id])).toEqual({
      ok: false,
      issues: [{ ruleId: "workbench.save.reserved-id", path: "id" }],
    })
    expect(storage.data).toEqual({})
  })

  it("reports storage failure with a stable rule", () => {
    const storage: StorageLike = { getItem: () => null, setItem: () => { throw new Error("quota") } }
    const fork = forkTheme(canonical, "my-fork", "My Fork", [])
    if (!fork.ok) throw new Error("fork failed")
    expect(saveTheme(storage, emptySaved(), fork.theme, [])).toEqual({
      ok: false,
      issues: [{ ruleId: "workbench.save.storage-unavailable", path: "" }],
    })
  })

  it("drops corrupt, invalid, or id-mismatched entries instead of trusting them", () => {
    const fork = forkTheme(canonical, "good", "Good", [])
    if (!fork.ok) throw new Error("fork failed")
    const bad = structuredClone(fork.theme)
    bad.modes.light.color.primary.$value = "red"
    const stored = { themes: { good: fork.theme, bad, mismatch: fork.theme }, activeId: "bad" }
    expect(loadSaved(memoryStorage({ [STORAGE_KEY]: JSON.stringify(stored) }))).toEqual({ themes: { good: fork.theme }, activeId: null })
    expect(loadSaved(memoryStorage({ [STORAGE_KEY]: "{not json" }))).toEqual(emptySaved())
    expect(loadSaved(memoryStorage())).toEqual(emptySaved())
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
