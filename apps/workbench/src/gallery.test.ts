import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { COMPOSITION_IDS, PREVIEW_COMPOSITIONS } from "./Gallery"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
/** Source without comments, so explanatory prose ("never dense") is not mistaken for an implementation. */
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

/** Resolves the row/column placement of a source-ordered row-flow grid without dense packing. */
function place(layouts: readonly ("default" | "wide")[], columns: number) {
  const cells: { row: number; column: number; span: number }[] = []
  let row = 0
  let column = 0
  for (const layout of layouts) {
    const span = layout === "wide" && columns >= 2 ? 2 : 1
    if (column + span > columns) {
      row += 1
      column = 0
    }
    cells.push({ row, column, span })
    column += span
    if (column >= columns) {
      row += 1
      column = 0
    }
  }
  return cells
}

describe("NGIP-03 nested gallery regression (retained)", () => {
  it("reproduces the frozen global-row failure independently of the corrected recipe", () => {
    const cells = place(["wide", "default", "wide"], 3)
    expect(cells.map(cell => cell.row)).toEqual([0, 0, 1])
    const weekHeight = 200, profileHeight = 500, gap = 24
    expect(Math.max(weekHeight, profileHeight) + gap - weekHeight).toBe(324)
  })

  it("keeps every composition once in coherent region order without per-composition placement metadata", () => {
    expect(new Set(COMPOSITION_IDS).size).toBe(COMPOSITION_IDS.length)
    for (const entry of PREVIEW_COMPOSITIONS) expect(Object.keys(entry)).toEqual(["id", "render"])
    const source = code("./Gallery.tsx")
    expect(source).not.toMatch(/PreviewLayout|data-layout|gridColumn|gridRow|colSpan/)
    // The recipe renders each configured composition exactly once, in configuration (DOM/focus) order.
    expect(Array.from(source.matchAll(/<Composition id="([a-z-]+)" \/>/g), match => match[1])).toEqual(COMPOSITION_IDS)
    for (const name of ["productive-week", "team-access", "workspace-settings"]) expect(read(`../../../packages/ui/src/compositions/${name}.tsx`)).not.toMatch(/data-layout|PreviewLayout|span 2/)
  })
})

describe("CGS-03/04/06 container-responsive nested gallery (PUI-78)", () => {
  it("drives the frame from the gallery's own named container with explicit, rebalancing 12-track spans", () => {
    const source = code("./Gallery.tsx")
    expect(source).toContain('data-gallery="cards"')
    expect(source).toContain("@container/gallery")
    expect(source).toContain("grid grid-cols-1 items-start gap-4 @2xl/gallery:grid-cols-12 @4xl/gallery:gap-6")
    // Left smaller / right larger at wide sizes: 6/6, then 5/7, then 4/8. Each pair always fills the 12 tracks.
    expect(source).toContain('side="left" className="@2xl/gallery:col-span-6 @4xl/gallery:col-span-5 @6xl/gallery:col-span-4"')
    expect(source).toContain('side="right" className="@2xl/gallery:col-span-6 @4xl/gallery:col-span-7 @6xl/gallery:col-span-8"')
    expect(source.match(/<Region side=/g)).toHaveLength(2)
  })

  it("makes each region an independent natural-height stack and query container for its local groups", () => {
    const source = code("./Gallery.tsx")
    expect(source).toContain("@container flex min-w-0 flex-col gap-4 @4xl/gallery:gap-6")
    expect(source).toContain("grid min-w-0 grid-cols-1 items-start gap-4 @4xl/gallery:gap-6")
    // Local groups switch on their region's width (unnamed nearest container), independently of each other.
    expect(source).toMatch(/<LocalGroup className="@(sm|md|lg|xl|2xl|3xl)[:\w-]*grid-cols-2/)
  })

  it("uses no viewport media query, masonry, dense packing, absolute placement, or legacy semantic layout classes", () => {
    const source = code("./Gallery.tsx")
    const css = code("./styles.css")
    for (const text of [source, css]) {
      expect(text).not.toMatch(/quiet-gallery|quiet-stack|quiet-gallery-principal|quiet-gallery-pair|masonry|grid-flow-dense|dense|aspect-ratio|aspect-square|grid-auto-rows|auto-rows/)
      expect(text).not.toMatch(/\babsolute\b|\bfixed\b/)
    }
    // Viewport breakpoints (`lg:grid-cols-2`) are absent; only `@`-prefixed container variants place the gallery.
    expect(source).not.toMatch(/(?<![@\w/-])(sm|md|lg|xl|2xl):(grid|col|flex|gap)/)
    expect(css).not.toMatch(/data-gallery|data-composition/)
  })
})

describe("CGS-07/08 curated token-driven showcase (PUI-79)", () => {
  const MODULES: Record<string, string> = {
    "productive-week": "productive-week", "quick-find": "quick-find", "account-profile": "account-profile", notifications: "notification-preferences",
    "plan-usage": "plan-usage", "support-request": "support-request", "revenue-overview": "revenue-overview", "upcoming-schedule": "upcoming-schedule",
    "recent-activity": "recent-activity", "launch-board": "launch-board", "team-access": "team-access", "workspace-settings": "workspace-settings", "room-to-think": "room-to-think",
  }
  const module = (id: string) => read(`../../../packages/ui/src/compositions/${MODULES[id]}.tsx`)

  it("curates thirteen distinct compositions across both regions and every local group", () => {
    expect(COMPOSITION_IDS).toEqual(["productive-week", "quick-find", "account-profile", "notifications", "plan-usage", "support-request", "revenue-overview", "upcoming-schedule", "recent-activity", "launch-board", "team-access", "workspace-settings", "room-to-think"])
    expect(Object.keys(MODULES).sort()).toEqual([...COMPOSITION_IDS].sort())
  })

  it("styles every composition with semantic tokens and Theme v3 roles, never raw colours", () => {
    const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
    for (const id of COMPOSITION_IDS) {
      const source = module(id)
      expect(source, id).not.toMatch(rawColour)
      // One semantic Heading-role title per composition root.
      expect(source, id).toMatch(/<h2 className="type-heading">/)
    }
    const showcase = ["revenue-overview", "upcoming-schedule", "plan-usage", "launch-board", "quick-find", "recent-activity", "room-to-think"].map(module).join("\n")
    // Heading (display numerals/statements), Body (default), and Mono (times, sizes, tags, shortcuts) are all exercised.
    expect(showcase.match(/type-heading text-(2xl|3xl|4xl|sm)/g)!.length).toBeGreaterThanOrEqual(4)
    expect(showcase.match(/font-mono/g)!.length).toBeGreaterThanOrEqual(6)
    // Data colour comes only from the five chart tokens; elevation and radius come from the theme scale.
    for (const token of ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]) expect(showcase).toContain(token)
    expect(showcase).toMatch(/shadow-(xs|sm|md)/)
    expect(showcase).toMatch(/rounded-(sm|md|lg|full)/)
  })

  it("uses container queries inside compositions so cards recompose from their own width", () => {
    for (const id of ["revenue-overview", "launch-board", "room-to-think"]) expect(module(id), id).toMatch(/@container[\s\S]*@(sm|md|lg|xl):grid-cols-/)
  })
})
