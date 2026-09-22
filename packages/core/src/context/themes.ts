import { validateTheme } from "../theme/schema"
import type { Theme } from "../theme/schema"
import canonicalFixture from "../theme/fixtures/valid.json" with { type: "json" }
import { compareCodeUnits } from "./ordering"

export type ThemeSummary = { id: string; name: string; revision: number }

/**
 * The catalog of themes the retrieval surface will validate and serve. V1 has exactly one: the committed canonical
 * fixture also used as the workbench's starting theme. Adding a theme here does not change `registry.json` or any
 * pilot component/contract catalog.
 */
const loaders = {
  "quiet-editorial": () => canonicalFixture,
} as const satisfies Record<string, () => unknown>

export type ThemeId = keyof typeof loaders

export const listThemeIds = (): ThemeId[] => (Object.keys(loaders) as ThemeId[]).slice().sort(compareCodeUnits)

export function getValidatedTheme(id: string): Theme | undefined {
  if (!Object.hasOwn(loaders, id)) return undefined
  const result = validateTheme(loaders[id as ThemeId]())
  if (!result.ok) throw new Error(`theme fixture "${id}" is invalid: ${JSON.stringify(result.issues)}`)
  return result.theme
}

/** Stable, sorted-by-id summaries; never the full theme payload (that is reserved for `get`). */
export function listThemeSummaries(): ThemeSummary[] {
  return listThemeIds().map((id) => {
    const theme = getValidatedTheme(id)!
    return { id: theme.id, name: theme.name, revision: theme.revision }
  })
}
