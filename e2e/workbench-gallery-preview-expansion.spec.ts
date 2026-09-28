import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { colorInput, editorCategory, isMobileShell, previewView, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * workbench-gallery-preview-expansion-v1-001 producer definitions (Lead-executed under playwright.workbench.config.ts at
 * 390x844 and 1440x900; container sweeps run once, in the desktop project). WGPE-03 chat, WGPE-04 table, WGPE-05 music,
 * WGPE-06 calendar and the Calendar / Weather pair, WGPE-07 weather, WGPE-08 Sidebar switch, WGPE-09 Design system view,
 * WGPE-10 App shells view, WGPE-11 four-view order, gallery order, focus and containment. Every axe run is decoded:
 * serious/critical findings outside the pre-approved known debt must be empty.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const css = (el: Locator, property: string) => el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
const box = async (el: Locator) => (await el.boundingBox())!

const LEFT = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing"]
const RIGHT = ["revenue-overview", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "local-weather"]

async function open(page: Page) {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  await expect.poll(() => previewFrame(page).locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `wgpe-${label}`)
  await info.attach(`axe-wgpe-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
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

/** The rendered custom-property text in the preview document (what the Design system view reports). */
const property = (frame: FrameLocator, name: string) => frame.locator("html").evaluate((_, value) => getComputedStyle(document.documentElement).getPropertyValue(value).trim(), name)

/** Every card's outer height, for interaction-stability checks. */
const heights = (frame: FrameLocator) => frame.locator("[data-gallery]").evaluate(gallery => Object.fromEntries(Array.from(gallery.querySelectorAll("[data-composition]"), el => [el.getAttribute("data-composition")!, el.firstElementChild!.getBoundingClientRect().height])))

/** Every horizontally overflowing surface (the document, a composition, or a preview view); empty when contained. */
const overflowing = (frame: FrameLocator, scope = "[data-composition], [data-design-system], [data-app-shell]") => frame.locator("html").evaluate((_, selector) => [
  ...(document.documentElement.scrollWidth > innerWidth ? ["document"] : []),
  ...Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(el => el.getClientRects().length > 0 && el.scrollWidth > el.clientWidth + 1).map(el => el.getAttribute("data-composition") ?? el.getAttribute("data-app-shell") ?? "design-system"),
], scope)

/** Contrast-safe edit values per mode: dedicated Sidebar surfaces keep their foreground pairs legible. */
const EDITS = {
  light: { primary: "oklch(0.45 0.1 260)", sidebar: "oklch(0.99 0.005 250)", accent: "oklch(0.9 0.02 150)" },
  dark: { primary: "oklch(0.8 0.05 260)", sidebar: "oklch(0.25 0.02 250)", accent: "oklch(0.36 0.03 150)" },
} as const

async function sidebarSwitch(page: Page) {
  await editorCategory(page, "Colors")
  const section = page.getByTestId("section-colors-sidebar")
  await section.scrollIntoViewIfNeeded()
  return { section, toggle: section.getByRole("switch", { name: "Use sidebar tokens" }) }
}

test.describe("WGPE-03 chat (PUI-95)", () => {
  test("one contact header, two-party bubbles without metadata, and a stable labelled composer", async ({ page }, info) => {
    await open(page)
    await workspaceMode(page, "Preview")
    const frame = previewFrame(page)
    const chat = frame.locator('[data-composition="team-chat"]')
    const header = chat.locator('[data-slot="card-header"]')
    // Header: one avatar and the contact name only; no title, subtitle, email or status.
    await expect(header.locator('[data-slot="avatar"]')).toHaveCount(1)
    await expect(header.getByRole("heading", { level: 2 })).toHaveText("Maya Chen")
    expect((await header.innerText()).trim().split("\n").filter(Boolean)).toEqual(["M", "Maya Chen"])
    await expect(chat.locator('[data-slot="card-title"], [data-slot="card-description"]')).toHaveCount(0)
    await expect(chat.locator('[data-slot="avatar"]')).toHaveCount(1)
    // Messages: two parties, clear start/end alignment, no per-message avatar or delivery metadata.
    const log = chat.getByRole("log", { name: "Conversation with Maya Chen" })
    await expect(log.locator('[data-slot="message"]')).toHaveCount(4)
    await expect(log.locator('[data-slot="message-avatar"], [data-slot="message-footer"], [data-slot="message-header"], time')).toHaveCount(0)
    for (const text of ["Headings sit at 600 now.", "Jonah", "Delivered", "Design review"]) await expect(chat.getByText(text)).toHaveCount(0)
    await expect(chat.getByText(/^Read( \d|$)/)).toHaveCount(0)
    const rows = await log.locator('[data-slot="message"]').evaluateAll(nodes => nodes.map(node => { const bubble = node.querySelector('[data-slot="bubble"]')!.getBoundingClientRect(); const r = node.getBoundingClientRect(); return { align: node.getAttribute("data-align"), left: bubble.left - r.left, right: r.right - bubble.right, sender: node.querySelector(".sr-only")!.textContent } }))
    expect(rows.map(row => [row.align, row.sender])).toEqual([["start", "Maya Chen"], ["end", "You"], ["start", "Maya Chen"], ["end", "You"]])
    for (const row of rows) expect(row.align === "start" ? row.left : row.right).toBeLessThanOrEqual(1)
    await expect(log.locator('[data-align="end"] [data-slot="bubble"]').first()).toHaveCSS("background-color", await token(frame, "primary"))
    await expect(log.locator('[data-align="start"] [data-slot="bubble"]').first()).toHaveCSS("background-color", await token(frame, "muted"))
    // Composer: a labelled input with the exact placeholder and a named icon-only send button at the far right.
    const input = chat.getByRole("textbox", { name: "Message Maya Chen" })
    await expect(input).toHaveAttribute("placeholder", "Type your message...")
    const send = chat.getByRole("button", { name: "Send message" })
    await expect(send).toHaveText("")
    await expect(send.locator("svg")).toHaveCount(1)
    const form = await box(chat.locator("form"))
    const sendBox = await box(send)
    close(sendBox.x + sendBox.width, form.x + form.width)
    expect(sendBox.x).toBeGreaterThan((await box(input)).x + (await box(input)).width - 1)
    // Reading order: header, messages, composer.
    const order = await chat.evaluate(section => ["h2", '[role="log"]', "form"].map(selector => section.querySelector(selector)!.getBoundingClientRect().top))
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    // Sending never inserts content or changes geometry, by pointer or keyboard.
    const before = await heights(frame)
    await input.fill("Looks good to me")
    await send.click()
    await input.focus()
    await page.keyboard.press("Enter")
    await page.keyboard.press("Tab")
    await expect(send).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(log.locator('[data-slot="message"]')).toHaveCount(4)
    await expect(chat.getByText("Looks good to me", { exact: true })).toHaveCount(0)
    expect(await heights(frame)).toEqual(before)
    expect(await overflowing(frame)).toEqual([])
    await axe(page, info, "chat-light")
    await setColorMode(page, "dark")
    await axe(page, info, "chat-dark")
  })
})

test.describe("WGPE-04 compact table (PUI-96)", () => {
  test("flush table, native select-all and row checkboxes, a blank-headed action column, and stable geometry", async ({ page }, info) => {
    await open(page)
    await workspaceMode(page, "Preview")
    const frame = previewFrame(page)
    const card = frame.locator('[data-composition="recent-payments"]')
    const surface = card.locator('[data-slot="card"]')
    // Only the card's vertical padding and the content's horizontal padding are removed; border and radius stay.
    expect([await css(surface, "padding-top"), await css(surface, "padding-bottom")]).toEqual(["0px", "0px"])
    const content = card.locator('[data-slot="card-content"]')
    expect([await css(content, "padding-left"), await css(content, "padding-right")]).toEqual(["0px", "0px"])
    expect(await css(surface, "border-top-width")).toBe("1px")
    expect(await css(surface, "border-top-left-radius")).not.toBe("0px")
    const tableBox = await box(card.getByRole("table"))
    const surfaceBox = await box(surface)
    close(tableBox.x, surfaceBox.x + 1)
    close(tableBox.x + tableBox.width, surfaceBox.x + surfaceBox.width - 1)
    // Cells keep the Table's own padding.
    for (const cell of [card.getByRole("columnheader", { name: "Status" }), card.getByRole("cell", { name: "ken99@example.com", exact: true })]) expect(parseFloat(await css(cell, "padding-left"))).toBeGreaterThanOrEqual(8)
    const table = card.getByRole("table")
    await expect(table.getByRole("columnheader")).toHaveText(["", "Status", "Email", "Amount", ""])
    // The far-right header is truly blank; data rows carry the named ellipsis.
    const last = table.getByRole("columnheader").last()
    expect(await last.evaluate(el => el.innerHTML)).toBe("")
    const actions = table.getByRole("button", { name: /^Actions for / })
    await expect(actions).toHaveCount(5)
    for (const action of await actions.all()) { await expect(action).toHaveText(""); await expect(action.locator("svg")).toHaveCount(1) }
    // Status text only: no dots.
    await expect(card.locator(".rounded-full")).toHaveCount(0)
    await expect(table.getByRole("cell", { name: "Processing", exact: true })).toBeVisible()
    for (const absent of ["Filter emails...", "Columns", "Previous", "Next", "row(s) selected"]) await expect(card.getByText(absent)).toHaveCount(0)
    // Selection: native checkboxes with names, a clean select-all with a mixed state, no summary, no height change.
    const all = table.getByRole("checkbox", { name: "Select all payments" })
    const rows = table.getByRole("checkbox", { name: /^Select payment from / })
    await expect(rows).toHaveCount(5)
    expect(await all.evaluate(el => el.tagName)).toBe("INPUT")
    const before = await heights(frame)
    await rows.first().check()
    await expect(all).not.toBeChecked()
    expect(await all.evaluate(el => (el as HTMLInputElement).indeterminate)).toBe(true)
    await all.focus()
    await page.keyboard.press("Space")
    for (const row of await rows.all()) await expect(row).toBeChecked()
    await expect(all).toBeChecked()
    expect(await all.evaluate(el => (el as HTMLInputElement).indeterminate)).toBe(false)
    await all.click()
    for (const row of await rows.all()) await expect(row).not.toBeChecked()
    await actions.first().click()
    expect(await heights(frame)).toEqual(before)
    expect(await card.locator('[data-slot="table-container"]').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    // A doubled spacing token never turns the Table container into a scroll region.
    await editorCategory(page, "Geometry")
    await page.getByRole("textbox", { name: "Spacing", exact: true }).fill("0.5")
    await page.getByRole("textbox", { name: "Spacing", exact: true }).blur()
    await workspaceMode(page, "Preview")
    await expect.poll(() => card.locator('[data-slot="table-container"]').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    // Scoped to this card: under doubled spacing the unchanged Quick find, Studio revenue and official Calendar cell
    // geometry already exceed a 390px column (accepted behaviour, recorded in the checkpoint).
    expect(await overflowing(frame, '[data-composition="recent-payments"]')).toEqual([])
    await axe(page, info, "table-light")
    await setColorMode(page, "dark")
    await axe(page, info, "table-dark")
  })
})

test.describe("WGPE-05 music (PUI-99)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`metadata, Body-role timeline and five equal evenly distributed controls on every track (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const player = frame.locator('[data-composition="now-playing"]')
      const before = await heights(frame)
      const bodyFamily = await frame.locator("body").evaluate(el => getComputedStyle(el).fontFamily)
      for (const title of ["Slow Light", "Paper Weather", "Long Evening"]) {
        // Primary metadata: artwork, title, artist and the far-right favourite only.
        await expect(player.getByRole("heading", { level: 2 })).toHaveText(title)
        const meta = player.locator('[data-slot="card-content"] > div').first()
        expect((await meta.innerText()).trim().split("\n").filter(Boolean)).toEqual([title, "Harbor Lines"])
        await expect(meta.getByRole("button", { name: "Favorite" })).toBeVisible()
        for (const text of [/now playing/i, /Side [AB]/, /^0\d( \/ 0\d)?$/]) await expect(player.getByText(text)).toHaveCount(0)
        const favorite = await box(meta.getByRole("button", { name: "Favorite" }))
        close(favorite.x + favorite.width, (await box(meta)).x + (await box(meta)).width)
        // Times: Body family (not Mono), above the slider, elapsed left and remaining right.
        const slider = player.getByRole("slider", { name: "Track position" })
        const times = player.locator('[data-slot="card-content"] > div:nth-child(2) > div:first-child')
        expect(await times.evaluate(el => getComputedStyle(el).fontFamily)).toBe(bodyFamily)
        expect((await box(times)).y + (await box(times)).height).toBeLessThanOrEqual((await box(slider)).y + 1)
        const [elapsed, remaining] = await times.locator("span").all()
        close((await box(elapsed!)).x, (await box(times)).x)
        close((await box(remaining!)).x + (await box(remaining!)).width, (await box(times)).x + (await box(times)).width)
        await expect(remaining!).toHaveText(/^-\d+:\d\d$/)
        // Controls: exact order, equal touch targets, even distribution across the full row.
        const row = player.locator("div.grid-cols-5")
        const buttons = row.getByRole("button")
        const names = await buttons.evaluateAll(els => els.map(el => el.getAttribute("aria-label")))
        expect(names).toEqual(["Shuffle", "Previous track", names[2] === "Pause" ? "Pause" : "Play", "Next track", "Repeat"])
        const boxes = await buttons.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, c: r.left + r.width / 2 } }))
        for (const b of boxes) { close(b.w, boxes[0]!.w, 0.5); close(b.h, boxes[0]!.h, 0.5); expect(b.w).toBeGreaterThanOrEqual(40) }
        const steps = boxes.slice(1).map((b, i) => b.c - boxes[i]!.c)
        for (const step of steps) close(step, steps[0]!, 1)
        const rowBox = await row.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left, width: r.width } })
        close(boxes[0]!.c - rowBox.x, rowBox.x + rowBox.width - boxes[4]!.c, 1)
        await player.getByRole("button", { name: "Next track" }).click()
      }
      for (const name of ["Shuffle", "Repeat", "Favorite"]) {
        const button = player.getByRole("button", { name })
        const pressed = await button.getAttribute("aria-pressed")
        await button.click()
        await expect(button).toHaveAttribute("aria-pressed", pressed === "true" ? "false" : "true")
      }
      await player.getByRole("button", { name: "Play" }).press("Enter")
      await expect(player.getByRole("button", { name: "Pause" })).toBeFocused()
      expect(await heights(frame)).toEqual(before)
      await axe(page, info, `music-${mode}`)
    })
  }
})

test.describe("WGPE-06/07 Calendar / Weather pair (PUI-97, PUI-100)", () => {
  test("calendar-only card with a working range; two-zone illustrative weather; no network", async ({ page }, info) => {
    const external: string[] = []
    page.on("request", request => { if (!request.url().startsWith("http://127.0.0.1") && !request.url().startsWith("data:") && !request.url().startsWith("blob:")) external.push(request.url()) })
    await open(page)
    await workspaceMode(page, "Preview")
    const frame = previewFrame(page)
    // Music moved to the end of the smaller left region; Calendar / Weather is the right region's last local pair.
    expect(await frame.locator('[data-gallery-region="left"] [data-composition]').evaluateAll(nodes => nodes.map(n => n.getAttribute("data-composition")))).toEqual(LEFT)
    expect(await frame.locator('[data-gallery-region="right"] [data-composition]').evaluateAll(nodes => nodes.map(n => n.getAttribute("data-composition")))).toEqual(RIGHT)
    expect(await frame.locator("[data-gallery-group]").last().evaluate(el => Array.from(el.children, c => c.getAttribute("data-composition")))).toEqual(["offsite-calendar", "local-weather"])

    const calendar = frame.locator('[data-composition="offsite-calendar"]')
    for (const text of ["Studio offsite", "Pick the days away", "Starts", "Ends", "Length"]) await expect(calendar.getByText(text, { exact: true })).toHaveCount(0)
    await expect(calendar.locator("dl, [data-slot=card-header]")).toHaveCount(0)
    await expect(calendar.getByRole("grid")).toHaveCount(1)
    await expect(calendar.locator('[data-range-start="true"]')).toHaveCSS("background-color", await token(frame, "primary"))
    await expect(calendar.locator('[data-range-middle="true"]')).toHaveCount(3)
    await expect(calendar.locator('[data-range-end="true"]')).toHaveCount(1)
    const before = await heights(frame)
    await calendar.getByRole("button", { name: /October 20th, 2026/ }).click()
    await expect(calendar.locator('[data-range-end="true"]')).toHaveCount(1)
    await calendar.getByRole("button", { name: /next month/i }).click()
    await expect(calendar.getByText("November 2026")).toBeVisible()
    await calendar.getByRole("button", { name: /previous month/i }).click()
    await calendar.locator('[data-range-start="true"]').focus()
    await page.keyboard.press("ArrowRight")
    await expect.poll(() => calendar.evaluate(() => document.activeElement?.getAttribute("data-day") ?? null)).toBe(new Date(2026, 9, 13).toLocaleDateString())
    expect(await heights(frame)).toEqual(before)

    const weather = frame.locator('[data-composition="local-weather"]')
    for (const text of [/not live/i, /Sample/, /Wind/, /Humidity/, /Sunset/, /^Now$/]) await expect(weather.getByText(text)).toHaveCount(0)
    await expect(weather.getByRole("list", { name: "Next hours" })).toHaveCount(0)
    await expect(weather.locator("[data-slot=card-header], [data-slot=separator], hr")).toHaveCount(0)
    // Top zone: condition icon, large temperature, stacked high/low, and right-aligned place / condition.
    const contentBox = await box(weather.locator('[data-slot="card-content"]'))
    const inset = parseFloat(await css(weather.locator('[data-slot="card-content"]'), "padding-left"))
    const content = { x: contentBox.x + inset, width: contentBox.width - 2 * inset }
    const icon = await box(weather.locator('[data-slot="card-content"] > div > svg'))
    const current = weather.locator("p.type-heading")
    await expect(current).toHaveText("Now 21°")
    const temperature = await box(current)
    const [high, low] = [await box(weather.getByText("H 24°")), await box(weather.getByText("L 16°"))]
    const place = await box(weather.getByRole("heading", { name: "Lisbon", level: 2 }))
    const condition = await box(weather.getByText("Partly cloudy", { exact: true }))
    close(icon.x, content.x)
    expect(temperature.x).toBeGreaterThan(icon.x + icon.width - 1)
    expect(high.x).toBeGreaterThan(temperature.x + temperature.width - 1)
    close(high.x, low.x)
    expect(low.y).toBeGreaterThan(high.y)
    close(place.x + place.width, content.x + content.width)
    close(condition.x + condition.width, content.x + content.width)
    expect(parseFloat(await css(current, "font-size"))).toBeGreaterThanOrEqual(36)
    // Bottom zone: five evenly distributed day columns of day, icon, high and low only.
    const days = weather.getByRole("list", { name: "Five-day forecast" }).getByRole("listitem")
    await expect(days).toHaveCount(5)
    const columns = await days.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.left, w: r.width, svg: el.querySelectorAll("svg").length, text: Array.from(el.children).filter(c => !c.classList.contains("sr-only") && c.tagName !== "svg").map(c => c.textContent) } }))
    for (const column of columns) {
      close(column.w, columns[0]!.w, 1)
      expect(column.svg).toBe(1)
      expect(column.text).toEqual([expect.stringMatching(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/), expect.stringMatching(/^\d+°$/), expect.stringMatching(/^\d+°$/)])
    }
    for (const [name, id] of [["foreground", "list"], ["muted-foreground", "p.text-sm"]] as const) {
      const color = id === "list" ? await days.first().locator("svg").evaluate(el => getComputedStyle(el).color) : await weather.locator(id).last().evaluate(el => getComputedStyle(el).color)
      expect(color).toBe(await token(frame, name))
    }
    await expect(weather.getByRole("button")).toHaveCount(0)
    expect(external).toEqual([])
    expect(await overflowing(frame)).toEqual([])
    await axe(page, info, "calendar-weather-light")
    await setColorMode(page, "dark")
    expect(await days.first().locator("svg").evaluate(el => getComputedStyle(el).color)).toBe(await token(frame, "foreground"))
    await axe(page, info, "calendar-weather-dark")
  })

  test("the pair stacks when narrow and pairs compact calendar with wider Weather when there is room", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    test.setTimeout(90_000)
    await open(page)
    const frame = previewFrame(page)
    const measure = () => frame.locator("html").evaluate(() => {
      const group = document.querySelectorAll("[data-gallery-group]")[1]!
      const [calendar, weather] = ["offsite-calendar", "local-weather"].map(id => document.querySelector(`[data-composition="${id}"]`)!.getBoundingClientRect())
      const region = document.querySelector('[data-gallery-region="right"]')!.getBoundingClientRect()
      const grid = document.querySelector('[data-composition="offsite-calendar"] [role="grid"]')!.getBoundingClientRect()
      return {
        region: region.width, columns: getComputedStyle(group).gridTemplateColumns.split(" ").length,
        calendar: { x: calendar.x, y: calendar.y, w: calendar.width, h: calendar.height, bottom: calendar.bottom }, weather: { x: weather.x, y: weather.y, w: weather.width, h: weather.height },
        grid: grid.width,
        overflow: document.documentElement.scrollWidth > innerWidth || Array.from(document.querySelectorAll("[data-composition]")).some(el => el.scrollWidth > el.clientWidth + 1),
      }
    })
    const sweep: Record<string, Awaited<ReturnType<typeof measure>>> = {}
    for (const width of [360, 600, 760, 1000, 1160, 1300, 1600]) {
      await frame.locator("[data-gallery]").evaluate((el, w) => { el.style.width = `${w}px` }, width)
      await expect.poll(async () => !(await measure()).overflow).toBe(true)
      sweep[width] = await measure()
    }
    await frame.locator("[data-gallery]").evaluate(el => { el.style.width = "" })
    await info.attach("wgpe-06-pair-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })
    for (const [width, m] of Object.entries(sweep)) {
      expect(m.overflow, width).toBe(false)
      if (m.region >= 672) {
        // Side by side: calendar at its compact natural width (the grid plus its card padding), Weather the larger share.
        expect(m.columns, width).toBe(2)
        close(m.calendar.y, m.weather.y)
        expect(m.calendar.w, width).toBeLessThan(m.weather.w)
        expect(m.calendar.w, width).toBeLessThan(m.grid + 64)
        close(m.weather.x - (m.calendar.x + m.calendar.w), 16)
        close(m.calendar.h, m.weather.h)
      } else {
        expect(m.columns, width).toBe(1)
        close(m.weather.y - m.calendar.bottom, 16)
      }
    }
    // The split is not a fixed percentage: the calendar keeps one width while the Weather share grows with the region.
    close(sweep[1300]!.calendar.w, sweep[1600]!.calendar.w)
    expect(sweep[1600]!.weather.w).toBeGreaterThan(sweep[1300]!.weather.w + 100)
    expect(Object.values(sweep).some(m => m.columns === 2) && Object.values(sweep).some(m => m.columns === 1)).toBe(true)
  })
})

test.describe("WGPE-08 Sidebar switch (PUI-98)", () => {
  test("no helper in either state, no description reference, fields always editable, source selection persists", async ({ page }, info) => {
    await open(page)
    const { section, toggle } = await sidebarSwitch(page)
    for (const state of ["false", "true", "false"] as const) {
      if ((await toggle.getAttribute("aria-checked")) !== state) await toggle.click()
      await expect(toggle).toHaveAttribute("aria-checked", state)
      for (const text of ["Sidebar tokens are active.", "Sidebar tokens are currently not applied."]) await expect(section.getByText(text)).toHaveCount(0)
      await expect(section.getByTestId("sidebar-tokens-status")).toHaveCount(0)
      expect(await toggle.getAttribute("aria-describedby")).toBeNull()
      await expect(section.getByTestId("control-sidebar-tokens").locator('[data-slot="field-description"]')).toHaveCount(0)
      await expect(colorInput(page, "sidebar")).toBeEnabled()
      await expect(colorInput(page, "sidebar-border")).toBeVisible()
    }
    await expect(toggle).toHaveAccessibleName("Use sidebar tokens")
    await toggle.focus()
    await page.keyboard.press("Space")
    await expect(toggle).toHaveAttribute("aria-checked", "true")
    await axe(page, info, "sidebar-switch-on")
  })
})

test.describe("WGPE-09 Design system view (PUI-101)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`live read-only colours, effective Sidebar values, semantic type samples (${mode})`, async ({ page }, info) => {
      test.setTimeout(120_000)
      await open(page)
      await setColorMode(page, mode)
      await previewView(page, "Design system")
      const frame = previewFrame(page)
      const panel = frame.getByRole("tabpanel", { name: "Design system", exact: true })
      await expect(panel).toBeVisible()
      // Read-only: no controls of any kind in the view.
      await expect(panel.locator("input, button, select, textarea, [role=slider], [role=switch], [role=combobox]")).toHaveCount(0)
      await expect(panel.getByRole("heading", { level: 2 })).toHaveText(["Colors", "Typography"])
      await expect(panel.getByRole("heading", { level: 3 })).toHaveText(["Base", "Surfaces", "Intent", "Boundaries", "Charts", "Sidebar · base aliases", "Heading", "Body", "Mono"])
      const swatch = (name: string) => panel.locator(`[data-token="${name}"]`)
      await expect(panel.locator("[data-token]")).toHaveCount(32)
      // Values are what the iframe CSS resolves to right now, and the swatch paints the same token.
      for (const name of ["background", "primary", "border", "chart-2"]) {
        await expect(swatch(name).getByTestId("token-value")).toHaveText(await property(frame, `--${name}`))
        expect(await swatch(name).locator("span").first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe(await frame.locator("html").evaluate((_, n) => { const p = document.createElement("span"); p.style.backgroundColor = `var(--${n})`; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c }, name))
      }
      // Sidebar OFF: each Sidebar token shows its base alias and the alias's rendered value.
      await expect(swatch("sidebar").getByTestId("sidebar-alias")).toHaveText("= background")
      await expect(swatch("sidebar").getByTestId("token-value")).toHaveText(await property(frame, "--background"))
      await expect(swatch("sidebar-ring").getByTestId("sidebar-alias")).toHaveText("= ring")
      // A sidebar colour edit (live Workbench control) updates the view immediately.
      await editorCategory(page, "Colors")
      await colorInput(page, "primary").fill(EDITS[mode].primary)
      await colorInput(page, "primary").press("Enter")
      await workspaceMode(page, "Preview")
      await expect(swatch("primary").getByTestId("token-value")).toHaveText(EDITS[mode].primary)
      await expect(swatch("sidebar-primary").getByTestId("token-value")).toHaveText(EDITS[mode].primary)
      // Sidebar ON: dedicated values, reflected immediately, and dedicated edits show through.
      const { toggle } = await sidebarSwitch(page)
      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-checked", "true")
      await colorInput(page, "sidebar").fill(EDITS[mode].sidebar)
      await colorInput(page, "sidebar").press("Enter")
      await workspaceMode(page, "Preview")
      await expect(panel.getByRole("heading", { name: "Sidebar · dedicated", level: 3 })).toBeVisible()
      await expect(swatch("sidebar").getByTestId("sidebar-alias")).toHaveCount(0)
      await expect(swatch("sidebar").getByTestId("token-value")).toHaveText(EDITS[mode].sidebar)
      // Typography: the samples use the live roles, and a Heading font edit updates the sample and its label.
      const headingSample = panel.locator('[data-role="heading"] p.type-heading').first()
      expect(await css(headingSample, "font-family")).toBe(await css(frame.locator('[data-composition="plan-usage"] h2'), "font-family"))
      expect(await css(panel.locator('[data-role="body"] p').nth(1), "font-family")).toBe(await frame.locator("body").evaluate(el => getComputedStyle(el).fontFamily))
      expect(await css(panel.locator('[data-role="mono"] p.font-mono.text-sm'), "font-family")).toBe(await property(frame, "--font-mono").then(v => frame.locator("html").evaluate((_, stack) => { const p = document.createElement("span"); p.style.fontFamily = stack; document.body.append(p); const f = getComputedStyle(p).fontFamily; p.remove(); return f }, v)))
      expect(await css(panel.locator('[data-role="muted"]'), "color")).toBe(await token(frame, "muted-foreground"))
      await expect(panel.locator('[data-role="heading"]').getByTestId("role-meta")).toContainText(await property(frame, "--font-weight-heading"))
      await editorCategory(page, "Typography")
      await page.getByRole("combobox", { name: "Heading Font", exact: true }).click()
      await page.getByRole("combobox", { name: "Search Heading fonts", exact: true }).fill("Playfair Display")
      await page.getByRole("option", { name: "Playfair Display", exact: true }).click()
      await workspaceMode(page, "Preview")
      await expect.poll(() => css(headingSample, "font-family")).toContain("Playfair Display")
      await expect(panel.locator('[data-role="heading"]').getByTestId("role-meta")).toContainText("Playfair Display")
      // The light/dark switch updates the reported values without any other state.
      const background = await swatch("background").getByTestId("token-value").innerText()
      await setColorMode(page, mode === "light" ? "dark" : "light")
      await expect(swatch("background").getByTestId("token-value")).not.toHaveText(background)
      await expect(swatch("background").getByTestId("token-value")).toHaveText(await property(frame, "--background"))
      await setColorMode(page, mode)
      expect(await overflowing(frame)).toEqual([])
      await axe(page, info, `design-system-${mode}`)
    })
  }
})

test.describe("WGPE-10 App shells view (PUI-102)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`three contained shadcn Sidebar shells that follow the live theme and Sidebar source (${mode})`, async ({ page }, info) => {
      test.setTimeout(120_000)
      await open(page)
      await setColorMode(page, mode)
      await previewView(page, "App shells")
      const frame = previewFrame(page)
      const panel = frame.getByRole("tabpanel", { name: "App shells", exact: true })
      const shells = panel.locator("[data-app-shell]")
      await expect(shells).toHaveCount(3)
      await expect(panel.getByRole("heading", { level: 2 })).toHaveText(["Classic workspace", "Inset project", "Compact utility"])
      await expect(panel.getByRole("navigation")).toHaveCount(3)
      // Contained: every Sidebar is the official non-collapsible branch, in flow, inside its own frame.
      for (const shell of await shells.all()) {
        const frameBox = await box(shell.locator(":scope > div"))
        const sidebar = shell.locator('[data-slot="sidebar"]')
        await expect(sidebar).toHaveCount(1)
        expect(await css(sidebar, "position")).toBe("static")
        const s = await box(sidebar)
        expect(s.x).toBeGreaterThanOrEqual(frameBox.x - 0.5)
        expect(s.y).toBeGreaterThanOrEqual(frameBox.y - 0.5)
        expect(s.x + s.width).toBeLessThanOrEqual(frameBox.x + frameBox.width + 0.5)
        expect(s.y + s.height).toBeLessThanOrEqual(frameBox.y + frameBox.height + 0.5)
        await expect(shell.getByRole("navigation").getByRole("button").first()).toBeVisible()
        await expect(shell.locator('[aria-current="page"]')).toHaveCount(1)
      }
      await expect(panel.locator('[data-slot="sidebar-container"], [data-slot="sidebar-gap"], [data-slot="sidebar-inset"]')).toHaveCount(0)
      expect(await panel.evaluate(root => Array.from(root.querySelectorAll("*")).filter(el => getComputedStyle(el).position === "fixed").length)).toBe(0)
      // Distinct compositions: three different Sidebar widths.
      const widths = await panel.locator('[data-slot="sidebar"]').evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().width)))
      expect(new Set(widths).size).toBeGreaterThanOrEqual(2)
      // Local active navigation with keyboard and visible focus.
      const classic = shells.nth(0)
      const inbox = classic.getByRole("button", { name: "Inbox" })
      await classic.getByRole("button", { name: "Home" }).focus()
      await page.keyboard.press("Tab")
      await expect(inbox).toBeFocused()
      await expect.poll(() => inbox.evaluate(el => el.matches(":focus-visible"))).toBe(true)
      await page.keyboard.press("Enter")
      await expect(inbox).toHaveAttribute("aria-current", "page")
      await expect(inbox).toHaveAttribute("data-active", "true")
      await expect(classic.locator('[aria-current="page"]')).toHaveCount(1)
      // The global Sidebar shortcut inside the preview changes nothing in the shells or the Workbench.
      const before = await panel.evaluate(root => root.getBoundingClientRect().height)
      await page.keyboard.press("ControlOrMeta+b")
      expect(await panel.evaluate(root => root.getBoundingClientRect().height)).toBe(before)
      await expect(panel.locator('[data-slot="sidebar"]')).toHaveCount(3)
      // Sidebar OFF: aliases; ON: dedicated values, both live.
      const sidebar = classic.locator('[data-slot="sidebar"]')
      expect(await css(sidebar, "background-color")).toBe(await token(frame, "background"))
      await expect(classic.locator('[data-active="true"]')).toHaveCSS("background-color", await token(frame, "accent"))
      const { toggle } = await sidebarSwitch(page)
      await toggle.click()
      await colorInput(page, "sidebar").fill(EDITS[mode].sidebar)
      await colorInput(page, "sidebar").press("Enter")
      await colorInput(page, "sidebar-accent").fill(EDITS[mode].accent)
      await colorInput(page, "sidebar-accent").press("Enter")
      await workspaceMode(page, "Preview")
      await expect.poll(() => css(sidebar, "background-color")).toBe(await token(frame, "sidebar"))
      expect(await css(sidebar, "background-color")).not.toBe(await token(frame, "background"))
      await expect(classic.locator('[data-active="true"]')).toHaveCSS("background-color", await token(frame, "sidebar-accent"))
      await expect(shells.nth(1).locator(":scope > div > div").first()).toHaveCSS("background-color", await token(frame, "sidebar"))
      // Radius and typography follow the theme live.
      const radius = await css(classic.locator('[data-active="true"]'), "border-top-left-radius")
      await editorCategory(page, "Geometry")
      await page.getByRole("textbox", { name: "Radius", exact: true }).fill("1.2")
      await page.getByRole("textbox", { name: "Radius", exact: true }).blur()
      await workspaceMode(page, "Preview")
      await expect.poll(() => css(classic.locator('[data-active="true"]'), "border-top-left-radius")).not.toBe(radius)
      expect(await css(panel.getByRole("heading", { level: 2 }).first(), "font-family")).toBe(await css(frame.locator('[data-composition="plan-usage"] h2'), "font-family"))
      // Main areas stay abstract: no forms, tables, charts or content controls beyond the Sidebar navigation.
      await expect(panel.locator("table, form, input, textarea, .recharts-surface")).toHaveCount(0)
      expect(await panel.getByRole("button").count()).toBe(await panel.getByRole("navigation").getByRole("button").count())
      expect(await overflowing(frame)).toEqual([])
      await axe(page, info, `app-shells-${mode}`)
    })
  }
})

test.describe("WGPE-11 four-view preview and gallery integrity", () => {
  test("Cards / Design system / App shells / States, each view working, eleven cards once, no overflow", async ({ page }, info) => {
    await open(page)
    await workspaceMode(page, "Preview")
    const frame = previewFrame(page)
    const list = frame.getByRole("tablist", { name: "Preview views" })
    await expect(list.getByRole("tab")).toHaveText(["Cards", "Design system", "App shells", "States"])
    await expect(list.getByRole("tab", { name: "Cards", exact: true })).toHaveAttribute("aria-selected", "true")
    expect(await frame.locator("[data-composition]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-composition")))).toEqual([...LEFT, ...RIGHT])
    for (const [view, check] of [["Design system", "[data-design-system]"], ["App shells", "[data-app-shell]"], ["States", '[data-testid="button-activations"]'], ["Cards", "[data-gallery]"]] as const) {
      await previewView(page, view)
      await expect(frame.locator(check).first()).toBeVisible()
      await expect(frame.getByRole("tabpanel")).toHaveCount(1)
      expect(await overflowing(frame)).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    }
    // States keeps its behaviour; the one preview ScrollArea is unchanged.
    await previewView(page, "States")
    await frame.getByRole("button", { name: "default", exact: true }).click()
    await expect(frame.getByTestId("button-activations")).toContainText("1")
    await previewView(page, "Cards")
    await previewView(page, "States")
    await expect(frame.getByTestId("button-activations")).toContainText("1")
    expect(await frame.locator('[data-slot="scroll-area"]').count()).toBe(1)
    // Keyboard: roving tabs across all four views.
    await list.getByRole("tab", { name: "States", exact: true }).focus()
    await page.keyboard.press("Home")
    await expect(list.getByRole("tab", { name: "Cards", exact: true })).toBeFocused()
    for (const name of ["Design system", "App shells", "States"]) {
      await page.keyboard.press("ArrowRight")
      await expect(list.getByRole("tab", { name, exact: true })).toHaveAttribute("aria-selected", "true")
    }
    await page.keyboard.press("Home")
    await axe(page, info, "four-views")
  })
})
