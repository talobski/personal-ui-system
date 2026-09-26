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

describe("STHG-13 composition footprint contract", () => {
  it("keeps the eight shared compositions in source order with only default | wide footprints", () => {
    expect(COMPOSITION_IDS).toEqual(["productive-week", "account-profile", "team-access", "workspace-settings", "notifications", "support-request", "recent-activity", "room-to-think"])
    expect(new Set(PREVIEW_COMPOSITIONS.map((entry) => entry.layout))).toEqual(new Set(["default", "wide"]))
    expect(PREVIEW_COMPOSITIONS.filter((entry) => entry.layout === "wide").map((entry) => entry.id)).toEqual(["productive-week", "team-access", "workspace-settings"])
  })

  it("owns the footprint in the Workbench composition entry, never in a public resource or shared composition", () => {
    expect(read("./Gallery.tsx")).toContain('export type PreviewLayout = "default" | "wide"')
    expect(code("./Gallery.tsx")).not.toMatch(/colSpan|gridColumn|gridRow|aspect|masonry|tall/i)
    for (const name of ["card", "chart", "field"]) expect(read(`../../../packages/ui/src/components/${name}.tsx`)).not.toMatch(/data-layout|PreviewLayout|"wide"/)
    for (const name of ["productive-week", "team-access", "workspace-settings"]) expect(read(`../../../packages/ui/src/compositions/${name}.tsx`)).not.toMatch(/data-layout|PreviewLayout|col-span|span 2/)
    expect(read("../../../registry.json")).not.toMatch(/PreviewLayout|"layout"/)
  })

  it("renders one source-ordered grid with breakpoints near 40rem and 60rem, row flow, natural heights, and no dense packing", () => {
    const css = read("./styles.css")
    const gallery = css.slice(css.indexOf(".quiet-gallery {"), css.indexOf(".quiet-gallery [data-composition] > [data-slot=card]"))
    expect(gallery).toContain(".quiet-gallery { display: grid; grid-template-columns: minmax(0, 1fr); grid-auto-flow: row; align-items: start; gap: 16px; }")
    expect(gallery).toContain("@media (min-width: 40rem) {\n  .quiet-gallery { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n  .quiet-gallery > [data-layout=wide] { grid-column: span 2; }\n}")
    expect(gallery).toContain("@media (min-width: 60rem) { .quiet-gallery { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; } }")
    expect(code("./styles.css")).not.toMatch(/dense|aspect-ratio|quiet-stack|grid-auto-rows|masonry/)
    expect(read("./Gallery.tsx")).not.toContain("quiet-stack")
  })

  it("places wide entries on 1 / 2 / 2 columns at the 1 / 2 / 3 column layouts in source order", () => {
    const layouts = PREVIEW_COMPOSITIONS.map((entry) => entry.layout)
    expect(place(layouts, 1).every((cell) => cell.span === 1)).toBe(true)
    // Two columns: the wide chart, then Account profile alone (Team access cannot share its row), and so on.
    expect(place(layouts, 2).map((cell) => [cell.row, cell.column, cell.span])).toEqual([[0, 0, 2], [1, 0, 1], [2, 0, 2], [3, 0, 2], [4, 0, 1], [4, 1, 1], [5, 0, 1], [5, 1, 1]])
    // Three columns: one visible gap after Team access is the accepted cost of never reordering (no dense packing).
    expect(place(layouts, 3).map((cell) => [cell.row, cell.column, cell.span])).toEqual([[0, 0, 2], [0, 2, 1], [1, 0, 2], [2, 0, 2], [2, 2, 1], [3, 0, 1], [3, 1, 1], [3, 2, 1]])
  })
})
