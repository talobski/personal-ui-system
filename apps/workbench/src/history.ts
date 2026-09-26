import { diffThemeTokens, themeSchema } from "@personal-ui/core"
import type { Theme } from "@personal-ui/core"

/**
 * Session-local manual editing history (PUI-3). History is a Workbench session concern only: it is never canonical
 * theme data, never persisted, and never a Design Command operation. A reload starts empty.
 *
 * Each theme id owns one track. A snapshot stores a theme's canonical design content; it is never reinstated as an
 * old live revision. Undo, Redo, and Reset rebuild the restored content under the current identity with the next
 * revision, and revalidate it, so revisions only ever increase and proposal stale protection stays sound.
 */
export type HistoryTrack = { readonly past: readonly Theme[]; readonly future: readonly Theme[] }

export const EMPTY_TRACK: HistoryTrack = Object.freeze({ past: Object.freeze([]), future: Object.freeze([]) })

/** Oldest checkpoints beyond this many are dropped, so one long session cannot grow memory without bound. */
export const MAX_HISTORY_ENTRIES = 100

/**
 * Two themes have the same design when no token value differs. Identity, revision, and internal bookkeeping (the
 * Sidebar initialization flag, and alias-derived Sidebar colours while uninitialized) are not design differences.
 */
export const sameDesign = (a: Theme, b: Theme) => diffThemeTokens(a, b).length === 0

/** Dirty: the working theme's design differs from its durable baseline (built-in fixture or last saved snapshot). */
export const isDirty = (current: Theme, baseline: Theme) => !sameDesign(current, baseline)

const bounded = (entries: readonly Theme[]) => (entries.length > MAX_HISTORY_ENTRIES ? entries.slice(entries.length - MAX_HISTORY_ENTRIES) : entries)

/**
 * Records one committed transition. A no-op (same design) records nothing; otherwise `before` becomes the newest
 * checkpoint and Redo is cleared, because a new committed edit after Undo starts a new branch.
 */
export function record(track: HistoryTrack, before: Theme, after: Theme): HistoryTrack {
  if (sameDesign(before, after)) return track
  return { past: bounded([...track.past, before]), future: [] }
}

/**
 * `snapshot`'s design content under `current`'s identity at `current.revision + 1`, revalidated through the canonical
 * schema. Throws only if a snapshot the schema once admitted no longer validates, which cannot happen within a session.
 */
export function restoreContent(snapshot: Theme, current: Theme): Theme {
  return themeSchema.parse({ ...structuredClone(snapshot), id: current.id, name: current.name, revision: current.revision + 1 })
}

export type HistoryStep = { track: HistoryTrack; theme: Theme }

/** Restores the newest checkpoint; the current content moves onto Redo. `null` when there is nothing to undo. */
export function undo(track: HistoryTrack, current: Theme): HistoryStep | null {
  const target = track.past.at(-1)
  if (!target) return null
  return { track: { past: track.past.slice(0, -1), future: [...track.future, current] }, theme: restoreContent(target, current) }
}

/** Re-applies the most recently undone content; the current content moves back onto Undo. `null` when empty. */
export function redo(track: HistoryTrack, current: Theme): HistoryStep | null {
  const target = track.future.at(-1)
  if (!target) return null
  return { track: { past: bounded([...track.past, current]), future: track.future.slice(0, -1) }, theme: restoreContent(target, current) }
}

/**
 * Reset to the durable baseline as one undoable transition. `null` when the working theme is already clean, so a
 * Reset never creates an empty history entry or a revision.
 */
export function reset(track: HistoryTrack, current: Theme, baseline: Theme): HistoryStep | null {
  if (sameDesign(current, baseline)) return null
  const theme = restoreContent(baseline, current)
  return { track: record(track, current, theme), theme }
}
