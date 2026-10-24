import { resolveTones, resolveUiEffects, SIDEBAR_COLOR_TOKENS, uiEffectsTokens } from "./schema"
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

const tokenValues = (theme: Theme, omitDerivedSidebar: boolean) => {
  const out = new Map<string, unknown>()
  // `sidebar` contributes only its `useDedicatedTokens` token; the bare `dedicatedValuesInitialized` bookkeeping flag has
  // no `$value`, so it is never a design difference.
  for (const group of ["colors", "typography", "radius", "space", "shadow", "motion", "sidebar"] as const) leaves(theme[group], group, out)
  // An absent `uiEffects` is the flat default, so it diffs exactly like an explicit flat value.
  leaves(uiEffectsTokens(resolveUiEffects(theme)), "uiEffects", out)
  // Likewise an absent `tones` is the shared defaults.
  leaves(resolveTones(theme), "tones", out)
  if (omitDerivedSidebar) for (const mode of ["light", "dark"]) for (const name of SIDEBAR_COLOR_TOKENS) out.delete(`colors.${mode}.${name}`)
  return out
}

/**
 * Token-value (`$value` leaf) diff sorted by path; identity and revision are excluded. While the dedicated Sidebar set
 * is uninitialized on both sides its colours are only generated copies of their base aliases, so they are omitted: the
 * base token change is the design difference. Once either side is initialized, dedicated colours diff normally.
 */
export function diffThemeTokens(before: Theme, after: Theme): ThemeTokenDiffEntry[] {
  const derived = !before.sidebar.dedicatedValuesInitialized && !after.sidebar.dedicatedValuesInitialized
  const from = tokenValues(before, derived)
  const to = tokenValues(after, derived)
  return [...new Set([...from.keys(), ...to.keys()])]
    .sort()
    .filter((path) => JSON.stringify(from.get(path)) !== JSON.stringify(to.get(path)))
    .map((path) => ({ path, before: from.get(path), after: to.get(path) }))
}
