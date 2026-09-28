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
  "plan-usage": "plan-usage", "quick-find": "quick-find", "productive-week": "productive-week", "signup-form": "signup-form", "local-weather": "local-weather",
  "revenue-overview": "revenue-overview", "team-chat": "team-chat", "recent-activity": "recent-activity", "recent-payments": "recent-payments",
  "offsite-calendar": "offsite-calendar", "now-playing": "now-playing",
}
const module = (id: string) => read(`../../../packages/ui/src/compositions/${MODULES[id]}.tsx`)
const LEFT = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing"]
const RIGHT = ["revenue-overview", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "local-weather"]
const REMOVED = {
  "account-profile": "account-profile", notifications: "notification-preferences", "team-access": "team-access", "workspace-settings": "workspace-settings", "room-to-think": "room-to-think",
  "upcoming-schedule": "upcoming-schedule", "launch-board": "launch-board", "support-request": "support-request",
}
/** The recipe's region bodies, in source order. */
const regions = () => {
  const source = code("./Gallery.tsx")
  const body = (side: string) => source.slice(source.indexOf(`<Region side="${side}"`), source.indexOf("</Region>", source.indexOf(`<Region side="${side}"`)))
  const ids = (text: string) => Array.from(text.matchAll(/<Composition id="([a-z-]+)" \/>/g), match => match[1])
  const groups = Array.from(source.matchAll(/<LocalGroup className="([^"]+)">([\s\S]*?)<\/LocalGroup>/g), match => ({ className: match[1]!, ids: ids(match[2]!) }))
  return { left: ids(body("left")), right: ids(body("right")), pair: groups[0]!.ids, groups, source }
}
const section = (id: string) => {
  const html = renderToStaticMarkup(createElement(Gallery))
  const start = html.indexOf(`data-composition="${id}"`)
  const next = html.indexOf("<section data-composition=", start + 1)
  return html.slice(start, next === -1 ? undefined : next)
}

describe("WSCG-11/WGPE-06/11 eleven-card gallery (PUI-86–92, PUI-97)", () => {
  it("renders exactly the eleven compositions once: Music closes the left region and Calendar / Weather is the second local pair", () => {
    expect(COMPOSITION_IDS).toEqual([...LEFT, ...RIGHT])
    const { left, right, pair, groups, source } = regions()
    expect(left).toEqual(LEFT)
    expect(right).toEqual(RIGHT)
    // Chat replaces This week inside the surviving local pair; the table follows it where Launch checklist was.
    expect(pair).toEqual(["team-chat", "recent-activity"])
    // PUI-97: the only new pair. The calendar keeps its natural (auto) width and Weather takes the residual track, with
    // no fixed percentage or equal columns; below the region's @2xl query both stack.
    expect(groups).toEqual([
      { className: "@lg:grid-cols-2", ids: ["team-chat", "recent-activity"] },
      { className: "@2xl:grid-cols-[auto_minmax(0,1fr)]", ids: ["offsite-calendar", "local-weather"] },
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
    const HIDDEN_HEADING = { "revenue-overview": "Studio revenue", "productive-week": "Weekly steps", "recent-payments": "Recent payments", "offsite-calendar": "Offsite dates" } as Record<string, string>
    for (const id of COMPOSITION_IDS) {
      const source = module(id)
      expect(source, id).not.toMatch(rawColour)
      // One h2 per composition: the Heading role where a title is shown, sr-only where the owner removed the title.
      const headings = source.match(/<h2 /g) ?? []
      expect(headings, id).toHaveLength(1)
      if (HIDDEN_HEADING[id]) expect(source, id).toContain(`<h2 className="sr-only">${HIDDEN_HEADING[id]}</h2>`)
      else expect(source, id).toMatch(/<h2 className="type-heading[ "]/)
    }
    const showcase = COMPOSITION_IDS.map(module).join("\n")
    // Heading (display numerals), Body (default), and Mono (sizes, amounts, shortcuts) are all exercised. PUI-99 moves
    // the music times to Body and PUI-100 drops the weather's mono hour strip, so Mono remains where it is data-like.
    expect(showcase.match(/type-heading text-(4xl|5xl)/g)!.length).toBeGreaterThanOrEqual(3)
    expect(showcase.match(/font-mono/g)!.length).toBeGreaterThanOrEqual(5)
    for (const token of ["chart-1", "chart-2", "chart-3", "chart-4"]) expect(showcase).toContain(token)
    expect(showcase).toMatch(/shadow-(xs|sm|md)/)
    expect(showcase).toMatch(/rounded-(sm|md|lg|full)/)
  })

  it("uses container queries inside compositions so cards recompose from their own width", () => {
    expect(module("revenue-overview")).toMatch(/@container[\s\S]*@md:text-2xl/)
    // PUI-97: the calendar card is the calendar alone; its pair recomposes from the region's container width instead.
    expect(code("./Gallery.tsx")).toContain('<LocalGroup className="@2xl:grid-cols-[auto_minmax(0,1fr)]">')
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

describe("WSCG-03 Storage without promotion (PUI-86)", () => {
  it("ends after the category breakdown with no CTA, button, state, or stable variant", () => {
    const source = module("plan-usage")
    expect(source).not.toMatch(/Team plan|100 GB and shared libraries|Upgrade|Sparkles|<Button|useState|shadow-md|stable|role="status"/)
    const html = section("plan-usage")
    for (const text of [">Storage<", "Pro plan · renews October 31", ">18.4<", "of 25 GB used", ">Design files<", ">Video<", ">Documents<", ">Other<"]) expect(html).toContain(text)
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
    expect(source()).toContain('<XAxis dataKey="period" hide padding={{ left: 12, right: 12 }} />')
    expect(source()).not.toMatch(/tickLine|tickMargin|tickFormatter|<YAxis/)
    expect(source()).toMatch(/<figcaption className="sr-only">\s*Revenue \{data\.label\}: \{data\.points\.map/)
    expect(source()).toContain('revenue: { label: "Revenue", color: "var(--chart-2)" }')
    // Only the Revenue chart changed: the weekly steps chart keeps its weekday tick row.
    expect(module("productive-week")).toContain("tickFormatter={(day: string) => day.slice(0, 1)}")
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

describe("WSCG-06/WGPE-03 chat conversation (PUI-88, PUI-95)", () => {
  it("builds a static two-party thread from official Message, Bubble and Avatar parts under one contact header", () => {
    const source = module("team-chat")
    expect(source).toContain('from "../components/message"')
    expect(source).toContain('from "../components/bubble"')
    expect(source).toContain('from "../components/avatar"')
    // No second chat architecture, no insertion, streaming, timers or per-message metadata parts.
    expect(source).not.toMatch(/useState|useEffect|setInterval|setTimeout|MessageScroller|MessageAvatar|MessageHeader|MessageFooter|<Textarea|CardTitle|CardDescription/)
    const html = section("team-chat")
    const header = html.slice(html.indexOf('data-slot="card-header"'), html.indexOf('data-slot="card-content"'))
    // Header: exactly one avatar and the contact name only; no title, subtitle, email, status or time.
    expect(header.match(/data-slot="avatar"/g)).toHaveLength(1)
    expect(header).toMatch(/<h2 class="type-heading truncate text-base">Maya Chen<\/h2>/)
    expect(header).not.toMatch(/\w@\w|Design review|Maya, Jonah|online|<time/)
    expect(html.match(/data-slot="avatar"/g)).toHaveLength(1)
    expect(html).toContain('role="log" aria-label="Conversation with Maya Chen"')
    expect(html.match(/data-slot="message" data-align="start"/g)).toHaveLength(2)
    expect(html.match(/data-slot="message" data-align="end"/g)).toHaveLength(2)
    expect(html.match(/data-slot="bubble"/g)).toHaveLength(4)
    // Sender context stays accessible for every turn; only two parties exist.
    expect(html.match(/<span class="sr-only">Maya Chen<\/span>/g)).toHaveLength(2)
    expect(html.match(/<span class="sr-only">You<\/span>/g)).toHaveLength(2)
    for (const text of ["Headings sit at 600 now.", "Jonah", ">Read<", "Delivered", "09:4", "<time", "This week", "@example"]) expect(html, text).not.toContain(text)
    expect(html).not.toMatch(/>Read( \d|<)|data-slot="message-(footer|header|avatar)"/)
  })

  it("ends with a labelled composer and a far-right icon-only named send button that never inserts content", () => {
    const html = section("team-chat")
    const footer = html.slice(html.indexOf('data-slot="card-footer"'))
    expect(footer).toMatch(/<form class="flex w-full min-w-0 items-center gap-2">/)
    const input = footer.match(/<input [^>]*>/g)!
    expect(input).toHaveLength(1)
    expect(input[0]).toContain('placeholder="Type your message..."')
    const id = input[0]!.match(/id="([^"]+)"/)![1]
    expect(footer).toContain(`for="${id}"`)
    expect(footer).toMatch(/<label [^>]*class="[^"]*sr-only[^"]*"[^>]*>Message Maya Chen<\/label>/)
    // The send button is the composer's last element: icon only, with an accessible name.
    expect(footer).toMatch(/<button [^>]*type="submit"[^>]*aria-label="Send message"[^>]*><svg [^>]*aria-hidden="true"[^>]*>[\s\S]*<\/svg><\/button><\/form><\/div><\/div><\/section>$/)
    expect(module("team-chat")).toContain("onSubmit={event => event.preventDefault()}")
  })
})

describe("WSCG-07/WGPE-04 compact table (PUI-90, PUI-96)", () => {
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
    expect(heads[0]).toMatch(/^<input [^>]*type="checkbox"[^>]*aria-label="Select all payments"/)
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
    for (const amount of ["$316.00", "$242.00", "$837.00", "$874.00", "$721.00"]) expect(rows).toContain(amount)
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
    for (const button of buttons) {
      expect(button).toContain('data-size="icon-lg"')
      expect(button).toMatch(/class="[^"]*\bsize-10\b/)
    }
    expect(buttons[0]).toContain('aria-pressed="false"')
    expect(buttons[4]).toContain('aria-pressed="false"')
  })
})

describe("WSCG-10/WGPE-07 weather (PUI-92, PUI-100)", () => {
  it("is a two-zone summary and five-day forecast with no removed content", () => {
    const source = module("local-weather")
    expect(source).not.toMatch(/MapPin|Wind|Droplets|Sunset|Humidity|HOURS|Now"|14:00|Sample forecast|not live|CardHeader|CardDescription|divide-x/)
    const html = section("local-weather")
    const [top, bottom] = html.split("<ol ")
    // Top: icon, large temperature, stacked high/low, then place and condition right-aligned.
    expect(top).toMatch(/<svg [^>]*aria-hidden="true"[\s\S]*<p class="type-heading text-5xl shrink-0 tabular-nums"><span class="sr-only">Now <\/span>21°<\/p><p class="grid shrink-0 text-xs text-muted-foreground tabular-nums"><span>H 24°<\/span><span>L 16°<\/span><\/p><div class="ml-auto grid min-w-0 justify-items-end text-right"><h2 class="type-heading max-w-full truncate text-base">Lisbon<\/h2><p [^>]*>Partly cloudy<\/p><\/div>/)
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
