import { validateTheme } from "@personal-ui/core"
import type { Theme } from "@personal-ui/core"

import type { WorkbenchIssue } from "./lifecycle"

export const STORAGE_KEY = "personal-ui-workbench/v1"

export type StorageLike = Pick<Storage, "getItem" | "setItem">

/**
 * `themes` holds saved user themes only (built-ins are never stored). `activeId` is the persisted theme *selection*,
 * which may name a built-in or a saved theme. `bases` records which built-in each saved theme was forked from, so its
 * baseline diff survives a reload. Every theme is re-validated on read, which also migrates v1 themes to v2.
 */
export type SavedThemes = { themes: Record<string, Theme>; activeId: string | null; bases: Record<string, string> }

export const emptySaved = (): SavedThemes => ({ themes: {}, activeId: null, bases: {} })

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * Reads saved themes; anything unparsable or schema-invalid is dropped rather than trusted. A saved theme whose id is
 * reserved by a built-in is ignored (the built-in wins). A selection that names no known theme is dropped, so the
 * caller falls back to the built-in Default.
 */
export function loadSaved(storage: StorageLike, builtInIds: readonly string[]): SavedThemes {
  let raw: unknown
  try {
    raw = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")
  } catch {
    return emptySaved()
  }
  if (!isRecord(raw)) return emptySaved()
  const { themes, activeId, bases } = raw
  const saved = emptySaved()
  if (isRecord(themes)) {
    for (const [id, candidate] of Object.entries(themes)) {
      if (builtInIds.includes(id)) continue
      const result = validateTheme(candidate)
      if (result.ok && result.theme.id === id) saved.themes[id] = result.theme
    }
  }
  if (isRecord(bases)) {
    for (const [id, base] of Object.entries(bases)) {
      if (Object.hasOwn(saved.themes, id) && typeof base === "string" && builtInIds.includes(base)) saved.bases[id] = base
    }
  }
  if (typeof activeId === "string" && (Object.hasOwn(saved.themes, activeId) || builtInIds.includes(activeId))) saved.activeId = activeId
  return saved
}

function write(storage: StorageLike, next: SavedThemes): { ok: true; saved: SavedThemes } | { ok: false; issues: WorkbenchIssue[] } {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    return { ok: false, issues: [{ ruleId: "workbench.save.storage-unavailable", path: "" }] }
  }
  return { ok: true, saved: next }
}

/** Saves a validated theme under its id; built-in ids are reserved so a built-in is never shadowed or silently saved. */
export function saveTheme(
  storage: StorageLike,
  saved: SavedThemes,
  theme: Theme,
  reservedIds: readonly string[],
  baseId: string
): { ok: true; saved: SavedThemes } | { ok: false; issues: WorkbenchIssue[] } {
  const checked = validateTheme(theme)
  if (!checked.ok) return { ok: false, issues: checked.issues.map(({ ruleId, path }) => ({ ruleId, path })) }
  if (reservedIds.includes(theme.id)) return { ok: false, issues: [{ ruleId: "workbench.save.reserved-id", path: "id" }] }
  return write(storage, {
    themes: { ...saved.themes, [theme.id]: checked.theme },
    activeId: theme.id,
    bases: { ...saved.bases, [theme.id]: baseId },
  })
}

/** Persists only the selection (a built-in or saved id). Theme data is untouched, so selecting never saves a theme. */
export function saveSelection(storage: StorageLike, saved: SavedThemes, id: string): SavedThemes {
  const result = write(storage, { ...saved, activeId: id })
  return result.ok ? result.saved : saved
}
