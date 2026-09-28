import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { isMobileShell, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * workbench-gallery-card-polish-v1-001 producer definitions (Lead-executed under playwright.workbench.config.ts at
 * 390x844 and 1440x900; container sweeps run once, in the desktop project). WGCP-03 simplified metadata and the Chat
 * composer (PUI-103), WGCP-04 table checkbox tokens and Body amounts (PUI-104), WGCP-05 Body weather and natural
 * Calendar / Weather heights (PUI-105), WGCP-06 primary thumb and one transport treatment (PUI-106), WGCP-07 the
 * full-bleed revenue chart (PUI-107). Every axe run is decoded: serious/critical findings outside the pre-approved known
 * debt must be empty. No assertion pins a transport control to a pixel size: equality and even rhythm are measured.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const css = (el: Locator, property: string) => el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
const box = async (el: Locator) => (await el.boundingBox())!
const MODES = ["light", "dark"] as const

async function open(page: Page) {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  await expect.poll(() => previewFrame(page).locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `wgcp-${label}`)
  await info.attach(`axe-wgcp-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
  expect(blocking.filter(v => v.impact === "critical" || v.impact === "serious"), label).toEqual([])
}

/** A semantic token resolved to a computed colour inside the preview document. */
const token = (frame: FrameLocator, name: string) => frame.locator("html").evaluate((_, value) => {
  const probe = document.createElement("span")
  probe.style.color = `var(--${value})`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}, name)

/** Every card's outer height, for interaction-stability checks. */
const heights = (frame: FrameLocator) => frame.locator("[data-gallery]").evaluate(gallery => Object.fromEntries(Array.from(gallery.querySelectorAll("[data-composition]"), el => [el.getAttribute("data-composition")!, el.firstElementChild!.getBoundingClientRect().height])))

/** Every rendered text outside visually hidden (sr-only) content, in document order. */
const visibleTexts = (section: Locator) => section.evaluate(root => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const texts: string[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent!.trim() && !node.parentElement!.closest(".sr-only") && node.parentElement!.getClientRects().length) texts.push(node.textContent!.trim())
  return texts
})

/** The first visible (non-sr-only, rendered) text or form control in a composition. */
const firstVisible = (section: Locator) => section.evaluate(root => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement! : node as Element
    if (el.closest(".sr-only") || el.getClientRects().length === 0) continue
    if (node.nodeType === Node.TEXT_NODE && node.textContent!.trim()) return `text:${node.textContent!.trim()}`
    if (el.matches("input, button, [role=slider]")) return `${el.tagName.toLowerCase()}:${el.getAttribute("aria-label") ?? el.getAttribute("placeholder") ?? ""}`
  }
  return null
})

test.describe("WGCP-03 simplified metadata and Chat composer (PUI-103)", () => {
  for (const mode of MODES) {
    test(`Storage, Quick find, Recent activity and Weekly steps keep their purpose without secondary metadata (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const card = (id: string) => frame.locator(`[data-composition="${id}"]`)

      // Storage: title, usage, bar, dots and names; no plan subtitle, no per-category values, no header row gap.
      const storage = card("plan-usage")
      await expect(storage.getByRole("heading", { name: "Storage", level: 2 })).toBeVisible()
      await expect(storage.getByText(/Pro plan|renews|October 31/)).toHaveCount(0)
      await expect(storage.getByText("18.4", { exact: true })).toBeVisible()
      await expect(storage.getByRole("img", { name: "74% of storage used" })).toBeVisible()
      await expect(storage.getByRole("listitem")).toHaveText(["Design files", "Video", "Documents", "Other"])
      for (const value of ["8.6", "5.2", "3.1", "1.5"]) await expect(storage.getByText(value, { exact: true })).toHaveCount(0)
      // Each category keeps its colour dot and name only.
      expect(await storage.getByRole("listitem").evaluateAll(items => items.map(item => [item.children.length, getComputedStyle(item.firstElementChild!).backgroundColor !== "rgba(0, 0, 0, 0)"]))).toEqual(Array(4).fill([2, true]))
      const storageSpace = await storage.evaluate(section => {
        const header = section.querySelector('[data-slot="card-header"]')!, content = section.querySelector('[data-slot="card-content"]')!
        return { header: header.getBoundingClientRect().height, title: section.querySelector("h2")!.closest('[data-slot="card-title"]')!.getBoundingClientRect().height, gap: content.getBoundingClientRect().top - header.getBoundingClientRect().bottom, cardGap: parseFloat(getComputedStyle(section.firstElementChild!).rowGap) }
      })
      // The header is exactly its title (no reserved subtitle row), followed by the card's own gap.
      close(storageSpace.header, storageSpace.title)
      close(storageSpace.gap, storageSpace.cardGap)

      // Quick find: the search field is the first visible content; the heading is visually hidden; search still works.
      const find = card("quick-find")
      for (const text of await visibleTexts(find)) expect(text).not.toMatch(/^Quick find$|Jump anywhere without leaving the keyboard\./)
      await expect(find.getByRole("heading", { name: "Quick find", level: 2 })).toHaveClass(/\bsr-only\b/)
      expect(await firstVisible(find)).toBe("input:Search or type a command")
      const search = find.getByRole("searchbox", { name: "Search commands" })
      await search.focus()
      await page.keyboard.type("export")
      await expect(find.getByRole("button", { name: /Export theme JSON/ })).toBeEnabled()
      await expect(find.getByRole("button", { name: /Edit theme colors/ })).toBeDisabled()
      await search.fill("")

      // Recent activity: title, Today / Yesterday and content; no subtitle and no timestamps.
      const activity = card("recent-activity")
      await expect(activity.getByRole("heading", { name: "Recent activity", level: 2 })).toBeVisible()
      await expect(activity.getByText(/Small steps|^\d\d:\d\d$/)).toHaveCount(0)
      await expect(activity.locator("time, [data-slot=card-description]")).toHaveCount(0)
      await expect(activity.getByRole("heading", { level: 3 })).toHaveText(["Today", "Yesterday"])
      await expect(activity.getByRole("listitem")).toHaveText([/Grace Hopper shipped Theme v3 migration/, /Ada Lovelace commented on Launch checklist/, /Katherine Johnson published Field notes 004/, /Alan Kay joined Studio North/])
      // Each row ends with its content: nothing sits to the right of the activity text.
      for (const row of await activity.getByRole("listitem").all()) expect(await row.evaluate(li => li.children.length)).toBe(2)
      close((await box(activity.locator('[data-slot="card-header"]'))).height, (await box(activity.locator('[data-slot="card-title"]'))).height)

      // Weekly steps: value, copy, comparison and seven bars; no weekday row and no space reserved for it.
      const steps = card("productive-week")
      await expect(steps.getByText("8,357", { exact: true })).toBeVisible()
      await expect(steps.getByText("Average steps this week")).toBeVisible()
      await expect(steps.getByText("+12.4% vs last week")).toBeVisible()
      await expect(steps.locator(".recharts-bar-rectangle")).toHaveCount(7)
      await expect(steps.locator(".recharts-xAxis, .recharts-cartesian-axis-tick-value")).toHaveCount(0)
      const tail = await steps.evaluate(section => {
        const chart = section.querySelector('[data-slot="chart"]')!.getBoundingClientRect()
        const bars = Math.max(...Array.from(section.querySelectorAll(".recharts-bar-rectangle"), bar => bar.getBoundingClientRect().bottom))
        return chart.bottom - bars
      })
      expect(tail).toBeLessThanOrEqual(2)
      await axe(page, info, `metadata-${mode}`)
    })

    test(`Chat has no contact header and a disabled muted named send button inside the composer field (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const chat = frame.locator('[data-composition="team-chat"]')
      await expect(chat.locator('[data-slot="card-header"], [data-slot="avatar"], [data-slot="card-title"]')).toHaveCount(0)
      expect(await visibleTexts(chat)).not.toContain("Maya Chen")
      // The thread is the first visible content, directly after the card's top padding; order and alignment are kept.
      const surface = chat.locator('[data-slot="card"]')
      const log = chat.getByRole("log", { name: "Conversation with Maya Chen" })
      close((await box(log)).y - (await box(surface)).y, parseFloat(await css(surface, "padding-top")) + parseFloat(await css(surface, "border-top-width")))
      const rows = await log.locator('[data-slot="message"]').evaluateAll(nodes => nodes.map(node => [node.getAttribute("data-align"), node.querySelector('[data-slot="bubble"]')!.textContent]))
      expect(rows).toEqual([["start", "Pushed the calmer type scale to preview."], ["end", "Reads well in dark mode too."], ["start", "Can it ride along with Friday's build?"], ["end", "Yes. I'll tag the release."]])

      // Composer: one input-styled field containing the borderless input and, at its far right, the send button.
      const field = chat.locator('[data-slot="chat-composer"]')
      const input = chat.getByRole("textbox", { name: "Message Maya Chen" })
      const send = chat.getByRole("button", { name: "Send message" })
      await expect(input).toHaveAttribute("placeholder", "Type your message...")
      await expect(send).toBeDisabled()
      await expect(send).toHaveText("")
      await expect(send.locator("svg")).toHaveCount(1)
      expect(await send.evaluate(el => el.parentElement!.getAttribute("data-slot"))).toBe("chat-composer")
      expect(await input.evaluate(el => el.parentElement!.getAttribute("data-slot"))).toBe("chat-composer")
      expect(await css(field, "border-top-color")).toBe(await token(frame, "input"))
      expect(await css(input, "border-top-width")).toBe("0px")
      const [f, s, i] = [await box(field), await box(send), await box(input)]
      expect(s.y).toBeGreaterThanOrEqual(f.y)
      expect(s.y + s.height).toBeLessThanOrEqual(f.y + f.height)
      expect(s.x + s.width).toBeLessThanOrEqual(f.x + f.width)
      // Far right: only the field's own border and small end inset remain after the button.
      expect(f.x + f.width - (s.x + s.width)).toBeLessThanOrEqual(parseFloat(await css(field, "padding-right")) + parseFloat(await css(field, "border-right-width")) + 0.5)
      expect(s.x).toBeGreaterThanOrEqual(i.x + i.width - 0.5)
      // Muted: the disabled Button's own opacity over the muted-foreground token, with no filled surface.
      // Polled: the Button's transition-all animates the colour after the preview's first theme message.
      await expect.poll(() => css(send, "color")).toBe(await token(frame, "muted-foreground"))
      expect(Number(await css(send, "opacity"))).toBeLessThan(1)
      expect(await css(send, "background-color")).toBe("rgba(0, 0, 0, 0)")

      // Keyboard: the input is focusable with the field's ring; Enter inserts nothing; Tab skips the disabled button.
      const before = await heights(frame)
      await input.focus()
      await expect.poll(() => css(field, "box-shadow")).toContain("3px")
      expect(await css(field, "border-top-color")).toBe(await token(frame, "ring"))
      await page.keyboard.type("Looks good to me")
      await page.keyboard.press("Enter")
      await expect(log.locator('[data-slot="message"]')).toHaveCount(4)
      await expect(chat.getByText("Looks good to me", { exact: true })).toHaveCount(0)
      await page.keyboard.press("Tab")
      await expect(send).not.toBeFocused()
      expect(await chat.evaluate(el => el.contains(document.activeElement))).toBe(false)
      expect(await heights(frame)).toEqual(before)
      await axe(page, info, `chat-${mode}`)
    })
  }
})

test.describe("WGCP-04 table checkbox tokens and Body amounts (PUI-104)", () => {
  for (const mode of MODES) {
    test(`unchecked input border, primary checked / indeterminate fill, ring focus and Body amounts with stable geometry (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const card = frame.locator('[data-composition="recent-payments"]')
      const table = card.getByRole("table")
      const all = table.getByRole("checkbox", { name: "Select all payments" })
      const rows = table.getByRole("checkbox", { name: /^Select payment from / })
      const boxes = table.getByRole("checkbox")
      await expect(boxes).toHaveCount(6)
      const [input, primary, ring] = [await token(frame, "input"), await token(frame, "primary"), await token(frame, "ring")]
      const columns = () => table.getByRole("columnheader").evaluateAll(heads => heads.map(head => Math.round(head.getBoundingClientRect().width)))
      const layout = { columns: await columns(), heights: await heights(frame) }

      // Unchecked: every header and row checkbox is a 16px native checkbox with an input-token border and no fill.
      for (const checkbox of await boxes.all()) {
        expect(await checkbox.evaluate(el => el.tagName)).toBe("INPUT")
        const b = await box(checkbox)
        close(b.width, 16, 0.5)
        close(b.height, 16, 0.5)
        expect(await css(checkbox, "border-top-color")).toBe(input)
        expect(await css(checkbox, "border-top-width")).toBe("1px")
        await expect(checkbox.locator("xpath=following-sibling::*[1]")).toBeHidden()
      }

      // Checked: primary border and fill with the visible check glyph; the select-all goes indeterminate (primary, minus).
      await rows.first().check()
      await expect(rows.first()).toBeChecked()
      expect(await css(rows.first(), "background-color")).toBe(primary)
      expect(await css(rows.first(), "border-top-color")).toBe(primary)
      await expect(rows.first().locator("xpath=following-sibling::*[1]")).toBeVisible()
      expect(await all.evaluate(el => (el as HTMLInputElement).indeterminate)).toBe(true)
      expect(await css(all, "background-color")).toBe(primary)
      await expect(all.locator("xpath=following-sibling::*[2]")).toBeVisible()
      await expect(all.locator("xpath=following-sibling::*[1]")).toBeHidden()
      // Keyboard: Space on the focused select-all checks every row; its focus outline uses the ring token.
      await rows.first().focus()
      await page.keyboard.press("Shift+Tab")
      await expect(all).toBeFocused()
      await expect.poll(() => all.evaluate(el => el.matches(":focus-visible"))).toBe(true)
      expect(await css(all, "outline-style")).toBe("solid")
      expect(await css(all, "outline-color")).toBe(ring)
      await page.keyboard.press("Space")
      for (const row of await rows.all()) await expect(row).toBeChecked()
      await expect(all).toBeChecked()
      expect(await all.evaluate(el => (el as HTMLInputElement).indeterminate)).toBe(false)
      await all.click()
      for (const row of await rows.all()) await expect(row).not.toBeChecked()
      expect(await css(all, "border-top-color")).toBe(input)

      // Amount: Body family (the document body's), right-aligned, same values; Status and Email typography unchanged.
      const bodyFamily = await frame.locator("body").evaluate(el => getComputedStyle(el).fontFamily)
      const amounts = table.getByRole("row").locator("td:nth-child(4)")
      await expect(amounts).toHaveText(["$316.00", "$242.00", "$837.00", "$874.00", "$721.00"])
      for (const cell of await amounts.all()) {
        expect(await css(cell, "font-family")).toBe(bodyFamily)
        expect(await css(cell, "text-align")).toBe("right")
        expect(await css(cell, "font-size")).toBe(await css(table.getByRole("cell", { name: "ken99@example.com", exact: true }), "font-size"))
      }
      expect(await css(table.getByRole("cell", { name: "ken99@example.com", exact: true }), "font-family")).toBe(bodyFamily)
      expect(await columns()).toEqual(layout.columns)
      expect(await heights(frame)).toEqual(layout.heights)
      expect(await card.locator('[data-slot="table-container"]').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      await axe(page, info, `table-${mode}`)
    })
  }
})

test.describe("WGCP-05 Body weather and natural Calendar / Weather heights (PUI-105)", () => {
  for (const mode of MODES) {
    test(`temperature and place use the Body family at their size and weight; nothing in Weather uses Heading (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const weather = frame.locator('[data-composition="local-weather"]')
      const bodyFamily = await frame.locator("body").evaluate(el => getComputedStyle(el).fontFamily)
      const temperature = weather.locator('[data-slot="card-content"] > div > p').first()
      const place = weather.getByRole("heading", { name: "Lisbon", level: 2 })
      await expect(temperature).toHaveText("Now 21°")
      for (const [el, size] of [[temperature, "48px"], [place, "16px"]] as const) {
        expect(await css(el, "font-family")).toBe(bodyFamily)
        expect(await css(el, "font-size")).toBe(size)
        expect(await css(el, "font-weight")).toBe("600")
      }
      await expect(weather.locator(".type-heading, .font-mono, .type-mono")).toHaveCount(0)
      expect(await weather.evaluate((root, family) => Array.from(root.querySelectorAll("p, span, h2, li")).every(el => getComputedStyle(el).fontFamily === family), bodyFamily)).toBe(true)
      await axe(page, info, `weather-${mode}`)
    })
  }

  test("side by side and stacked, Calendar and Weather each end with their content while Chat / Recent activity still stretch", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    test.setTimeout(90_000)
    await open(page)
    const frame = previewFrame(page)
    const measure = () => frame.locator("html").evaluate(() => {
      const groups = Array.from(document.querySelectorAll("[data-gallery-group]"))
      /** The card's height against the height its content needs: card bottom minus last child bottom, padding, border. */
      const fit = (id: string) => {
        const card = document.querySelector(`[data-composition="${id}"] > [data-slot="card"]`)!
        const s = getComputedStyle(card)
        const last = card.lastElementChild!.getBoundingClientRect()
        const r = card.getBoundingClientRect()
        return { x: r.x, y: r.y, w: r.width, h: r.height, slack: r.bottom - last.bottom - parseFloat(s.paddingBottom) - parseFloat(s.borderBottomWidth) }
      }
      return {
        region: document.querySelector('[data-gallery-region="right"]')!.getBoundingClientRect().width,
        modes: groups.map(group => group.getAttribute("data-gallery-group")),
        align: groups.map(group => getComputedStyle(group).alignItems),
        columns: groups.map(group => getComputedStyle(group).gridTemplateColumns.split(" ").length),
        calendar: fit("offsite-calendar"), weather: fit("local-weather"), chat: fit("team-chat"), activity: fit("recent-activity"),
        overflow: document.documentElement.scrollWidth > innerWidth || Array.from(document.querySelectorAll("[data-composition]")).some(el => el.scrollWidth > el.clientWidth + 1),
      }
    })
    const sweep: Record<string, Awaited<ReturnType<typeof measure>>> = {}
    for (const width of [360, 760, 1160, 1300, 1600]) {
      await frame.locator("[data-gallery]").evaluate((el, w) => { el.style.width = `${w}px` }, width)
      await expect.poll(async () => !(await measure()).overflow).toBe(true)
      sweep[width] = await measure()
    }
    await frame.locator("[data-gallery]").evaluate(el => { el.style.width = "" })
    await info.attach("wgcp-05-pair-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })
    let sideBySide = 0
    for (const [width, m] of Object.entries(sweep)) {
      expect(m.modes, width).toEqual(["stretch", "natural"])
      expect(m.align, width).toEqual(["stretch", "flex-start"])
      // Neither Calendar nor Weather is ever taller than its content, in either arrangement.
      for (const card of [m.calendar, m.weather]) close(card.slack, 0)
      if (m.columns[1] === 2) {
        sideBySide += 1
        close(m.calendar.y, m.weather.y)
        expect(m.calendar.w, width).toBeLessThan(m.weather.w)
        // Independent heights: the two differ (the shorter one is not stretched to the taller).
        expect(Math.abs(m.calendar.h - m.weather.h), width).toBeGreaterThan(1)
      } else close(m.weather.y - (m.calendar.y + m.calendar.h), 16)
      // The Chat / Recent activity pair keeps its equal-height stretch side by side.
      if (m.columns[0] === 2) close(m.chat.h, m.activity.h)
    }
    expect(sideBySide).toBeGreaterThan(0)
    expect(Object.values(sweep).some(m => m.columns[1] === 1)).toBe(true)
    // A taller Calendar never drags Weather along (and vice versa); the chat pair is unaffected.
    await frame.locator("[data-gallery]").evaluate(el => { el.style.width = "1600px" })
    const base = await measure()
    await frame.locator('[data-composition="offsite-calendar"] > [data-slot="card"]').evaluate(el => { (el as HTMLElement).style.minHeight = "700px" })
    const tall = await measure()
    close(tall.weather.h, base.weather.h)
    close(tall.chat.h, base.chat.h)
    await frame.locator('[data-composition="offsite-calendar"] > [data-slot="card"]').evaluate(el => { (el as HTMLElement).style.minHeight = "" })
    await frame.locator("[data-gallery]").evaluate(el => { el.style.width = "" })
  })
})

test.describe("WGCP-06 primary thumb and one transport treatment (PUI-106)", () => {
  for (const mode of MODES) {
    test(`primary thumb with its border and ring; five equal, evenly spaced controls with official outline icons (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const player = frame.locator('[data-composition="now-playing"]')
      const primary = await token(frame, "primary")
      const before = await heights(frame)

      // Thumb: the visible circular fill is the primary token; its primary border, track, range and focus ring remain.
      const thumb = player.getByRole("slider", { name: "Track position" })
      expect(await css(thumb, "background-color")).toBe(primary)
      expect(await css(thumb, "border-top-color")).toBe(primary)
      expect(await css(thumb, "border-radius")).not.toBe("0px")
      expect(await css(player.locator('[data-slot="slider-track"]'), "background-color")).toBe(await token(frame, "muted"))
      expect(await css(player.locator('[data-slot="slider-range"]'), "background-color")).toBe(primary)
      await page.mouse.move(0, 0)
      await thumb.focus()
      await page.keyboard.press("ArrowRight")
      await expect(thumb).toHaveAttribute("aria-valuetext", "1:25 of 3:52")
      await expect.poll(() => css(thumb, "box-shadow")).toMatch(/ 4px/)
      expect(await css(thumb, "background-color")).toBe(primary)
      await expect(player.getByText("1:25", { exact: true })).toBeVisible()

      // Controls: exact order; one ghost treatment (no filled surface, no circle); equal targets; even distribution.
      const row = player.locator("div.grid-cols-5")
      const buttons = row.getByRole("button")
      const shape = () => buttons.evaluateAll(els => els.map(el => {
        const r = el.getBoundingClientRect(), s = getComputedStyle(el), svg = el.querySelector("svg")!
        return { name: el.getAttribute("aria-label"), variant: el.getAttribute("data-variant"), size: el.getAttribute("data-size"), w: r.width, h: r.height, c: r.left + r.width / 2, bg: s.backgroundColor, radius: s.borderTopLeftRadius, border: s.borderTopWidth, icon: svg.getBoundingClientRect().width, fill: getComputedStyle(svg).fill }
      }))
      const controls = await shape()
      await info.attach(`wgcp-06-controls-${mode}.json`, { body: JSON.stringify(controls, null, 2), contentType: "application/json" })
      expect(controls.map(c => c.name)).toEqual(["Shuffle", "Previous track", "Play", "Next track", "Repeat"])
      for (const c of controls) {
        expect(c).toMatchObject({ variant: "ghost", size: controls[0]!.size, bg: "rgba(0, 0, 0, 0)", radius: controls[0]!.radius, border: controls[0]!.border, fill: "none" })
        close(c.w, controls[0]!.w, 0.5)
        close(c.h, controls[0]!.h, 0.5)
        close(c.icon, controls[0]!.icon, 0.5)
        // 24px is the WCAG 2.2 minimum target; the actual size is the system Button size, not a pinned constant.
        expect(c.w).toBeGreaterThanOrEqual(24)
      }
      expect(controls[2]!.radius).not.toBe("9999px")
      const steps = controls.slice(1).map((c, i) => c.c - controls[i]!.c)
      for (const step of steps) close(step, steps[0]!, 1)
      // Frame coordinates throughout (getBoundingClientRect inside the preview document).
      const rowBox = await row.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left, width: r.width } })
      close(controls[0]!.c - rowBox.x, rowBox.x + rowBox.width - controls[4]!.c, 1)

      // Local playback state: Play / Pause switches in place with the same treatment; Shuffle / Repeat toggle.
      await player.getByRole("button", { name: "Play" }).press("Enter")
      await expect(player.getByRole("button", { name: "Pause" })).toBeFocused()
      await expect.poll(() => css(player.getByRole("button", { name: "Pause" }), "box-shadow")).toContain("3px")
      const playing = await shape()
      expect(playing[2]).toMatchObject({ name: "Pause", bg: "rgba(0, 0, 0, 0)", fill: "none" })
      close(playing[2]!.w, controls[2]!.w, 0.5)
      for (const name of ["Shuffle", "Repeat"]) {
        const button = player.getByRole("button", { name })
        await button.click()
        await expect(button).toHaveAttribute("aria-pressed", "true")
        // Measured off hover (the ghost hover colour is the accent foreground).
        await page.mouse.move(0, 0)
        await expect.poll(() => css(button, "color")).toBe(primary)
      }
      await player.getByRole("button", { name: "Next track" }).click()
      await expect(player.getByRole("heading", { level: 2 })).toHaveText("Paper Weather")
      expect(await heights(frame)).toEqual(before)
      await axe(page, info, `music-${mode}`)
    })
  }
})

test.describe("WGCP-07 full-bleed Studio revenue chart (PUI-107)", () => {
  for (const mode of MODES) {
    test(`the chart reaches the card's left, right and bottom inner edges in every range; tabs and metrics stay padded (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const revenue = frame.locator('[data-composition="revenue-overview"]')
      const measure = () => revenue.evaluate(section => {
        const card = section.firstElementChild!, s = getComputedStyle(card), r = card.getBoundingClientRect()
        const inner = { left: r.left + parseFloat(s.borderLeftWidth), right: r.right - parseFloat(s.borderRightWidth), bottom: r.bottom - parseFloat(s.borderBottomWidth) }
        const chart = section.querySelector('[data-slot="chart"]')!.getBoundingClientRect()
        const surface = section.querySelector(".recharts-surface")!.getBoundingClientRect()
        const area = section.querySelector(".recharts-area-area")!.getBoundingClientRect()
        const content = section.querySelector('[data-slot="card-content"]')!, c = getComputedStyle(content)
        const group = section.querySelector('[aria-label="Revenue range"]')!.getBoundingClientRect()
        const metrics = section.querySelector("dl")!.getBoundingClientRect()
        return {
          card: { padding: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft], overflow: s.overflow, radius: s.borderBottomLeftRadius, height: r.height },
          chart: { left: chart.left - inner.left, right: inner.right - chart.right, bottom: inner.bottom - chart.bottom },
          surface: { left: surface.left - inner.left, right: inner.right - surface.right, bottom: inner.bottom - surface.bottom },
          area: { left: area.left - inner.left, right: inner.right - area.right, bottom: inner.bottom - area.bottom },
          content: { padding: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft] },
          inset: { groupLeft: group.left - inner.left, groupTop: group.top - r.top, metricsLeft: metrics.left - inner.left, metricsRight: inner.right - metrics.right },
          caption: section.querySelector("figcaption")!.textContent,
        }
      })
      const month = await measure()
      await info.attach(`wgcp-07-revenue-${mode}.json`, { body: JSON.stringify(month, null, 2), contentType: "application/json" })
      // No uniform outer padding; the card clips to its unchanged radius.
      expect(month.card.padding).toEqual(["0px", "0px", "0px", "0px"])
      expect(month.card.overflow).toBe("hidden")
      expect(month.card.radius).not.toBe("0px")
      // Tabs and metrics keep comfortable padding inside their own wrapper.
      expect(parseFloat(month.content.padding[0]!)).toBeGreaterThanOrEqual(16)
      expect(parseFloat(month.content.padding[3]!)).toBeGreaterThanOrEqual(16)
      expect(month.inset.groupLeft).toBeGreaterThanOrEqual(16)
      expect(month.inset.groupTop).toBeGreaterThanOrEqual(16)
      expect(month.inset.metricsLeft).toBeGreaterThanOrEqual(16)
      expect(month.inset.metricsRight).toBeGreaterThanOrEqual(16)

      for (const [range, first] of [["Week", "Mon"], ["Quarter", "Jul"], ["Month", "W1"]] as const) {
        const m = await measure()
        // The chart container, its SVG surface and the filled area reach the inner left, right and bottom edges.
        for (const part of [m.chart, m.surface, m.area]) { close(part.left, 0); close(part.right, 0); close(part.bottom, 0) }
        close(m.card.height, month.card.height, 0.5)
        await revenue.getByRole("radio", { name: range }).click()
        await expect(revenue.getByRole("radio", { name: range })).toHaveAttribute("aria-checked", "true")
        await expect.poll(async () => (await measure()).caption).toContain(`: ${first} `)
      }
      // Keyboard and focus on the range group are unchanged.
      await revenue.getByRole("radio", { name: "Month" }).focus()
      await page.keyboard.press("ArrowRight")
      await expect(revenue.getByRole("radio", { name: "Quarter" })).toBeFocused()
      await expect.poll(() => css(revenue.getByRole("radio", { name: "Quarter" }), "box-shadow")).toContain("3px")
      await expect(revenue.locator(".recharts-area-curve")).toHaveAttribute("stroke", "var(--color-revenue)")
      await axe(page, info, `revenue-${mode}`)
      await info.attach(`wgcp-07-revenue-${mode}.png`, { body: await revenue.screenshot(), contentType: "image/png" })
    })
  }
})
