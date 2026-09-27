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
