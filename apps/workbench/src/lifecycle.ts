import { applyMutation, MUTATION_SCHEMA_VERSION, renderPortableThemeCss, renderShadcnTailwindCss, renderUiEffectsCss, themeSchema, toPortableTheme, validateTheme } from "@personal-ui/core"
import type { ColorToken, MutationError, Theme, ThemeOperation } from "@personal-ui/core"
import defaultFixture from "@personal-ui/core/theme/fixtures/default.json"
import quietEditorialFixture from "@personal-ui/core/theme/fixtures/valid.json"
import amberDuskFixture from "@personal-ui/core/theme/fixtures/amber-dusk.json"
import pocketmarketFixture from "@personal-ui/core/theme/fixtures/pocketmarket.json"
import secunaFixture from "@personal-ui/core/theme/fixtures/secuna.json"

export type Mode = "light" | "dark"

export type WorkbenchIssue = { ruleId: string; path: string }

export type Outcome<T> = ({ ok: true } & T) | { ok: false; issues: WorkbenchIssue[] }

/** Built-in themes in display order. Default is the fresh-state theme; all are committed canonical Theme v3 fixtures. */
export const DEFAULT_THEME_ID = "default"
const BUILT_IN_FIXTURES = [defaultFixture, quietEditorialFixture, amberDuskFixture, pocketmarketFixture, secunaFixture] as const

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

/**
 * Theme code JSON: core's portable theme (design tokens only, no Personal UI identity, schema or revision), so the
 * copied text can go into any project. Saved themes keep full canonical Theme v3; this is a one-way export.
 */
export function exportThemeJson(theme: Theme): { filename: string; json: string } {
  return { filename: `${theme.id}.theme.json`, json: `${JSON.stringify(toPortableTheme(theme), null, 2)}\n` }
}

/**
 * Theme code CSS / Tailwind v4: core's portable render (`:root`, `.dark`, `@theme inline` and the UI-effects block while
 * Tactile is on), without the generator header, theme identity or revision.
 */
export function exportThemeCss(theme: Theme): { filename: string; css: string } {
  return { filename: `${theme.id}.theme.css`, css: renderPortableThemeCss(theme) }
}

/**
 * Theme code Agent Prompt: a neutral implementation brief for a coding agent, wrapped around `css` unchanged. It names
 * no product, theme, source or framework requirement, so the copied text carries only the task and the design.
 */
export function formatAgentPrompt(css: string): string {
  return `Apply the following design theme to this project.

First inspect the project's existing theme, token, component and styling architecture. Adapt the theme
to that architecture rather than replacing it.

Requirements:
- Preserve existing component behavior and application logic.
- Reuse the project's existing theme or token system where practical. If it already has semantic
  tokens, map the supplied values into them instead of scattering raw values.
- Apply both light and dark modes. Light values are under :root and dark values under .dark; use the
  project's existing dark-mode mechanism.
- Preserve accessibility and the existing focus, invalid, disabled, selected, checked, open, hover and
  pressed states.
- Preserve existing layouts and responsive behavior. Do not redesign unrelated components.
- Do not introduce unrelated branding, product names or content.
- Avoid adding dependencies unless required.
- The CSS uses Tailwind v4 syntax (@theme inline, @utility, @layer). If the project styles differently,
  translate it rather than adopting Tailwind.
- If a supplied token or state does not map cleanly, use the closest semantic equivalent and report it.
- If the CSS references state or data attributes that the project's components do not expose, make the
  smallest markup change necessary and report it.
- Keep changes focused and reversible.
- Run the project's usual validation after implementing.
- Do not commit unless asked.

Theme CSS:

\`\`\`css
${css}\`\`\`

When finished, report:
- files changed
- how the theme was mapped into the project's existing architecture
- any values or states that could not be mapped directly
- how light and dark modes were implemented
- any component markup changes
- validation results
`
}

/** Theme code Agent Prompt: `formatAgentPrompt` around exactly the Tailwind v4 export's portable CSS. */
export function exportThemeAgentPrompt(theme: Theme): { filename: string; prompt: string } {
  return { filename: `${theme.id}.agent-prompt.md`, prompt: formatAgentPrompt(exportThemeCss(theme).css) }
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
