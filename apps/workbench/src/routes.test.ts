import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { loadBuiltInThemes } from "./lifecycle"
import { BUILT_IN_THEME_SLUGS, builtInThemePath, resolveRoute, WORKBENCH_PATH, workbenchPathFor } from "./routes"

const builtIns = loadBuiltInThemes()

describe("PUI-144 built-in slug table", () => {
  it("is the explicit stable table, one slug per built-in, never derived from display names", () => {
    expect(BUILT_IN_THEME_SLUGS).toEqual({ default: "default", "quiet-editorial": "quiet-editorial", "amber-dusk": "amber-dusk", pocketmarket: "pocketmarket", secuna: "secuna" })
    expect(Object.isFrozen(BUILT_IN_THEME_SLUGS)).toBe(true)
    expect(Object.values(BUILT_IN_THEME_SLUGS).sort()).toEqual(builtIns.map((theme) => theme.id).sort())
    expect(new Set(Object.values(BUILT_IN_THEME_SLUGS)).size).toBe(Object.keys(BUILT_IN_THEME_SLUGS).length)
    for (const slug of Object.keys(BUILT_IN_THEME_SLUGS)) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    // Display names are not slugs: "Quiet Editorial" is not a route.
    expect(resolveRoute("/workbench/themes/Quiet Editorial").route).toEqual({ kind: "workbench", themeId: null })
  })

  it("maps each built-in to its stable path and every other id to plain /workbench", () => {
    expect(builtInThemePath("default")).toBe("/workbench/themes/default")
    expect(builtInThemePath("quiet-editorial")).toBe("/workbench/themes/quiet-editorial")
    expect(builtInThemePath("amber-dusk")).toBe("/workbench/themes/amber-dusk")
    expect(builtInThemePath("pocketmarket")).toBe("/workbench/themes/pocketmarket")
    expect(builtInThemePath("secuna")).toBe("/workbench/themes/secuna")
    for (const id of ["my-theme", "toString", "__proto__", "constructor", ""]) {
      expect(builtInThemePath(id)).toBeNull()
      expect(workbenchPathFor(id)).toBe(WORKBENCH_PATH)
    }
  })
})

describe("PUI-143/PUI-144 resolveRoute", () => {
  it("serves the landing page at / and the editor at /workbench", () => {
    expect(resolveRoute("/")).toEqual({ route: { kind: "landing" }, path: "/" })
    expect(resolveRoute("/workbench")).toEqual({ route: { kind: "workbench", themeId: null }, path: "/workbench" })
    expect(resolveRoute("/workbench/")).toEqual({ route: { kind: "workbench", themeId: null }, path: "/workbench" })
  })

  it("selects each supported built-in from its path", () => {
    for (const [slug, id] of Object.entries(BUILT_IN_THEME_SLUGS)) {
      expect(resolveRoute(`/workbench/themes/${slug}`)).toEqual({ route: { kind: "workbench", themeId: id }, path: `/workbench/themes/${slug}` })
      expect(resolveRoute(`/workbench/themes/${slug}/`).path).toBe(`/workbench/themes/${slug}`)
    }
  })

  it("normalizes unknown, wrong-case, inherited-name and deeper Workbench paths to plain /workbench", () => {
    for (const path of [
      "/workbench/themes/unknown",
      "/workbench/themes/Amber-Dusk",
      "/workbench/themes/toString",
      "/workbench/themes/__proto__",
      "/workbench/themes/",
      "/workbench/themes",
      "/workbench/themes/amber-dusk/extra",
      "/workbench/anything",
      "/workbench/themes/amber%2Ddusk",
    ]) {
      expect(resolveRoute(path), path).toEqual({ route: { kind: "workbench", themeId: null }, path: "/workbench" })
    }
  })

  it("selects the preview document only at /workbench?preview=1", () => {
    expect(resolveRoute("/workbench", "?preview=1").route).toEqual({ kind: "preview" })
    expect(resolveRoute("/", "?preview=1").route).toEqual({ kind: "landing" })
    expect(resolveRoute("/workbench/themes/amber-dusk", "?preview=1").route).toEqual({ kind: "workbench", themeId: "amber-dusk" })
    expect(resolveRoute("/themes", "?preview=1").route.kind).toBe("not-found")
  })

  it("keeps /themes and /themes/:slug reserved and unimplemented, distinct from other unknown paths", () => {
    expect(resolveRoute("/themes")).toEqual({ route: { kind: "not-found", reserved: true }, path: "/themes" })
    expect(resolveRoute("/themes/amber-dusk")).toEqual({ route: { kind: "not-found", reserved: true }, path: "/themes/amber-dusk" })
    expect(resolveRoute("/themes/amber-dusk/x").route).toEqual({ kind: "not-found", reserved: false })
    expect(resolveRoute("/elsewhere").route).toEqual({ kind: "not-found", reserved: false })
  })
})

describe("PUI-144 Workbench source boundaries", () => {
  const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8")
  const main = readFileSync(new URL("./main.tsx", import.meta.url), "utf8")

  it("loads the preview iframe from /workbench?preview=1", () => {
    expect(app).toContain('src="/workbench?preview=1"')
    expect(app).not.toContain('src="/?preview=1"')
    expect(main).toContain('initialRoute().kind === "preview"')
  })

  it("syncs the address bar with replaceState only, never pushState", () => {
    const routes = readFileSync(new URL("./routes.ts", import.meta.url), "utf8")
    expect(app).toContain("replacePath(workbenchPathFor(current.id))")
    expect(app).not.toMatch(/pushState|navigate\(/)
    expect(routes.match(/pushState/g)).toHaveLength(1)
  })
})
