import { validateTheme } from "@personal-ui/core"
import type { Theme } from "@personal-ui/core"

import { customThemeId } from "./lifecycle"
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
 * Reads saved themes; anything unparsable or schema-invalid is dropped rather than trusted. The built-in always keeps
 * its id. A saved custom theme (one with a recorded base built-in, which every Save writes) whose id a later built-in
 * now reserves is kept under the next free id from its name (`secuna` -> `secuna-2`), with its values, base record and
 * selection; the new key is written on the next save or selection. Any other entry under a built-in id, such as a
 * stale copy of that built-in, is ignored and its selection resolves to the built-in. A selection that names no known
 * theme is dropped, so the caller falls back to the built-in Default.
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
  /** Stored id -> the id it is kept under; differs only for a theme re-keyed off a built-in id. */
  const keptAs: Record<string, string> = {}
  const hasRecordedBase = (id: string) => {
    const base = isRecord(bases) ? bases[id] : undefined
    return typeof base === "string" && base !== id && builtInIds.includes(base)
  }
  if (isRecord(themes)) {
    const taken = [...builtInIds, ...Object.keys(themes)]
    for (const [id, candidate] of Object.entries(themes)) {
      const result = validateTheme(candidate)
      if (!result.ok || result.theme.id !== id) continue
      if (!builtInIds.includes(id)) {
        saved.themes[id] = result.theme
        keptAs[id] = id
        continue
      }
      if (!hasRecordedBase(id)) continue
      const freeId = customThemeId(result.theme.name, taken)
      const rekeyed = freeId === null ? null : validateTheme({ ...result.theme, id: freeId })
      if (!rekeyed?.ok) continue
      taken.push(rekeyed.theme.id)
      saved.themes[rekeyed.theme.id] = rekeyed.theme
      keptAs[id] = rekeyed.theme.id
    }
  }
  if (isRecord(bases)) {
    for (const [id, base] of Object.entries(bases)) {
      if (Object.hasOwn(keptAs, id) && typeof base === "string" && builtInIds.includes(base)) saved.bases[keptAs[id]!] = base
    }
  }
  if (typeof activeId === "string" && Object.hasOwn(keptAs, activeId)) saved.activeId = keptAs[activeId]!
  else if (typeof activeId === "string" && builtInIds.includes(activeId)) saved.activeId = activeId
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

/**
 * Deletes one saved custom theme and its base record, then persists the built-in fallback as the selection. Built-ins
 * are never stored, so a built-in id (or any id without a saved theme) is rejected and nothing is written.
 */
export function deleteTheme(
  storage: StorageLike,
  saved: SavedThemes,
  id: string,
  fallbackId: string
): { ok: true; saved: SavedThemes } | { ok: false; issues: WorkbenchIssue[] } {
  if (!Object.hasOwn(saved.themes, id)) return { ok: false, issues: [{ ruleId: "workbench.delete.not-custom", path: "id" }] }
  const themes = Object.fromEntries(Object.entries(saved.themes).filter(([key]) => key !== id))
  const bases = Object.fromEntries(Object.entries(saved.bases).filter(([key]) => key !== id))
  return write(storage, { themes, activeId: fallbackId, bases })
}
