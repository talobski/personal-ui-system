import * as React from "react"

/**
 * PUI-143/PUI-144: the app's one pathname resolver. `/` is the landing page, `/workbench` the editor and
 * `/workbench/themes/:slug` the editor opened on a built-in. Only `/workbench?preview=1` is the preview iframe
 * document. `/themes` and `/themes/:slug` are reserved for future pages and currently resolve to not-found.
 */
export type Route =
  | { kind: "landing" }
  | { kind: "workbench"; themeId: string | null }
  | { kind: "preview" }
  | { kind: "not-found"; reserved: boolean }

export const LANDING_PATH = "/"
export const WORKBENCH_PATH = "/workbench"
const WORKBENCH_THEMES_PREFIX = `${WORKBENCH_PATH}/themes/`

/**
 * Stable public slug -> built-in theme id. Explicit rather than derived from display names, so renaming a built-in
 * never breaks a shared link. Only built-ins appear here: local custom themes live in one browser and have no URL.
 */
export const BUILT_IN_THEME_SLUGS: Readonly<Record<string, string>> = Object.freeze({
  default: "default",
  "quiet-editorial": "quiet-editorial",
  "amber-dusk": "amber-dusk",
  pocketmarket: "pocketmarket",
})

const slugByThemeId: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(BUILT_IN_THEME_SLUGS).map(([slug, id]) => [id, slug]))

/** The stable Workbench path for a built-in theme id, or null for any other id (custom themes are not linkable). */
export function builtInThemePath(themeId: string): string | null {
  const slug = Object.hasOwn(slugByThemeId, themeId) ? slugByThemeId[themeId]! : null
  return slug === null ? null : `${WORKBENCH_THEMES_PREFIX}${slug}`
}

/** The path that should be current while `themeId` is the active Workbench theme. */
export const workbenchPathFor = (themeId: string): string => builtInThemePath(themeId) ?? WORKBENCH_PATH

/** Repeated and trailing slashes never change the route: `/workbench/` is `/workbench`. */
const cleanPath = (pathname: string) => `/${pathname.split("/").filter(Boolean).join("/")}`

/**
 * Resolves a pathname (and search, for the preview document) to a route plus its canonical path. A Workbench path the
 * app does not know — an unknown slug, a wrong-case slug or any deeper path — canonicalises to plain `/workbench`, so
 * the editor starts from valid local state instead of a partial selection.
 */
export function resolveRoute(pathname: string, search = ""): { route: Route; path: string } {
  const path = cleanPath(pathname)
  if (path === LANDING_PATH) return { route: { kind: "landing" }, path }
  if (path === WORKBENCH_PATH) {
    if (new URLSearchParams(search).has("preview")) return { route: { kind: "preview" }, path }
    return { route: { kind: "workbench", themeId: null }, path }
  }
  if (path.startsWith(`${WORKBENCH_PATH}/`)) {
    const slug = path.startsWith(WORKBENCH_THEMES_PREFIX) ? path.slice(WORKBENCH_THEMES_PREFIX.length) : ""
    if (Object.hasOwn(BUILT_IN_THEME_SLUGS, slug)) return { route: { kind: "workbench", themeId: BUILT_IN_THEME_SLUGS[slug]! }, path }
    return { route: { kind: "workbench", themeId: null }, path: WORKBENCH_PATH }
  }
  const reserved = path === "/themes" || /^\/themes\/[^/]+$/.test(path)
  return { route: { kind: "not-found", reserved }, path }
}

// ---- History API location store -------------------------------------------------------------------------------

type Location = { pathname: string; search: string; hash: string }

const listeners = new Set<() => void>()
let snapshot: Location | null = null

const read = (): Location => ({ pathname: window.location.pathname, search: window.location.search, hash: window.location.hash })

/** Canonicalises the address bar in place (no new entry) when the current path is not its route's canonical path. */
function canonicalise() {
  const { pathname, search, hash } = read()
  const { path } = resolveRoute(pathname, search)
  if (path !== pathname) window.history.replaceState(window.history.state, "", `${path}${search}${hash}`)
}

function refresh() {
  canonicalise()
  const next = read()
  if (!snapshot || snapshot.pathname !== next.pathname || snapshot.search !== next.search || snapshot.hash !== next.hash) snapshot = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("popstate", refresh)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener("popstate", refresh)
  }
}

function getSnapshot(): Location {
  if (!snapshot) {
    canonicalise()
    snapshot = read()
  }
  return snapshot
}

/** The current route, kept in sync with `navigate`, `replacePath` and browser back/forward. */
export function useRoute(): Route {
  const location = React.useSyncExternalStore(subscribe, getSnapshot)
  return React.useMemo(() => resolveRoute(location.pathname, location.search).route, [location])
}

/** Resolves the document's own initial location once (canonicalising it first), before anything renders. */
export function initialRoute(): Route {
  const location = getSnapshot()
  return resolveRoute(location.pathname, location.search).route
}

/** A new history entry for an in-app link, e.g. the landing page's Workbench CTA. */
export function navigate(path: string) {
  if (`${window.location.pathname}${window.location.search}` === path) return
  window.history.pushState(null, "", path)
  refresh()
  window.scrollTo(0, 0)
}

/** Makes `path` current without a new history entry; search and hash are kept. */
export function replacePath(path: string) {
  if (window.location.pathname === path) return
  window.history.replaceState(window.history.state, "", `${path}${window.location.search}${window.location.hash}`)
  refresh()
}

/**
 * Lets an ordinary same-origin `<a href>` navigate in-app. Modified clicks (new tab, new window, download) and
 * non-primary buttons keep the browser's default behaviour, so links stay real links.
 */
export function linkClick(event: React.MouseEvent<HTMLAnchorElement>) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const anchor = event.currentTarget
  if (anchor.target && anchor.target !== "_self") return
  const url = new URL(anchor.href)
  if (url.origin !== window.location.origin || url.hash) return
  event.preventDefault()
  navigate(`${url.pathname}${url.search}`)
}
