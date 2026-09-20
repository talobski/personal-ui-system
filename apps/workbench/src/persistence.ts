import { validateTheme } from "@personal-ui/core"
import type { Theme } from "@personal-ui/core"

import type { WorkbenchIssue } from "./lifecycle"

export const STORAGE_KEY = "personal-ui-workbench/v1"

export type StorageLike = Pick<Storage, "getItem" | "setItem">

export type SavedThemes = { themes: Record<string, Theme>; activeId: string | null }

export const emptySaved = (): SavedThemes => ({ themes: {}, activeId: null })

/** Reads saved themes; anything unparsable or schema-invalid is dropped rather than trusted. */
export function loadSaved(storage: StorageLike): SavedThemes {
  let raw: unknown
  try {
    raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")
  } catch {
    return emptySaved()
  }
  if (typeof raw !== "object" || raw === null) return emptySaved()
  const { themes, activeId } = raw as { themes?: unknown; activeId?: unknown }
  const saved = emptySaved()
  if (typeof themes === "object" && themes !== null) {
    for (const [id, candidate] of Object.entries(themes)) {
      const result = validateTheme(candidate)
      if (result.ok && result.theme.id === id) saved.themes[id] = result.theme
    }
  }
  if (typeof activeId === "string" && activeId in saved.themes) saved.activeId = activeId
  return saved
}

/** Saves a validated theme under its id; the canonical id is reserved so the baseline is never shadowed. */
export function saveTheme(
  storage: StorageLike,
  saved: SavedThemes,
  theme: Theme,
  reservedIds: readonly string[]
): { ok: true; saved: SavedThemes } | { ok: false; issues: WorkbenchIssue[] } {
  const checked = validateTheme(theme)
  if (!checked.ok) return { ok: false, issues: checked.issues.map(({ ruleId, path }) => ({ ruleId, path })) }
  if (reservedIds.includes(theme.id)) return { ok: false, issues: [{ ruleId: "workbench.save.reserved-id", path: "id" }] }
  const next: SavedThemes = { themes: { ...saved.themes, [theme.id]: checked.theme }, activeId: theme.id }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    return { ok: false, issues: [{ ruleId: "workbench.save.storage-unavailable", path: "" }] }
  }
  return { ok: true, saved: next }
}
