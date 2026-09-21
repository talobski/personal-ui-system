import type { Theme } from "./schema"

/** One changed token value. Values are JSON, so entries serialize as-is. */
export type ThemeTokenDiffEntry = { path: string; before: unknown; after: unknown }

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

/** Token-value (`$value` leaf) diff sorted by path; identity and revision are excluded. */
export function diffThemeTokens(before: Theme, after: Theme): ThemeTokenDiffEntry[] {
  const from = tokenValues(before)
  const to = tokenValues(after)
  return [...new Set([...from.keys(), ...to.keys()])]
    .sort()
    .filter((path) => JSON.stringify(from.get(path)) !== JSON.stringify(to.get(path)))
    .map((path) => ({ path, before: from.get(path), after: to.get(path) }))
}
