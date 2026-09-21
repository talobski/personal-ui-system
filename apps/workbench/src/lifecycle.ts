import { applyMutation, MUTATION_SCHEMA_VERSION, renderShadcnTailwindCss, themeSchema, validateTheme } from "@personal-ui/core"
import type { ColorToken, MutationError, Theme, ThemeOperation } from "@personal-ui/core"
import canonicalFixture from "@personal-ui/core/theme/fixtures/valid.json"

export type Mode = "light" | "dark"

export type WorkbenchIssue = { ruleId: string; path: string }

export type Outcome<T> = ({ ok: true } & T) | { ok: false; issues: WorkbenchIssue[] }

/** The committed canonical fixture, validated through core; never edited in place. */
export function loadCanonicalTheme(): Theme {
  const result = validateTheme(canonicalFixture)
  if (!result.ok) throw new Error(`canonical theme fixture is invalid: ${JSON.stringify(result.issues)}`)
  return result.theme
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

/** Fork validation reuses the theme schema for id/name and adds a collision rule against known ids. */
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

const leaves = (node: unknown, path: string, out: Map<string, unknown>) => {
  if (typeof node === "object" && node !== null && "$value" in node) {
    out.set(path, (node as { $value: unknown }).$value)
  } else if (typeof node === "object" && node !== null && !Array.isArray(node)) {
    for (const [key, child] of Object.entries(node)) leaves(child, path ? `${path}.${key}` : key, out)
  }
}

const tokenValues = (theme: Theme) => {
  const out = new Map<string, unknown>()
  for (const group of ["modes", "typography", "radius", "space", "shadow", "motion"] as const) leaves(theme[group], group, out)
  return out
}

/** Compact structured diff of token values (`$value` leaves), sorted by path; identity and revision are excluded. */
export function diffThemes(baseline: Theme, current: Theme): DiffEntry[] {
  const before = tokenValues(baseline)
  const after = tokenValues(current)
  return [...new Set([...before.keys(), ...after.keys()])]
    .sort()
    .filter((path) => JSON.stringify(before.get(path)) !== JSON.stringify(after.get(path)))
    .map((path) => ({ path, baseline: before.get(path), current: after.get(path) }))
}

/** Portable export: schema-validated theme JSON, deterministic key order from the schema parse. */
export function exportThemeJson(theme: Theme): { filename: string; json: string } {
  const checked = themeSchema.parse(theme)
  return { filename: `${checked.id}.theme.json`, json: `${JSON.stringify(checked, null, 2)}\n` }
}

/** Runtime preview CSS: the `:root` and `.dark` variable blocks of core's rendered theme (drops the compiled `@theme inline`). */
export function previewVariablesCss(theme: Theme): string {
  return renderShadcnTailwindCss(theme).split("@theme inline")[0]!.trimEnd()
}

export type ProposalDiffEntry = { path: string; before: unknown; after: unknown }

/** Structured active-to-candidate diff of token values, sorted by path. */
export const diffProposal = (active: Theme, candidate: Theme): ProposalDiffEntry[] =>
  diffThemes(active, candidate).map(({ path, baseline, current }) => ({ path, before: baseline, after: current }))

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
      version: "1.0",
      proposalId,
      base: { themeId: theme.id, revision: theme.revision },
      provenance: { source: "workbench", sourceId: "example", createdAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"), intentSummary: "Softer corners, slightly denser." },
      operations: [
        { op: "setRadius", value: "1rem" },
        { op: "setDensity", value: 0.9 },
      ],
    },
    null,
    2
  )
