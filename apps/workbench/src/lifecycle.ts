import { applyMutation, MUTATION_SCHEMA_VERSION, renderShadcnTailwindCss, renderUiEffectsCss, themeSchema, validateTheme } from "@personal-ui/core"
import type { ColorToken, MutationError, Theme, ThemeOperation } from "@personal-ui/core"
import defaultFixture from "@personal-ui/core/theme/fixtures/default.json"
import quietEditorialFixture from "@personal-ui/core/theme/fixtures/valid.json"

export type Mode = "light" | "dark"

export type WorkbenchIssue = { ruleId: string; path: string }

export type Outcome<T> = ({ ok: true } & T) | { ok: false; issues: WorkbenchIssue[] }

/** Built-in themes in display order. Default is the fresh-state theme; both are committed canonical Theme v3 fixtures. */
export const DEFAULT_THEME_ID = "default"
const BUILT_IN_FIXTURES = [defaultFixture, quietEditorialFixture] as const

/** The committed built-in fixtures, validated through core; never edited in place. */
export function loadBuiltInThemes(): Theme[] {
  return BUILT_IN_FIXTURES.map((fixture) => {
    const result = validateTheme(fixture)
    if (!result.ok) throw new Error(`built-in theme fixture is invalid: ${JSON.stringify(result.issues)}`)
    return result.theme
  })
}

const fromMutation = (errors: MutationError[]): WorkbenchIssue[] => errors.map(({ ruleId, path }) => ({ ruleId, path }))

/** Every edit goes only through core's structured mutation API; a rejected edit returns the issues and no theme. */
export function editTheme(theme: Theme, operation: ThemeOperation): Outcome<{ theme: Theme }> {
  const result = applyMutation(theme, {
    schemaVersion: MUTATION_SCHEMA_VERSION,
    requestId: `workbench-${theme.id}-r${theme.revision}`,
    base: { themeId: theme.id, revision: theme.revision },
    operations: [operation],
  })
  return result.ok ? { ok: true, theme: result.theme } : { ok: false, issues: fromMutation(result.errors) }
}

export const editColor = (theme: Theme, mode: Mode, token: ColorToken, value: string) =>
  editTheme(theme, { op: "setColor", mode, token, value })

/**
 * A local custom theme id derived deterministically from its name: lowercase words joined by hyphens, suffixed `-2`,
 * `-3`, ... when that id is already taken by a built-in or a saved theme. Returns null for a name the schema rejects.
 */
export function customThemeId(name: string, takenIds: readonly string[]): string | null {
  const words = name.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0 || words.some((word) => !/^[a-z0-9]+$/.test(word))) return null
  const base = words.join("-")
  let id = base
  for (let n = 2; takenIds.includes(id); n++) id = `${base}-${n}`
  return id
}

/**
 * Save As: a schema-valid local custom copy of the theme under a new name, with a derived safe id and revision 1.
 * The source (typically an immutable built-in) is never modified. Only the name is user input.
 */
export function createCustomTheme(theme: Theme, name: string, takenIds: readonly string[]): Outcome<{ theme: Theme }> {
  const trimmed = name.trim()
  const id = customThemeId(trimmed, takenIds)
  const checked = themeSchema.safeParse({ ...structuredClone(theme), id: id ?? "", name: trimmed, revision: 1 })
  if (id === null || !checked.success) return { ok: false, issues: [{ ruleId: "workbench.save-as.invalid-name", path: "name" }] }
  return { ok: true, theme: checked.data }
}

/** Portable export: schema-validated theme JSON, deterministic key order from the schema parse. */
export function exportThemeJson(theme: Theme): { filename: string; json: string } {
  const checked = themeSchema.parse(theme)
  return { filename: `${checked.id}.theme.json`, json: `${JSON.stringify(checked, null, 2)}\n` }
}

/**
 * Runtime theme CSS: the `:root` and `.dark` variable blocks of core's rendered theme (drops the compiled `@theme
 * inline`), plus the targeted UI-effects block when one is enabled (empty for flat themes, so their output is unchanged).
 * Chrome renders it for the active theme only; the preview renders it for the active theme or a staged candidate.
 */
export function previewVariablesCss(theme: Theme): string {
  const variables = renderShadcnTailwindCss(theme).split("@theme inline")[0]!.trimEnd()
  const effects = renderUiEffectsCss(theme)
  return effects ? `${variables}\n\n${effects.trimEnd()}` : variables
}
