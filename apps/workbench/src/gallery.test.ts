import { existsSync, readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { COMPOSITION_IDS, Gallery, PREVIEW_COMPOSITIONS } from "./Gallery"

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
    for (const name of ["productive-week", "plan-usage", "revenue-overview"]) expect(read(`../../../packages/ui/src/compositions/${name}.tsx`)).not.toMatch(/data-layout|PreviewLayout|span 2/)
  })
})

describe("CGS-03/04/06 container-responsive nested gallery (PUI-78, gaps per PUI-81)", () => {
  it("drives the frame from the gallery's own named container with explicit, rebalancing 12-track spans", () => {
    const source = code("./Gallery.tsx")
    expect(source).toContain('data-gallery="cards"')
    expect(source).toContain("@container/gallery")
    expect(source).toContain('"grid grid-cols-1 items-start gap-4 @2xl/gallery:grid-cols-12"')
    // Left smaller / right larger at wide sizes: 6/6, then 5/7, then 4/8. Each pair always fills the 12 tracks.
    expect(source).toContain('side="left" className="@2xl/gallery:col-span-6 @4xl/gallery:col-span-5 @6xl/gallery:col-span-4"')
    expect(source).toContain('side="right" className="@2xl/gallery:col-span-6 @4xl/gallery:col-span-7 @6xl/gallery:col-span-8"')
    expect(source.match(/<Region side=/g)).toHaveLength(2)
  })

  it("makes each region an independent natural-height stack and query container for its local pair", () => {
    const source = code("./Gallery.tsx")
    expect(source).toContain("`@container flex min-w-0 flex-col gap-4 ${className}`")
    expect(source).toContain("`grid min-w-0 grid-cols-1 items-stretch gap-4 [&>[data-composition]>[data-slot=card]]:h-full ${className}`")
    // The local pair switches on its region's width (unnamed nearest container).
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

const MODULES: Record<string, string> = {
  "plan-usage": "plan-usage", "quick-find": "quick-find", "productive-week": "productive-week", "support-request": "support-request",
  "revenue-overview": "revenue-overview", "upcoming-schedule": "upcoming-schedule", "recent-activity": "recent-activity", "launch-board": "launch-board",
}
const module = (id: string) => read(`../../../packages/ui/src/compositions/${MODULES[id]}.tsx`)
const LEFT = ["plan-usage", "quick-find", "productive-week", "support-request"]
const RIGHT = ["revenue-overview", "upcoming-schedule", "recent-activity", "launch-board"]
const REMOVED = { "account-profile": "account-profile", notifications: "notification-preferences", "team-access": "team-access", "workspace-settings": "workspace-settings", "room-to-think": "room-to-think" }
/** The recipe's region bodies, in source order. */
const regions = () => {
  const source = code("./Gallery.tsx")
  const body = (side: string) => source.slice(source.indexOf(`<Region side="${side}"`), source.indexOf("</Region>", source.indexOf(`<Region side="${side}"`)))
  const ids = (text: string) => Array.from(text.matchAll(/<Composition id="([a-z-]+)" \/>/g), match => match[1])
  return { left: ids(body("left")), right: ids(body("right")), pair: ids(source.slice(source.indexOf("<LocalGroup"), source.indexOf("</LocalGroup>"))), source }
}

describe("CGCR-03 exact Cards curation (PUI-83)", () => {
  it("renders exactly the eight curated compositions once, Storage then Quick find leading the left stack", () => {
    expect(COMPOSITION_IDS).toEqual([...LEFT, ...RIGHT])
    const { left, right, pair, source } = regions()
    expect(left).toEqual(LEFT)
    expect(right).toEqual(RIGHT)
    expect(pair).toEqual(["upcoming-schedule", "recent-activity"])
    expect(source.match(/<LocalGroup /g)).toHaveLength(1)
    expect(Object.keys(MODULES).sort()).toEqual([...COMPOSITION_IDS].sort())
  })

  it("removes the five owner-named cards from gallery configuration and rendering only", () => {
    const source = read("./Gallery.tsx")
    const markup = renderToStaticMarkup(createElement(Gallery))
    for (const [id, name] of Object.entries(REMOVED)) {
      expect(source).not.toContain(id)
      expect(source).not.toContain(`compositions/${name}"`)
      expect(markup).not.toContain(`data-composition="${id}"`)
      // Independently used standalone modules and their stories are retained.
      for (const file of [`${name}.tsx`, `${name}.stories.tsx`]) expect(existsSync(new URL(`../../../packages/ui/src/compositions/${file}`, import.meta.url)), file).toBe(true)
    }
    for (const title of ["Account profile", "Notifications", "Team access", "Workspace settings", "Room to think"]) expect(markup).not.toContain(`>${title}<`)
    expect(Array.from(markup.matchAll(/data-composition="([a-z-]+)"/g), match => match[1])).toEqual(COMPOSITION_IDS)
  })
})

describe("CGS-07/08 token-driven showcase (curated set)", () => {
  it("styles every composition with semantic tokens and Theme v3 roles, never raw colours", () => {
    const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
    for (const id of COMPOSITION_IDS) {
      const source = module(id)
      expect(source, id).not.toMatch(rawColour)
      // One h2 per composition root: the Heading role where a title is shown; Studio revenue's is for assistive technology only (PUI-85).
      expect(source, id).toMatch(id === "revenue-overview" ? /<h2 className="sr-only">Studio revenue<\/h2>/ : /<h2 className="type-heading">/)
    }
    const showcase = ["revenue-overview", "upcoming-schedule", "plan-usage", "launch-board", "quick-find", "recent-activity"].map(module).join("\n")
    // Heading (display numerals), Body (default), and Mono (times, sizes, tags, shortcuts) are all exercised. The
    // removed Room to think carried the fourth Heading display size; the curated set has exactly these three.
    expect(showcase.match(/type-heading text-(xl|2xl|3xl|4xl|sm)/g)).toEqual(["type-heading text-xl", "type-heading text-sm", "type-heading text-4xl"])
    expect(showcase.match(/font-mono/g)!.length).toBeGreaterThanOrEqual(6)
    // Data colour comes only from the five chart tokens; elevation and radius come from the theme scale.
    for (const token of ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"]) expect(showcase).toContain(token)
    expect(showcase).toMatch(/shadow-(xs|sm|md)/)
    expect(showcase).toMatch(/rounded-(sm|md|lg|full)/)
  })

  it("uses container queries inside compositions so cards recompose from their own width", () => {
    expect(module("launch-board")).toMatch(/@container[\s\S]*@md:grid-cols-3/)
    expect(module("revenue-overview")).toMatch(/@container[\s\S]*@md:text-2xl/)
  })
})

describe("CGCR-04 stable gallery interaction (PUI-84)", () => {
  const STABLE = ["plan-usage", "quick-find", "support-request", "upcoming-schedule", "launch-board"]
  const markup = (id: string) => {
    const html = renderToStaticMarkup(createElement(Gallery))
    const start = html.indexOf(`data-composition="${id}"`)
    return html.slice(start, html.indexOf("<section data-composition=", start + 1) === -1 ? undefined : html.indexOf("<section data-composition=", start + 1))
  }

  it("renders every interactive survivor through its stable presentation, and nothing else changes presentation", () => {
    const source = code("./Gallery.tsx")
    for (const entry of PREVIEW_COMPOSITIONS) {
      const call = source.slice(source.indexOf(`{ id: "${entry.id}"`), source.indexOf("},", source.indexOf(`{ id: "${entry.id}"`)))
      expect(call.includes(" stable />"), entry.id).toBe(STABLE.includes(entry.id))
    }
    expect(source).toContain("<SupportRequest compact stable />")
    // Each stable prop defaults off, so standalone stories keep the fuller behaviour; a thin Gallery story shows the presentation.
    for (const id of STABLE) {
      expect(module(id), id).toMatch(/\{ stable = false \}|stable = false \}: \{/)
      expect(read(`../../../packages/ui/src/compositions/${MODULES[id]}.stories.tsx`), id).toMatch(/export const Gallery: .*stable: true/)
    }
  })

  it("keeps each stable card's structure fixed: no appended notices, rows, focus blocks, or moving tasks", () => {
    // Storage: the Upgrade status is an always-present visually hidden live region, never an added line.
    expect(markup("plan-usage")).toMatch(/<p role="status" class="sr-only"><\/p>/)
    // Quick find: all five command rows are always rendered; filtering disables rather than removes.
    expect(markup("quick-find").match(/<li>/g)).toHaveLength(5)
    expect(module("quick-find")).toMatch(/\(stable \? COMMANDS : results\)\.map/)
    expect(module("quick-find")).toMatch(/results\.length === 0 && !stable/)
    // This week: the agenda always renders the busiest day's row count, and there is no add action.
    const week = markup("upcoming-schedule")
    expect(week.match(/<li /g)).toHaveLength(3)
    expect(week).not.toContain("Add focus block")
    // Launch checklist: tasks stay in their columns (no advance buttons); the board keeps its progress bar.
    const board = markup("launch-board")
    expect(board).not.toContain("<button")
    expect(board).toContain('role="progressbar"')
    // Support request: validation stays on the field; error and confirmation are announced, not appended; the box keeps its size.
    expect(markup("support-request")).toMatch(/<p role="status" class="sr-only"><\/p>/)
    expect(module("support-request")).toMatch(/className=\{stable \? "sr-only" : undefined\}>Enter a message\./)
    expect(markup("support-request")).toContain("resize-none field-sizing-fixed")
    // No fixed-height shortcut anywhere in the gallery or a stable composition.
    for (const id of STABLE) expect(module(id), id).not.toMatch(/\b(min-)?h-\[\d/)
  })
})

describe("CGCR-05 Studio revenue (PUI-85)", () => {
  const source = () => module("revenue-overview")
  const html = () => renderToStaticMarkup(createElement(Gallery)).split('data-composition="revenue-overview"')[1]!.split("<section data-composition=")[0]!

  it("leads with the range tabs, with no visible title or subtitle", () => {
    expect(source()).not.toMatch(/CardHeader|CardTitle|CardDescription|Income against costs/)
    const content = html()
    // The first rendered child of the card content is the visually hidden heading, then the range tabs.
    expect(content).toMatch(/data-slot="card-content"[^>]*><h2 class="sr-only">Studio revenue<\/h2><div class="flex"><div[^>]*aria-label="Revenue range"/)
    for (const range of ["Week", "Month", "Quarter"]) expect(content).toContain(`>${range}<`)
  })

  it("shows Revenue, Margin, and Invoices paid in one shared, divided row without nested metric cards", () => {
    const content = html()
    expect(content).toMatch(/<dl class="grid grid-cols-3 divide-x divide-border">/)
    expect(Array.from(content.matchAll(/<dt [^>]*>([^<]+)<\/dt>/g), match => match[1])).toEqual(["Revenue", "Margin", "Invoices paid"])
    const metrics = content.slice(content.indexOf("<dl"), content.indexOf("</dl>"))
    expect(metrics).not.toMatch(/rounded-lg border|\bborder p-|bg-card|bg-muted|data-slot="card/)
    // Trend badges remain, one per metric, each on its own line under the value.
    expect(metrics.match(/rounded-full bg-secondary/g)).toHaveLength(3)
  })

  it("draws only the primary Revenue series with x-axis labels, no Costs legend or dashed series", () => {
    expect(source()).not.toMatch(/costs|Costs|strokeDasharray="4 4"|bg-chart-4/)
    expect(source().match(/<Area /g)).toHaveLength(1)
    expect(source()).toContain('<Area dataKey="revenue"')
    expect(source()).toContain('<XAxis dataKey="period"')
    expect(source()).toMatch(/<figcaption className="sr-only">/)
    expect(source()).toContain('revenue: { label: "Revenue", color: "var(--chart-2)" }')
  })
})

describe("CGCR-06/07 gallery gaps and the surviving pair (PUI-81/82)", () => {
  it("uses gap-4 for the frame, both regions, and the local pair at every width", () => {
    const source = code("./Gallery.tsx")
    expect(source).not.toMatch(/gap-(?!4\b)[\w.[\]-]+/)
    expect(source.match(/\bgap-4\b/g)).toHaveLength(3)
  })

  it("stretches only the local pair's card surfaces; everything else keeps natural height", () => {
    const source = code("./Gallery.tsx")
    expect(source.match(/h-full/g)).toHaveLength(1)
    expect(source.match(/items-stretch/g)).toHaveLength(1)
    expect(source).not.toMatch(/\b(min-)?h-\[|\bh-\d|min-h-/)
    // The frame keeps items-start, so regions never share a row height.
    expect(source).toContain("grid grid-cols-1 items-start gap-4 @2xl/gallery:grid-cols-12")
  })
})
