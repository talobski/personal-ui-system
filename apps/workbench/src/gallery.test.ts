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

describe("NGIP-03 through NGIP-06 nested gallery", () => {
  it("reproduces the frozen global-row failure independently of the corrected recipe", () => {
    const cells = place(["wide", "default", "wide"], 3)
    expect(cells.map(cell => cell.row)).toEqual([0, 0, 1])
    const weekHeight = 200, profileHeight = 500, gap = 24
    expect(Math.max(weekHeight, profileHeight) + gap - weekHeight).toBe(324)
  })

  it("keeps eight compositions in coherent region order without per-composition placement metadata", () => {
    expect(COMPOSITION_IDS).toEqual(["productive-week", "team-access", "account-profile", "notifications", "support-request", "workspace-settings", "recent-activity", "room-to-think"])
    for (const entry of PREVIEW_COMPOSITIONS) expect(Object.keys(entry)).toEqual(["id", "render"])
    expect(code("./Gallery.tsx")).not.toMatch(/PreviewLayout|data-layout|gridColumn|gridRow|colSpan/)
    for (const name of ["productive-week", "team-access", "workspace-settings"]) expect(read(`../../../packages/ui/src/compositions/${name}.tsx`)).not.toMatch(/data-layout|PreviewLayout|col-span|span 2/)
  })

  it("renders independent activity and profile stacks, a full region, and one intentional local pair", () => {
    const source = code("./Gallery.tsx")
    expect(source).toMatch(/data-gallery-region="activity">\s*<Composition id="productive-week" \/>\s*<Composition id="team-access" \/>/)
    expect(source).toMatch(/data-gallery-region="profile-actions">\s*<Composition id="account-profile" \/>\s*<Composition id="notifications" \/>\s*<Composition id="support-request" \/>/)
    expect(source).toMatch(/<Composition id="workspace-settings" \/>\s*<div className="quiet-gallery-pair"/)
    const css = code("./styles.css")
    expect(css).toContain(".quiet-gallery, .quiet-stack { display: flex; flex-direction: column; gap: 16px; }")
    expect(css).toContain("minmax(0, 7fr) minmax(0, 5fr)")
    expect(css).toContain("@media (min-width: 40rem)")
    expect(css).toContain("@media (min-width: 60rem)")
    expect(css).not.toMatch(/dense|aspect-ratio|grid-auto-rows|masonry|grid-column|grid-row/)
  })
})
