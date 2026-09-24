import { applyMutation, diffThemeTokens, MUTATION_SCHEMA_VERSION, renderShadcnTailwindCss, themeSchema, validateTheme } from "@personal-ui/core"
import type { ColorToken, MutationError, Theme, ThemeOperation } from "@personal-ui/core"
import defaultFixture from "@personal-ui/core/theme/fixtures/default.json"
import quietEditorialFixture from "@personal-ui/core/theme/fixtures/valid.json"

export type Mode = "light" | "dark"

export type WorkbenchIssue = { ruleId: string; path: string }

export type Outcome<T> = ({ ok: true } & T) | { ok: false; issues: WorkbenchIssue[] }

/** Built-in themes in display order. Default is the fresh-state theme; Quiet Editorial is the migrated v1 fixture. */
export const DEFAULT_THEME_ID = "default"
const BUILT_IN_FIXTURES = [defaultFixture, quietEditorialFixture] as const

/** The committed built-in fixtures, validated (and, for v1 input, migrated) through core; never edited in place. */
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

/** Fork validation reuses the theme schema for id/name and adds a collision rule against known (built-in and saved) ids. */
export function forkTheme(theme: Theme, id: string, name: string, takenIds: readonly string[]): Outcome<{ theme: Theme }> {
  const candidate = { ...structuredClone(theme), id, name, revision: 1 }
  const checked = themeSchema.safeParse(candidate)
  const issues: WorkbenchIssue[] = checked.success
    ? []
    : checked.error.issues
        .filter((issue) => issue.path[0] === "id" || issue.path[0] === "name")
        .map((issue) => ({ ruleId: "workbench.fork.invalid", path: String(issue.path[0]) }))
  if (issues.length === 0 && takenIds.includes(id)) issues.push({ ruleId: "workbench.fork.duplicate-id", path: "id" })
  return issues.length > 0 || !checked.success ? { ok: false, issues } : { ok: true, theme: checked.data }
}

export type DiffEntry = { path: string; baseline: unknown; current: unknown }

/** Compact structured diff of token values (`$value` leaves), sorted by path; identity and revision are excluded. */
export const diffThemes = (baseline: Theme, current: Theme): DiffEntry[] =>
  diffThemeTokens(baseline, current).map(({ path, before, after }) => ({ path, baseline: before, current: after }))

/** Portable export: schema-validated theme JSON, deterministic key order from the schema parse. */
export function exportThemeJson(theme: Theme): { filename: string; json: string } {
  const checked = themeSchema.parse(theme)
  return { filename: `${checked.id}.theme.json`, json: `${JSON.stringify(checked, null, 2)}\n` }
}

/** Runtime preview CSS: the `:root` and `.dark` variable blocks of core's rendered theme (drops the compiled `@theme inline`). */
export function previewVariablesCss(theme: Theme): string {
  return renderShadcnTailwindCss(theme).split("@theme inline")[0]!.trimEnd()
}

/** The proposal text box holds JSON only; anything unparsable is reported and never reaches the mutation boundary. */
export function parseProposalJson(text: string): Outcome<{ value: unknown }> {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false, issues: [{ ruleId: "workbench.proposal.invalid-json", path: "" }] }
  }
}

/** A valid example proposal for the active theme, so a person can see the envelope and try Apply / Discard. */
export const exampleProposalJson = (theme: Theme, proposalId: string): string =>
  JSON.stringify(
    {
      schemaVersion: "1.0",
      proposalId,
      base: { themeId: theme.id, revision: theme.revision },
      provenance: { source: "manual", sourceId: "workbench-example", createdAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), intentSummary: "Softer corners, slightly denser." },
      operations: [
        { op: "setRadius", value: "1rem" },
        { op: "setDensity", value: 0.9 },
      ],
    },
    null,
    2
  )
