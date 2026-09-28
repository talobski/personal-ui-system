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
    expect(source).toContain("`grid min-w-0 grid-cols-1 ${align} gap-4 ${className}`")
    // PUI-105: stretch is the default; only a pair marked `natural` is start-aligned without the card stretch.
    expect(source).toContain('const align = natural ? "items-start" : "items-stretch [&>[data-composition]>[data-slot=card]]:h-full"')
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
  "plan-usage": "plan-usage", "quick-find": "quick-find", "productive-week": "productive-week", "signup-form": "signup-form", "local-weather": "local-weather",
  "revenue-overview": "revenue-overview", "team-chat": "team-chat", "recent-activity": "recent-activity", "recent-payments": "recent-payments",
  "offsite-calendar": "offsite-calendar", "now-playing": "now-playing", "bitcoin-price": "bitcoin-price",
}
const module = (id: string) => read(`../../../packages/ui/src/compositions/${MODULES[id]}.tsx`)
const LEFT = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing"]
const RIGHT = ["revenue-overview", "bitcoin-price", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "local-weather"]
const REMOVED = {
  "account-profile": "account-profile", notifications: "notification-preferences", "team-access": "team-access", "workspace-settings": "workspace-settings", "room-to-think": "room-to-think",
  "upcoming-schedule": "upcoming-schedule", "launch-board": "launch-board", "support-request": "support-request",
}
/** The recipe's region bodies, in source order. */
const regions = () => {
  const source = code("./Gallery.tsx")
  const body = (side: string) => source.slice(source.indexOf(`<Region side="${side}"`), source.indexOf("</Region>", source.indexOf(`<Region side="${side}"`)))
  const ids = (text: string) => Array.from(text.matchAll(/<Composition id="([a-z-]+)" \/>/g), match => match[1])
  const groups = Array.from(source.matchAll(/<LocalGroup (natural )?className="([^"]+)">([\s\S]*?)<\/LocalGroup>/g), match => ({ natural: Boolean(match[1]), className: match[2]!, ids: ids(match[3]!) }))
  return { left: ids(body("left")), right: ids(body("right")), pair: groups[0]!.ids, groups, source }
}
const section = (id: string) => {
  const html = renderToStaticMarkup(createElement(Gallery))
  const start = html.indexOf(`data-composition="${id}"`)
  const next = html.indexOf("<section data-composition=", start + 1)
  return html.slice(start, next === -1 ? undefined : next)
}

describe("WSCG-11/WGPE-06/11/WBDS-03 twelve-card gallery (PUI-86–92, PUI-97, PUI-108)", () => {
  it("renders exactly the twelve compositions once: Music closes the left region and Calendar / Weather is the second local pair", () => {
    expect(COMPOSITION_IDS).toEqual([...LEFT, ...RIGHT])
    const { left, right, pair, groups, source } = regions()
    expect(left).toEqual(LEFT)
    expect(right).toEqual(RIGHT)
    // Chat replaces This week inside the surviving local pair; the table follows it where Launch checklist was.
    expect(pair).toEqual(["team-chat", "recent-activity"])
    // PUI-97: the only new pair. The calendar keeps its natural (auto) width and Weather takes the residual track, with
    // no fixed percentage or equal columns; below the region's @2xl query both stack. PUI-105: only this pair is natural.
    expect(groups).toEqual([
      { natural: false, className: "@lg:grid-cols-2", ids: ["team-chat", "recent-activity"] },
      { natural: true, className: "@2xl:grid-cols-[auto_minmax(0,1fr)]", ids: ["offsite-calendar", "local-weather"] },
    ])
    expect(source.match(/<LocalGroup /g)).toHaveLength(2)
    expect(source).not.toMatch(/grid-cols-\[\d|%|fr_1fr|grid-cols-\[1fr/)
    expect(Object.keys(MODULES).sort()).toEqual([...COMPOSITION_IDS].sort())
  })

  it("removes replaced and earlier-curated cards from gallery configuration and rendering only", () => {
    const source = read("./Gallery.tsx")
    const markup = renderToStaticMarkup(createElement(Gallery))
    for (const [id, name] of Object.entries(REMOVED)) {
      expect(source).not.toContain(`"${id}"`)
      expect(source).not.toContain(`compositions/${name}"`)
      expect(markup).not.toContain(`data-composition="${id}"`)
      // Independently used standalone modules and their stories are retained.
      for (const file of [`${name}.tsx`, `${name}.stories.tsx`]) expect(existsSync(new URL(`../../../packages/ui/src/compositions/${file}`, import.meta.url)), file).toBe(true)
    }
    for (const title of ["Account profile", "Notifications", "Team access", "Workspace settings", "Room to think", "This week", "Launch checklist", "How can we help?"]) expect(markup).not.toContain(`<h2 class="type-heading">${title}<`)
    expect(Array.from(markup.matchAll(/data-composition="([a-z-]+)"/g), match => match[1])).toEqual(COMPOSITION_IDS)
  })
})

describe("CGS-07/08 token-driven showcase (current set)", () => {
  it("styles every composition with semantic tokens and Theme v3 roles, never raw colours", () => {
    const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/
    const HIDDEN_HEADING = { "revenue-overview": "Studio revenue", "productive-week": "Weekly steps", "recent-payments": "Recent payments", "offsite-calendar": "Offsite dates", "quick-find": "Quick find", "team-chat": "{CONTACT}" } as Record<string, string>
    for (const id of COMPOSITION_IDS) {
      const source = module(id)
      expect(source, id).not.toMatch(rawColour)
      // One h2 per composition: the Heading role where a title is shown, sr-only where the owner removed the title.
      const headings = source.match(/<h2 /g) ?? []
      expect(headings, id).toHaveLength(1)
      if (HIDDEN_HEADING[id]) expect(source, id).toContain(`<h2 className="sr-only">${HIDDEN_HEADING[id]}</h2>`)
      // PUI-105: Weather's place name keeps its size and weight in the Body family instead of the Heading role.
      else if (id === "local-weather") expect(source, id).toContain('<h2 className="max-w-full truncate text-base font-semibold">')
      // PUI-108: the Bitcoin / BTC identifier is a small Body-role label.
      else if (id === "bitcoin-price") expect(source, id).toContain('<h2 className="truncate text-sm font-medium">Bitcoin <span className="text-muted-foreground">BTC</span></h2>')
      else expect(source, id).toMatch(/<h2 className="type-heading[ "]/)
    }
    const showcase = COMPOSITION_IDS.map(module).join("\n")
    // Heading (display numerals), Body (default), and Mono (shortcut keycaps) are all exercised. PUI-99 moves the music
    // times to Body and PUI-100 drops the weather's mono hour strip; PUI-103 removes the Storage values and activity
    // times, PUI-104 moves Amount to Body and PUI-105 moves the weather temperature to Body, so Mono remains on keycaps.
    expect(showcase.match(/type-heading text-(4xl|5xl)/g)).toHaveLength(2)
    expect(showcase.match(/font-mono/g)).toHaveLength(2)
    expect(module("quick-find").match(/font-mono/g)).toHaveLength(2)
    for (const token of ["chart-1", "chart-2", "chart-3", "chart-4"]) expect(showcase).toContain(token)
    expect(showcase).toMatch(/shadow-(xs|sm|md)/)
    expect(showcase).toMatch(/rounded-(sm|md|lg|full)/)
  })

  it("uses container queries inside compositions so cards recompose from their own width", () => {
    expect(module("revenue-overview")).toMatch(/@container[\s\S]*@md:text-2xl/)
    // PUI-97: the calendar card is the calendar alone; its pair recomposes from the region's container width instead.
    expect(code("./Gallery.tsx")).toContain('<LocalGroup natural className="@2xl:grid-cols-[auto_minmax(0,1fr)]">')
  })
})

describe("CGCR-04 stable gallery interaction (PUI-84, carried forward)", () => {
  it("keeps Quick find on its stable presentation and every other card stable by construction", () => {
    const source = code("./Gallery.tsx")
    for (const entry of PREVIEW_COMPOSITIONS) {
      const call = source.slice(source.indexOf(`{ id: "${entry.id}"`), source.indexOf("},", source.indexOf(`{ id: "${entry.id}"`)))
      expect(call.includes(" stable />"), entry.id).toBe(entry.id === "quick-find")
    }
    expect(module("quick-find")).toMatch(/\{ stable = false \}|stable = false \}: \{/)
    expect(section("quick-find").match(/<li>/g)).toHaveLength(5)
    for (const id of COMPOSITION_IDS) expect(module(id), id).not.toMatch(/\b(min-)?h-\[\d/)
  })
})

describe("WSCG-03/WGCP-03 Storage without promotion (PUI-86, PUI-103)", () => {
  it("ends after the category breakdown with no CTA, button, state, or stable variant", () => {
    const source = module("plan-usage")
    expect(source).not.toMatch(/Team plan|100 GB and shared libraries|Upgrade|Sparkles|<Button|useState|shadow-md|stable|role="status"/)
    const html = section("plan-usage")
    for (const text of [">Storage<", ">18.4<", "of 25 GB used", ">Design files<", ">Video<", ">Documents<", ">Other<"]) expect(html).toContain(text)
    // PUI-103: no plan/renewal subtitle and no per-category values.
    for (const text of ["Pro plan", "renews", "October 31", ">8.6<", ">5.2<", ">3.1<", ">1.5<", 'data-slot="card-description"']) expect(html, text).not.toContain(text)
    expect(html).toContain('role="img" aria-label="74% of storage used"')
    // The breakdown list is the card content's last child.
    expect(html).toMatch(/<\/ul><\/div><\/div><\/section>$/)
    expect(html).not.toContain("<button")
  })
})

describe("CGCR-05/WSCG-04 Studio revenue (PUI-85, PUI-87)", () => {
  const source = () => module("revenue-overview")
  const html = () => section("revenue-overview")

  it("leads with the range tabs, with no visible title or subtitle", () => {
    expect(source()).not.toMatch(/CardHeader|CardTitle|CardDescription|Income against costs/)
    expect(html()).toMatch(/data-slot="card-content"[^>]*><h2 class="sr-only">Studio revenue<\/h2><div class="flex"><div[^>]*aria-label="Revenue range"/)
    for (const range of ["Week", "Month", "Quarter"]) expect(html()).toContain(`>${range}<`)
  })

  it("shows Revenue, Margin, and Invoices paid in one shared, divided row without nested metric cards", () => {
    const content = html()
    expect(content).toMatch(/<dl class="grid grid-cols-3 divide-x divide-border">/)
    expect(Array.from(content.matchAll(/<dt [^>]*>([^<]+)<\/dt>/g), match => match[1])).toEqual(["Revenue", "Margin", "Invoices paid"])
    const metrics = content.slice(content.indexOf("<dl"), content.indexOf("</dl>"))
    expect(metrics).not.toMatch(/rounded-lg border|\bborder p-|bg-card|bg-muted|data-slot="card/)
    expect(metrics.match(/rounded-full bg-secondary/g)).toHaveLength(3)
  })

  it("draws only the primary Revenue series over a hidden category axis, keeping the period text summary", () => {
    expect(source()).not.toMatch(/costs|Costs|strokeDasharray="4 4"|bg-chart-4/)
    expect(source().match(/<Area /g)).toHaveLength(1)
    expect(source()).toContain('<Area dataKey="revenue"')
    // PUI-87: no visible tick row and no reserved axis height in any range; the scale keeps tooltip period labels.
    // PUI-107: the hidden scale no longer pads the first and last period in from the card edges.
    expect(source()).toContain('<XAxis dataKey="period" hide />')
    expect(source()).not.toMatch(/tickLine|tickMargin|tickFormatter|<YAxis/)
    expect(source()).toMatch(/<figcaption className="sr-only">\s*Revenue \{data\.label\}: \{data\.points\.map/)
    expect(source()).toContain('revenue: { label: "Revenue", color: "var(--chart-2)" }')
    // PUI-103: the weekly steps chart likewise keeps its day axis only as a hidden scale.
    expect(module("productive-week")).toContain('<XAxis dataKey="day" hide />')
  })
})

describe("WSCG-05 weekly steps (PUI-89)", () => {
  it("replaces the productivity framing with a Heading-role four-digit average, label and positive delta", () => {
    const source = module("productive-week")
    expect(source).not.toMatch(/A productive week|Your workspace, at a glance|tasks completed|CardHeader|CardTitle|CardDescription/)
    const html = section("productive-week")
    const value = html.match(/<span class="type-heading text-4xl tabular-nums">([^<]+)<\/span>/)![1]!
    expect(value).toMatch(/^[89],\d{3}$/)
    expect(html).toContain("Average steps this week")
    expect(html).toMatch(/\+\d+(\.\d)?% vs last week/)
    expect(html).toMatch(/<h2 class="sr-only">Weekly steps<\/h2>/)
    expect(html.indexOf("Weekly steps")).toBeLessThan(html.indexOf(value))
  })

  it("keeps seven plausible daily bars on chart tokens with M–S labels and a text summary", () => {
    const source = module("productive-week")
    const steps = Array.from(source.matchAll(/steps: (\d+) \}/g), match => Number(match[1]))
    expect(steps).toHaveLength(7)
    for (const count of steps) { expect(count).toBeGreaterThanOrEqual(4000); expect(count).toBeLessThanOrEqual(14000) }
    expect(source).toContain("var(--chart-${entry.steps === busiest ? 2 : 3})")
    expect(source).toMatch(/<figcaption className="sr-only">Daily steps Monday through Sunday/)
    expect(source).toContain("accessibilityLayer")
  })
})

describe("WSCG-06/WGPE-03/WGCP-03 chat conversation (PUI-88, PUI-95, PUI-103)", () => {
  it("builds a static two-party thread from official Message and Bubble parts with no contact header", () => {
    const source = module("team-chat")
    expect(source).toContain('from "../components/message"')
    expect(source).toContain('from "../components/bubble"')
    // PUI-103: the avatar/name header and its divider are removed; the heading stays for assistive technology only.
    expect(source).not.toMatch(/components\/avatar|<Avatar|CardHeader|border-b/)
    // No second chat architecture, no insertion, streaming, timers or per-message metadata parts.
    expect(source).not.toMatch(/useState|useEffect|setInterval|setTimeout|MessageScroller|MessageAvatar|MessageHeader|MessageFooter|<Textarea|CardTitle|CardDescription/)
    const html = section("team-chat")
    expect(html).not.toMatch(/data-slot="card-header"|data-slot="avatar"|border-b/)
    // The card opens on its content: an sr-only heading, then the thread.
    expect(html).toMatch(/^data-composition="team-chat"[^>]*><div data-slot="card"[^>]*><div data-slot="card-content"[^>]*><h2 class="sr-only">Maya Chen<\/h2><div [^>]*role="log" aria-label="Conversation with Maya Chen"/)
    expect(html.match(/data-slot="message" data-align="start"/g)).toHaveLength(2)
    expect(html.match(/data-slot="message" data-align="end"/g)).toHaveLength(2)
    expect(html.match(/data-slot="bubble"/g)).toHaveLength(4)
    // Sender context stays accessible for every turn; only two parties exist.
    expect(html.match(/<span class="sr-only">Maya Chen<\/span>/g)).toHaveLength(2)
    expect(html.match(/<span class="sr-only">You<\/span>/g)).toHaveLength(2)
    for (const text of ["Headings sit at 600 now.", "Jonah", ">Read<", "Delivered", "09:4", "<time", "This week", "@example"]) expect(html, text).not.toContain(text)
    expect(html).not.toMatch(/>Read( \d|<)|data-slot="message-(footer|header|avatar)"/)
  })

  it("ends with a labelled composer whose field holds a disabled, muted, named icon-only send button at its far right", () => {
    const html = section("team-chat")
    const footer = html.slice(html.indexOf('data-slot="card-footer"'))
    expect(footer).toMatch(/<form class="w-full min-w-0">/)
    // PUI-103: one input-styled field (input border, focus ring through :has) contains both the input and the button.
    const field = footer.match(/<div data-slot="chat-composer" class="([^"]+)">/)!
    for (const token of ["flex", "items-center", "rounded-md", "border", "border-input", "has-[input:focus-visible]:border-ring", "has-[input:focus-visible]:ring-[3px]"]) expect(field[1]!.split(" "), token).toContain(token)
    const input = footer.match(/<input [^>]*>/g)!
    expect(input).toHaveLength(1)
    expect(input[0]).toContain('placeholder="Type your message..."')
    const id = input[0]!.match(/id="([^"]+)"/)![1]
    expect(footer).toContain(`for="${id}"`)
    expect(footer).toMatch(/<label [^>]*class="[^"]*sr-only[^"]*"[^>]*>Message Maya Chen<\/label>/)
    expect(input[0]).toMatch(/class="[^"]*\bborder-0\b[^"]*"/)
    // The send button is the field's last element: icon only, disabled, muted, with an accessible name.
    const button = footer.match(/<button [^>]*>/g)!
    expect(button).toHaveLength(1)
    expect(button[0]).toMatch(/type="submit"/)
    expect(button[0]).toMatch(/disabled=""/)
    expect(button[0]).toContain('data-variant="ghost"')
    expect(button[0]).toMatch(/class="[^"]*\btext-muted-foreground\b[^"]*\bdisabled:opacity-50\b|class="[^"]*\bdisabled:opacity-50\b[^"]*\btext-muted-foreground\b/)
    expect(button[0]).toContain('aria-label="Send message"')
    expect(footer).toMatch(/<div data-slot="chat-composer"[^>]*><input [^>]*><button [^>]*aria-label="Send message"[^>]*><svg [^>]*aria-hidden="true"[^>]*>[\s\S]*<\/svg><\/button><\/div><\/form><\/div><\/div><\/section>$/)
    expect(module("team-chat")).toContain("onSubmit={event => event.preventDefault()}")
  })
})

describe("WSCG-07/WGPE-04/WGCP-04 compact table (PUI-90, PUI-96, PUI-104)", () => {
  it("sits flush in its card: only the card's py-6 and the content's px-6 are overridden, cells keep their padding", () => {
    const source = module("recent-payments")
    expect(source).toContain('<Card className="overflow-hidden py-0">')
    expect(source).toContain('<CardContent className="px-0">')
    // Ordinary Table cell padding is never zeroed.
    expect(source.match(/\b(p|pl|pr|px|py)-0\b/g)).toEqual(["py-0", "px-0"])
    expect(source).not.toMatch(/tanstack|DropdownMenu|<Input|Previous|Next|row\(s\) selected|Columns|selected-summary|TableFooter|rounded-full|DOT|bg-chart/)
    expect(source).not.toMatch(/from "\.\.\/components\/checkbox"/)
  })

  it("keeps Status, Email and Amount over five rows between a select column and a blank-headed action column", () => {
    const html = section("recent-payments")
    const heads = Array.from(html.matchAll(/<th [^>]*>([\s\S]*?)<\/th>/g), match => match[1]!)
    expect(heads).toHaveLength(5)
    expect(heads[0]).toMatch(/^<span class="inline-grid size-4 align-middle[^"]*"><input [^>]*type="checkbox"[^>]*aria-label="Select all payments"/)
    expect(heads.slice(1, 4)).toEqual(["Status", "Email", "Amount"])
    // The far-right header is truly blank: no text, icon, button or sr-only label.
    expect(heads[4]).toBe("")
    expect(html.match(/data-slot="table-row"/g)).toHaveLength(6)
    const rows = html.slice(html.indexOf('data-slot="table-body"'))
    expect(rows.match(/<input [^>]*type="checkbox"/g)).toHaveLength(5)
    for (const email of ["ken99@example.com", "abe45@example.com", "monserrat44@example.com", "silas22@example.com", "carmella@example.com"]) {
      expect(rows).toContain(`aria-label="Select payment from ${email}"`)
      expect(rows).toContain(`aria-label="Actions for ${email}"`)
    }
    expect(rows.match(/<button /g)).toHaveLength(5)
    expect(html.match(/<button /g)).toHaveLength(5)
    for (const status of ["Success", "Processing", "Failed"]) expect(rows).toContain(`>${status}<`)
    // PUI-104: Amount values keep their formatting and right alignment in the Body family (no Mono).
    const amounts = Array.from(rows.matchAll(/<td data-slot="table-cell" class="([^"]*)">(\$[\d,.]+)<\/td>/g), match => [match[1]!, match[2]!])
    expect(amounts.map(([, amount]) => amount)).toEqual(["$316.00", "$242.00", "$837.00", "$874.00", "$721.00"])
    for (const [classes] of amounts) { expect(classes).toMatch(/\btext-right\b/); expect(classes).toMatch(/\btabular-nums\b/); expect(classes).not.toMatch(/font-mono|type-mono|text-xs/) }
    expect(html).toMatch(/<caption data-slot="table-caption" class="[^"]*sr-only[^"]*">/)
    // A fixed layout with truncating text cells: the official overflow container can never become a scroll region.
    expect(html).toMatch(/<table data-slot="table" class="[^"]*table-fixed/)
    expect(html.match(/data-slot="table-cell" class="[^"]*truncate/g)).toHaveLength(15)
    expect(html.match(/data-slot="table-head" class="[^"]*truncate/g)).toHaveLength(3)
  })
})

describe("WSCG-08 signup form (PUI-91)", () => {
  it("adapts only the official block's form to one card, with no auth, media panel or validation region", () => {
    const source = module("signup-form")
    expect(source).not.toMatch(/fetch\(|https?:\/\/|<img|min-h-|svh|md:grid-cols-2|FieldError|aria-invalid/)
    const html = section("signup-form")
    for (const text of [">Create your account<", "Fill in the form below to create your account", ">Email<", ">Password<", ">Confirm Password<", "Must be at least 8 characters long.", ">Create Account<", ">Or continue with<", "GitHub", "Google", "Already have an account? <a"]) expect(html).toContain(text)
    expect(html.match(/<input /g)).toHaveLength(3)
    expect(html).toContain('<p role="status" class="sr-only"></p>')
    expect(html).toMatch(/novalidate=""/i)
  })
})

describe("WSCG-09/WGPE-06 calendar only (PUI-92, PUI-97)", () => {
  it("renders one single-month range Calendar with a deterministic start, middle and end and fixed weeks, and nothing else", () => {
    const source = module("offsite-calendar")
    expect(source.match(/<Calendar /g)).toHaveLength(1)
    expect(source).toContain('mode="range" numberOfMonths={1} fixedWeeks')
    expect(source).not.toMatch(/new Date\(\)|Date\.now|CardHeader|CardTitle|CardDescription|<dl|Starts|Ends|Length/)
    const html = section("offsite-calendar")
    expect(html.match(/role="grid"/g)).toHaveLength(1)
    expect(html.match(/data-range-start="true"/g)).toHaveLength(1)
    expect(html.match(/data-range-middle="true"/g)).toHaveLength(3)
    expect(html.match(/data-range-end="true"/g)).toHaveLength(1)
    expect(html.match(/<tr[^>]*class="[^"]*rdp-week(?![a-z_])/g)).toHaveLength(6)
    for (const text of ["Studio offsite", "Pick the days away", "Starts", "Ends", "Length", "Not set"]) expect(html, text).not.toContain(text)
    // Navigation is kept.
    expect(html).toMatch(/aria-label="Go to the Previous Month"|aria-label="Go to the previous month"/i)
  })
})

describe("WSCG-10/WGPE-05 music (PUI-92, PUI-99)", () => {
  it("shows only artwork, title, artist and a far-right favourite for every track", () => {
    const source = module("now-playing")
    const queue = source.slice(source.indexOf("const QUEUE"), source.indexOf("] as const"))
    const tracks = Array.from(queue.matchAll(/\{ ([^}]+) \}/g), match => Array.from(match[1]!.matchAll(/(\w+):/g), key => key[1]))
    expect(tracks).toHaveLength(3)
    for (const keys of tracks) expect(keys).toEqual(["title", "artist", "duration", "position"])
    expect(source).not.toMatch(/Now playing|NOW PLAYING|Side [AB]|album|\b0\d \/ 0\d\b|index \+ 1|font-mono/i)
    const html = section("now-playing")
    const meta = html.slice(0, html.indexOf('role="slider"'))
    expect(meta).toMatch(/<h2 class="type-heading truncate text-lg">Slow Light<\/h2><p class="truncate text-sm text-muted-foreground">Harbor Lines<\/p><\/div><button [^>]*aria-label="Favorite" aria-pressed="true"/)
  })

  it("puts Body-role elapsed and remaining times above the slider, then five equal controls in the owner's order", () => {
    const html = section("now-playing")
    const times = html.indexOf('<div class="flex justify-between text-xs text-muted-foreground tabular-nums"><span>1:24</span><span>-2:28</span></div>')
    expect(times).toBeGreaterThan(-1)
    expect(times).toBeLessThan(html.indexOf('role="slider"'))
    const row = html.slice(html.indexOf('<div class="grid grid-cols-5 items-center justify-items-center">'))
    expect(row.length).toBeLessThan(html.length)
    const buttons = Array.from(row.matchAll(/<button [^>]*>/g), match => match[0])
    expect(buttons.map(button => button.match(/aria-label="([^"]+)"/)![1])).toEqual(["Shuffle", "Previous track", "Play", "Next track", "Repeat"])
    // PUI-106: one treatment at one system size (no pinned pixel constant): every control is the ghost icon-lg Button.
    for (const button of buttons) {
      expect(button).toContain('data-variant="ghost"')
      expect(button).toContain('data-size="icon-lg"')
    }
    expect(buttons[0]).toContain('aria-pressed="false"')
    expect(buttons[4]).toContain('aria-pressed="false"')
  })
})

describe("WSCG-10/WGPE-07/WGCP-05 weather (PUI-92, PUI-100, PUI-105)", () => {
  it("is a two-zone summary and five-day forecast with no removed content", () => {
    const source = module("local-weather")
    expect(source).not.toMatch(/MapPin|Wind|Droplets|Sunset|Humidity|HOURS|Now"|14:00|Sample forecast|not live|CardHeader|CardDescription|divide-x/)
    const html = section("local-weather")
    const [top, bottom] = html.split("<ol ")
    // Top: icon, large temperature, stacked high/low, then place and condition right-aligned. PUI-105: temperature and
    // place keep their size and semibold weight in the Body family; nothing in the card uses the Heading role.
    expect(top).toMatch(/<svg [^>]*aria-hidden="true"[\s\S]*<p class="shrink-0 text-5xl font-semibold tabular-nums"><span class="sr-only">Now <\/span>21°<\/p><p class="grid shrink-0 text-xs text-muted-foreground tabular-nums"><span>H 24°<\/span><span>L 16°<\/span><\/p><div class="ml-auto grid min-w-0 justify-items-end text-right"><h2 class="max-w-full truncate text-base font-semibold">Lisbon<\/h2><p [^>]*>Partly cloudy<\/p><\/div>/)
    expect(source).not.toMatch(/type-heading|type-mono|font-mono|font-serif/)
    // Bottom: evenly distributed columns of day, icon, high and low only.
    expect(bottom).toMatch(/^aria-label="Five-day forecast" class="grid grid-cols-5 gap-1">/)
    const days = bottom!.split("<li ").slice(1)
    expect(days).toHaveLength(5)
    for (const day of days) {
      const visible = day.replace(/<span class="sr-only">[^<]*<\/span>/g, "")
      expect(Array.from(visible.matchAll(/>([^<]+)</g), match => match[1]).filter(text => text.trim())).toEqual([expect.stringMatching(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/), expect.stringMatching(/^\d+°$/), expect.stringMatching(/^\d+°$/)])
      expect(day.match(/<svg /g)).toHaveLength(1)
    }
    expect(html).not.toMatch(/<button|<input|<hr|data-slot="separator"/)
  })

  it("keeps music and weather local, deterministic and free of external effects", () => {
    for (const id of ["now-playing", "local-weather"]) {
      const source = module(id)
      expect(source, id).not.toMatch(/fetch\(|https?:\/\/|<audio|new Audio|geolocation|navigator\.|setInterval|setTimeout|new Date\(|Date\.now|Math\.random|localStorage|live data/)
    }
    expect(section("now-playing")).toContain('role="slider"')
    expect(module("now-playing")).toContain('from "../components/slider"')
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

describe("WGCP-03 simplified metadata (PUI-103)", () => {
  it("makes the Quick find search field the first visible content, keeping its label, rows and keycaps", () => {
    const source = module("quick-find")
    expect(source).not.toMatch(/CardHeader|CardTitle|CardDescription|Jump anywhere without leaving the keyboard\./)
    const html = section("quick-find")
    expect(html).not.toContain('<h2 class="type-heading">Quick find</h2>')
    // Card content opens with the sr-only heading and label, then the search field.
    expect(html).toMatch(/<div data-slot="card"[^>]*><div data-slot="card-content" class="[^"]*"><h2 class="sr-only">Quick find<\/h2><label [^>]*class="sr-only">Search commands<\/label><div class="flex h-9 [^"]*"><svg /)
    expect(html).toMatch(/<input [^>]*type="search"[^>]*placeholder="Search or type a command"/)
    expect(html.match(/<kbd /g)!.length).toBeGreaterThanOrEqual(6)
  })

  it("keeps Recent activity's title, day groups and content with no subtitle or timestamps", () => {
    const source = module("recent-activity")
    expect(source).not.toMatch(/CardDescription|Small steps, steady progress\.|<time|time: /)
    const html = section("recent-activity")
    expect(html).toContain('<h2 class="type-heading">Recent activity</h2>')
    for (const text of ["Small steps", "10:42", "09:15", "16:08", "14:18", "<time", 'data-slot="card-description"']) expect(html, text).not.toContain(text)
    expect(Array.from(html.matchAll(/<section aria-label="([^"]+)"/g), match => match[1])).toEqual(["Today", "Yesterday"])
    for (const text of ["Grace Hopper", "Theme v3 migration", "Ada Lovelace", "Launch checklist", "Katherine Johnson", "Field notes 004", "Alan Kay", "Studio North"]) expect(html).toContain(text)
    expect(html.match(/<li class="grid grid-cols-\[auto_minmax\(0,1fr\)\] items-start gap-3">/g)).toHaveLength(4)
  })

  it("closes the header gap left by the removed subtitles", () => {
    // The official CardHeader declares two rows; a title-only header collapses to one so no row gap remains.
    for (const id of ["plan-usage", "recent-activity"]) {
      expect(module(id), id).toContain('<CardHeader className="grid-rows-none">')
      expect(section(id), id).toMatch(/data-slot="card-header" class="[^"]*\bgrid-rows-none\b/)
      expect(section(id), id).not.toMatch(/grid-rows-\[auto_auto\]/)
    }
  })

  it("draws the weekly steps without weekday labels or their reserved row, keeping value, copy, comparison and seven bars", () => {
    const source = module("productive-week")
    expect(source).toContain('<XAxis dataKey="day" hide />')
    expect(source).not.toMatch(/tickFormatter|tickMargin|tickLine|interval=/)
    expect(source).toContain('<Bar dataKey="steps"')
    expect(source.match(/\{ day: "(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day", steps: \d+ \}/g)).toHaveLength(7)
    const html = section("productive-week")
    expect(html).toContain("Average steps this week")
    expect(html).toMatch(/\+\d+(\.\d)?% vs last week/)
  })
})

describe("WGCP-04 table checkbox tokens (PUI-104)", () => {
  it("draws every checkbox with the input border unchecked and primary when checked or indeterminate, keeping size and focus", () => {
    const html = section("recent-payments")
    const boxes = Array.from(html.matchAll(/<span class="inline-grid size-4 align-middle[^"]*"><input ([^>]*)>(<svg [\s\S]*?<\/svg>)(<svg [\s\S]*?<\/svg>)<\/span>/g))
    expect(boxes).toHaveLength(6)
    for (const [, input, check, minus] of boxes) {
      expect(input).toContain('type="checkbox"')
      const classes = input!.match(/class="([^"]+)"/)![1]!.split(" ")
      for (const token of ["size-4", "appearance-none", "border", "border-input", "checked:border-primary", "checked:bg-primary", "indeterminate:border-primary", "indeterminate:bg-primary", "outline-ring", "focus-visible:outline-2", "focus-visible:outline-offset-2"]) expect(classes, token).toContain(token)
      expect(classes.filter(token => /^border-(?!input$)/.test(token))).toEqual([])
      // Official lucide glyphs, hidden from assistive technology, shown only for their state.
      expect(check).toMatch(/lucide-check[\s\S]*aria-hidden="true"|aria-hidden="true"[\s\S]*lucide-check/)
      expect(check).toContain("peer-checked:visible")
      expect(minus).toMatch(/lucide-minus/)
      expect(minus).toContain("peer-indeterminate:visible")
    }
    // The select-all keeps its indeterminate wiring.
    expect(module("recent-payments")).toContain("selectAll.current.indeterminate = some")
  })
})

describe("WGCP-05 Calendar / Weather natural heights (PUI-105)", () => {
  it("start-aligns only the Calendar / Weather pair with no card stretch; Chat / Recent activity keeps its stretch", () => {
    const markup = renderToStaticMarkup(createElement(Gallery))
    const groups = Array.from(markup.matchAll(/<div data-gallery-group="(\w+)" class="([^"]+)">/g), match => ({ mode: match[1], classes: match[2]!.replace(/&gt;/g, ">").replace(/&amp;/g, "&").split(" ") }))
    expect(groups.map(group => group.mode)).toEqual(["stretch", "natural"])
    expect(groups[0]!.classes).toEqual(expect.arrayContaining(["items-stretch", "[&>[data-composition]>[data-slot=card]]:h-full", "@lg:grid-cols-2"]))
    expect(groups[1]!.classes).toEqual(expect.arrayContaining(["items-start", "@2xl:grid-cols-[auto_minmax(0,1fr)]"]))
    expect(groups[1]!.classes.join(" ")).not.toMatch(/items-stretch|h-full|min-h-|\bh-\d|h-\[/)
    // Neither card sets its own height; Weather no longer spreads its zones through a stretched height.
    for (const id of ["offsite-calendar", "local-weather"]) expect(module(id), id).not.toMatch(/\bh-full\b|min-h-|flex-1|justify-evenly|self-stretch|\bh-\d|h-\[/)
  })
})

describe("WGCP-06 music controls and thumb (PUI-106)", () => {
  it("fills the slider thumb with primary through the official Slider's own slot, keeping its border, focus ring and track", () => {
    const source = module("now-playing")
    expect(source).toContain('<Slider className="[&_[data-slot=slider-thumb]]:bg-primary"')
    const slider = read("../../../packages/ui/src/components/slider.tsx")
    expect(slider).toContain('data-slot="slider-thumb"')
    expect(slider).toMatch(/border-primary bg-background[^"]*focus-visible:ring-4/)
  })

  it("renders five identical ghost controls at one system size, evenly distributed, with official unfilled icons", () => {
    const source = module("now-playing")
    expect(source).toContain('const CONTROL = { variant: "ghost", size: "icon-lg" } as const')
    expect(source.match(/<Button \{\.\.\.CONTROL\} /g)).toHaveLength(5)
    // No special Play/Pause treatment, filled glyphs, fabricated SVG paths or pinned control dimensions.
    const transport = source.slice(source.indexOf('<div className="grid grid-cols-5'))
    expect(transport).not.toMatch(/rounded-full|fill-current|size-10|size-\[|h-10|w-10/)
    expect(source).not.toMatch(/<svg|<path/)
    expect(source).toMatch(/import \{ Heart, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward \} from "lucide-react"/)
    const html = section("now-playing")
    const row = html.slice(html.indexOf('<div class="grid grid-cols-5 items-center justify-items-center">'))
    const buttons = Array.from(row.matchAll(/<button [^>]*>/g), match => match[0])
    expect(buttons).toHaveLength(5)
    // Every class except the pressed-state colour of Shuffle / Repeat is shared by all five.
    const base = (button: string) => button.match(/class="([^"]+)"/)![1]!.split(" ").filter(token => !/^text-(primary|muted-foreground)$/.test(token)).sort().join(" ")
    expect(new Set(buttons.map(base)).size).toBe(1)
    expect(row).not.toMatch(/fill-current|bg-primary/)
  })
})

describe("WGCP-07 full-bleed Studio revenue chart (PUI-107)", () => {
  it("drops the card's uniform padding, pads tabs and metrics in their own wrapper and places the chart outside it", () => {
    const source = module("revenue-overview")
    expect(source).toContain('<Card className="gap-0 overflow-hidden py-0">')
    expect(source).toContain('<CardContent className="@container grid gap-5 pt-6 pb-5">')
    expect(source).not.toMatch(/-m[xytrbl]?-\d|\s-m-/)
    const html = section("revenue-overview")
    const content = html.slice(html.indexOf('data-slot="card-content"'), html.indexOf('data-testid="revenue-chart"'))
    expect(content).toContain('aria-label="Revenue range"')
    expect(content).toContain("</dl></div>")
    // The chart figure is the card's direct last child, after the padded content wrapper.
    expect(html).toMatch(/<\/dl><\/div><figure data-testid="revenue-chart" class="grid">[\s\S]*<\/figure><\/div><\/section>/)
  })

  it("removes the chart's side inset while keeping its data, single series and top separation", () => {
    const source = module("revenue-overview")
    expect(source).toContain("margin={{ top: 8, right: 0, bottom: 0, left: 0 }}")
    expect(source).toContain('<XAxis dataKey="period" hide />')
    expect(source).toContain('<ChartContainer config={config} className="aspect-auto h-40 w-full">')
    expect(source.match(/<Area /g)).toHaveLength(1)
    for (const text of ['week: {', 'month: {', 'quarter: {', '["W1", 38.2]', '["Sep", 177.0]', 'useState<Range>("month")']) expect(source).toContain(text)
  })
})

describe("WBDS-03/04 static Bitcoin 1Y card (PUI-108)", () => {
  const source = () => module("bitcoin-price")
  const html = () => section("bitcoin-price")
  /** The frozen FRED/Coinbase packet table, parsed independently of the composition. */
  const reference = () => Array.from(read("../../../docs/evidence/workbench-bitcoin-designsystem-shells/btc-reference-data.md").matchAll(/^\| (\d{4}-\d{2}-\d{2}) \| (\d+\.\d{2}) \|$/gm), match => ({ date: match[1]!, price: Number(match[2]) }))

  it("sits directly after Studio revenue as a full-width card of the right region", () => {
    const { right, source: gallery } = regions()
    expect(right.slice(0, 2)).toEqual(["revenue-overview", "bitcoin-price"])
    // Not inside a local pair: a direct child of the right region, like Studio revenue.
    const body = gallery.slice(gallery.indexOf('<Region side="right"'), gallery.indexOf("<LocalGroup", gallery.indexOf('<Region side="right"')))
    expect(body).toContain('<Composition id="revenue-overview" />\n          <Composition id="bitcoin-price" />')
    expect(COMPOSITION_IDS.indexOf("bitcoin-price")).toBe(COMPOSITION_IDS.indexOf("revenue-overview") + 1)
  })

  it("uses exactly the thirteen frozen first-of-month observations and the recorded one-year change", async () => {
    const { BTC_FIRST_OF_MONTH_USD, BTC_ONE_YEAR_CHANGE } = await import("@personal-ui/ui/compositions/bitcoin-price")
    const frozen = reference()
    expect(frozen).toHaveLength(13)
    expect(BTC_FIRST_OF_MONTH_USD).toEqual(frozen)
    expect(frozen.every(point => point.date.endsWith("-01"))).toBe(true)
    expect([frozen[0]!.date, frozen[12]!.date]).toEqual(["2025-01-01", "2026-01-01"])
    const change = ((frozen[12]!.price - frozen[0]!.price) / frozen[0]!.price) * 100
    expect(change.toFixed(2)).toBe("-8.52")
    expect(BTC_ONE_YEAR_CHANGE).toBe(-8.52)
    const card = html()
    expect(card).toContain('data-testid="btc-price">$88,642.88</p>')
    expect(card).toMatch(/data-testid="btc-change">.*−8\.52%<span class="sr-only"> over one year<\/span>/)
    // Provenance: the dated source in code and a visible historical note; never a live or "current" claim.
    expect(source()).toContain("FRED series CBBTCUSD")
    expect(source()).toContain("retrieved 2026-09-28 UTC")
    expect(source()).toContain("first calendar day of the month (not a month-end close or monthly average)")
    expect(card).toContain("Historical first-of-month BTC/USD, Jan 1, 2025 – Jan 1, 2026. Source: Coinbase via FRED.")
    expect(card).not.toMatch(/\b(live|current price|real-time|monthly average|close)\b/i)
  })

  it("shows the identifier, fixed 1Y, price and change, then one line with dots and nothing else", () => {
    const card = html()
    expect(card).toContain(">Bitcoin <span class=\"text-muted-foreground\">BTC</span></h2>")
    expect(card).toMatch(/data-testid="btc-range">1Y<span class="sr-only"> range<\/span>/)
    const code = source()
    expect(code).toContain('import { Line, LineChart, XAxis, YAxis } from "recharts"')
    expect(code.match(/<Line /g)).toHaveLength(1)
    expect(code).toContain('<XAxis dataKey="day" hide />')
    expect(code).toMatch(/<YAxis hide domain=/)
    expect(code).toContain('dot={{ r: 2.5, fill: "var(--color-price)", strokeWidth: 0 }}')
    expect(code).toContain('color: "var(--chart-1)"')
    expect(code).not.toMatch(/CartesianGrid|ChartLegend|<Legend|<Area|<Bar|<Button|<button|useState|useEffect|SingleToggleGroup|Tabs/)
    // Static only: no runtime acquisition of any kind.
    expect(code).not.toMatch(/fetch\(|XMLHttpRequest|WebSocket|EventSource|import\(|setInterval|setTimeout|localStorage|process\.env/)
    expect(code.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/https?:\/\//)
    // Accessible summary of every observation.
    const caption = card.slice(card.indexOf("<figcaption"), card.indexOf("</figcaption>"))
    expect(caption.match(/\$\d{2,3},\d{3}\.\d{2}/g)).toHaveLength(13)
    expect(caption).toContain("Jan 1, 2025 $96,903.19")
    expect(caption).toContain("Jan 1, 2026 $88,642.88")
    expect(card).not.toContain("<button")
  })
})
