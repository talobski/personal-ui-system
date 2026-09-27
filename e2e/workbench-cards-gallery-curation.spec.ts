import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { isMobileShell, selectTheme, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * workbench-cards-gallery-curation-v1-001 producer definitions (Lead-executed under playwright.workbench.config.ts at
 * 390x844 and 1440x900; desktop-width sweeps run once, in the desktop project). CGCR-03 exact curation, CGCR-04 stable
 * interaction geometry, CGCR-05 Studio revenue, CGCR-06 16px gaps, CGCR-07 the one equal-height pair, CGCR-08
 * responsiveness, theme, keyboard, reduced motion, and decoded axe (serious/critical outside the known debt must be empty).
 * Migrated to the PUI-86–92 eleven-card set (workbench-showcase-components-geometry-v1-001): the layout invariants carry
 * forward; interactions of the replaced cards move to their replacements, and PUI-87 removes the revenue tick row.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)

const LEFT = ["plan-usage", "quick-find", "productive-week", "signup-form", "local-weather"]
const RIGHT = ["revenue-overview", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "now-playing"]
const ORDER = [...LEFT, ...RIGHT]
const PAIR = ["team-chat", "recent-activity"]
/** Right-region flow: full items and the local pair, each followed by exactly one gap. */
const RIGHT_FLOW = [["revenue-overview"], PAIR, ["recent-payments"], ["offsite-calendar"], ["now-playing"]]
const GAP = 16

async function open(page: Page) {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  await expect.poll(() => previewFrame(page).locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `cgcr-${label}`)
  await info.attach(`axe-cgcr-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
  expect(blocking.filter(v => v.impact === "critical" || v.impact === "serious"), label).toEqual([])
}

/**
 * Gallery geometry inside the preview document, relative to the gallery's own box (so preview scrolling is ignored).
 * `natural` is each card's content height, measured synchronously with its fill undone (for the local pair, the grid
 * item's stretch too) and restored before returning, so stretch can be told apart from content height.
 */
const geometry = (frame: FrameLocator) => frame.locator("html").evaluate(() => {
  const gallery = document.querySelector<HTMLElement>("[data-gallery]")!
  const frameEl = gallery.firstElementChild as HTMLElement
  const origin = gallery.getBoundingClientRect()
  const box = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x - origin.x, y: r.y - origin.y, right: r.right - origin.x, bottom: r.bottom - origin.y, width: r.width, height: r.height } }
  const sections = Array.from(gallery.querySelectorAll<HTMLElement>("[data-composition]"))
  const natural = Object.fromEntries(sections.map(section => {
    const card = section.firstElementChild as HTMLElement
    const before = [section.style.alignSelf, card.style.height]
    if (section.parentElement!.hasAttribute("data-gallery-group")) section.style.alignSelf = "start"
    card.style.height = "auto"
    const height = card.getBoundingClientRect().height
    ;[section.style.alignSelf, card.style.height] = before
    return [section.dataset.composition!, height]
  }))
  const style = (el: Element) => getComputedStyle(el)
  const regions = Object.fromEntries(Array.from(gallery.querySelectorAll("[data-gallery-region]"), el => [el.getAttribute("data-gallery-region")!, { ...box(el), rowGap: style(el).rowGap, ids: Array.from(el.querySelectorAll("[data-composition]"), c => c.getAttribute("data-composition")!) }]))
  const groups = Array.from(gallery.querySelectorAll("[data-gallery-group]"), el => ({ columns: style(el).gridTemplateColumns.split(" ").length, align: style(el).alignItems, rowGap: style(el).rowGap, columnGap: style(el).columnGap, ids: Array.from(el.querySelectorAll("[data-composition]"), c => c.getAttribute("data-composition")!) }))
  return {
    viewport: innerWidth,
    gallery: origin.width,
    frame: { columns: style(frameEl).gridTemplateColumns.split(" ").length, rowGap: style(frameEl).rowGap, columnGap: style(frameEl).columnGap, align: style(frameEl).alignItems },
    regions,
    groups,
    order: sections.map(section => section.dataset.composition!),
    items: Object.fromEntries(sections.map(section => [section.dataset.composition!, { ...box(section), card: box(section.firstElementChild!).height }])),
    natural,
    overflow: document.documentElement.scrollWidth > innerWidth || sections.some(el => el.scrollWidth > el.clientWidth + 1),
  }
})
type Geometry = Awaited<ReturnType<typeof geometry>>

/** CGCR-06/07 invariants for one measured layout. */
function expectCuratedLayout(g: Geometry) {
  const split = g.frame.columns === 12
  const paired = g.groups[0]!.columns === 2
  expect(g.order).toEqual(ORDER)
  expect(g.regions.left!.ids).toEqual(LEFT)
  expect(g.regions.right!.ids).toEqual(RIGHT)
  expect(g.groups.map(group => group.ids)).toEqual([PAIR])
  expect(g.overflow).toBe(false)
  // Every declared gallery gap is 16px, and every measured inter-card and inter-region distance is 16px.
  for (const gap of [g.frame.rowGap, g.frame.columnGap, g.regions.left!.rowGap, g.regions.right!.rowGap, g.groups[0]!.rowGap, g.groups[0]!.columnGap]) expect(gap).toBe(`${GAP}px`)
  const at = (id: string) => g.items[id]!
  for (let i = 1; i < LEFT.length; i++) close(at(LEFT[i]!).y - at(LEFT[i - 1]!).bottom, GAP)
  for (let i = 1; i < RIGHT_FLOW.length; i++) {
    const previous = Math.max(...RIGHT_FLOW[i - 1]!.map(id => at(id).bottom))
    close(at(RIGHT_FLOW[i]![0]!).y - previous, GAP)
  }
  if (split) { close(g.regions.left!.y, g.regions.right!.y); close(g.regions.right!.x - g.regions.left!.right, GAP) } else close(g.regions.right!.y - g.regions.left!.bottom, GAP)
  const [a, b] = PAIR.map(at)
  if (paired) {
    // Side by side: one row, one 16px column gap, and both card surfaces stretched to the taller natural height.
    close(a!.y, b!.y)
    close(b!.x - a!.right, GAP)
    close(a!.card, b!.card)
    close(a!.card, Math.max(g.natural[PAIR[0]!]!, g.natural[PAIR[1]!]!))
    expect(g.groups[0]!.align).toBe("stretch")
  } else {
    // Stacked: 16px apart, each back at its own natural height.
    close(b!.y - a!.bottom, GAP)
    for (const id of PAIR) close(at(id).card, g.natural[id]!)
  }
  // Nothing outside the pair is equalized: every other card is at its natural height and fills its wrapper exactly.
  for (const id of ORDER.filter(id => !PAIR.includes(id))) { close(at(id).card, g.natural[id]!); close(at(id).height, at(id).card) }
  if (split) expect(new Set(ORDER.filter(id => !PAIR.includes(id)).map(id => Math.round(at(id).card))).size).toBeGreaterThan(3)
  return { split, paired }
}

test.describe("CGCR-03/06/07 curated gallery, 16px gaps, and the one equal-height pair", () => {
  for (const size of [{ width: 390, height: 844 }, { width: 1100, height: 900 }, { width: 1440, height: 900 }]) {
    test(`exact eleven-card order, 16px gaps, and pair behaviour at ${size.width}px`, async ({ page }, info) => {
      test.skip(size.width === 1100 && isMobileShell(page), "the intermediate width runs once, in the desktop project")
      if (size.width !== page.viewportSize()!.width) await page.setViewportSize(size)
      await open(page)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      await expect(frame.locator("[data-composition]")).toHaveCount(11)
      const g = await geometry(frame)
      await info.attach(`cgcr-layout-${size.width}.json`, { body: JSON.stringify(g, null, 2), contentType: "application/json" })
      const shape = expectCuratedLayout(g)
      // 390: one column, pair stacked. 1100 (620px gallery): one column, pair side by side. 1440: 5/7 split, pair side by side.
      expect(shape).toEqual(size.width === 390 ? { split: false, paired: false } : size.width === 1100 ? { split: false, paired: true } : { split: true, paired: true })
      // Removed cards are gone from the gallery; no empty structural hole remains (every region child holds a card).
      for (const title of ["Account profile", "Notifications", "Team access", "Workspace settings", "Room to think", "This week", "Launch checklist", "How can we help?", "A productive week"]) await expect(frame.locator("[data-gallery]").getByRole("heading", { name: title, exact: true })).toHaveCount(0)
      expect(await frame.locator("[data-gallery-region] > *, [data-gallery-group] > *").evaluateAll(nodes => nodes.every(node => node.getBoundingClientRect().height > 40))).toBe(true)
      await info.attach(`cgcr-gallery-${size.width}.png`, { body: await page.screenshot(), contentType: "image/png" })
    })
  }

  test("container width sweep at a fixed viewport keeps 16px gaps, breakpoints, and pair stretch/collapse", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    test.setTimeout(90_000)
    await open(page)
    const frame = previewFrame(page)
    const sweep: Record<string, Geometry> = {}
    for (const width of [360, 500, 600, 700, 760, 900, 1000, 1160, 1300]) {
      await frame.locator("[data-gallery]").evaluate((el, w) => { el.style.width = `${w}px` }, width)
      await expect.poll(async () => { const g = await geometry(frame); return Math.round(g.gallery) === width && !g.overflow }).toBe(true)
      sweep[width] = await geometry(frame)
    }
    await frame.locator("[data-gallery]").evaluate(el => { el.style.width = "" })
    await expect.poll(async () => { const g = await geometry(frame); return g.gallery > 1300 || g.gallery < 1160 ? !g.overflow : false }).toBe(true)
    sweep.open = await geometry(frame)
    await page.keyboard.press("Control+b")
    await expect.poll(async () => { const g = await geometry(frame); return g.gallery > sweep.open!.gallery + 300 && !g.overflow }).toBe(true)
    sweep.collapsed = await geometry(frame)
    await info.attach("cgcr-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })
    // The accepted breakpoints are unchanged: <42rem one column, 42rem 6/6, 56rem 5/7, 72rem 4/8; the pair goes side by
    // side from its region's 32rem.
    const expected: Record<string, [number, boolean]> = { 360: [1, false], 500: [1, false], 600: [1, true], 700: [12, false], 760: [12, false], 900: [12, true], 1000: [12, true], 1160: [12, true], 1300: [12, true] }
    for (const [width, [columns, paired]] of Object.entries(expected)) {
      const g = sweep[width]!
      expect(g.frame.columns, width).toBe(columns)
      expect(expectCuratedLayout(g).paired, width).toBe(paired)
    }
    // Region proportions are unchanged, now with 16px tracks: 6/6, 5/7, and 4/8 of 12 tracks with 11 x 16px gaps.
    for (const [width, span] of [[760, 6], [1000, 7], [1300, 8]] as const) {
      const track = (width - 11 * GAP) / 12
      close(sweep[width]!.regions.right!.width, span * track + (span - 1) * GAP, 2)
    }
    expect(expectCuratedLayout(sweep.open!).split).toBe(true)
    expect(expectCuratedLayout(sweep.collapsed!).split).toBe(true)
    expect(sweep.collapsed!.regions.right!.width / sweep.collapsed!.regions.left!.width).toBeGreaterThan(sweep.open!.regions.right!.width / sweep.open!.regions.left!.width + 0.3)
  })

  test("independent stacks: a tall card never moves the other region, and the pair only follows its own taller card", async ({ page }) => {
    test.skip(isMobileShell(page), "side-by-side regions need the desktop gallery width")
    await open(page)
    const frame = previewFrame(page)
    const before = await geometry(frame)
    const grow = (id: string, px: number) => frame.locator(`[data-composition="${id}"]`).evaluate((el, h) => { (el.firstElementChild as HTMLElement).style.minHeight = `${h}px` }, px)
    await grow("plan-usage", 1400)
    const tallLeft = await geometry(frame)
    for (const id of RIGHT) { close(tallLeft.items[id]!.y, before.items[id]!.y); close(tallLeft.items[id]!.card, before.items[id]!.card) }
    close(tallLeft.items["quick-find"]!.y - tallLeft.items["plan-usage"]!.bottom, GAP)
    await grow("plan-usage", 0)
    await grow("recent-activity", 900)
    const tallPair = await geometry(frame)
    // The pair's other card stretches with it; nothing else changes height, and the left stack does not move.
    close(tallPair.items["team-chat"]!.card, 900)
    for (const id of LEFT) { close(tallPair.items[id]!.y, before.items[id]!.y); close(tallPair.items[id]!.card, before.items[id]!.card) }
    for (const id of ["revenue-overview", "recent-payments", "offsite-calendar", "now-playing"]) close(tallPair.items[id]!.card, before.items[id]!.card)
    close(tallPair.items["recent-payments"]!.y - tallPair.items["recent-activity"]!.bottom, GAP)
  })
})

test.describe("CGCR-04 stable gallery interaction", () => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`normal interaction never changes any card's footprint (${reducedMotion})`, async ({ page }, info) => {
      test.setTimeout(120_000)
      await page.emulateMedia({ reducedMotion })
      await open(page)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const card = (id: string) => frame.locator(`[data-composition="${id}"]`)
      const baseline = await geometry(frame)
      const log: Record<string, Record<string, number>> = {}
      const unchanged = async (step: string) => {
        const now = await geometry(frame)
        log[step] = Object.fromEntries(ORDER.map(id => [id, now.items[id]!.card]))
        for (const id of ORDER) {
          close(now.items[id]!.card, baseline.items[id]!.card, 0.5)
          close(now.items[id]!.y, baseline.items[id]!.y, 0.5)
          close(now.items[id]!.x, baseline.items[id]!.x, 0.5)
        }
      }

      // Storage: PUI-86 removed its only control with the promotion.
      await expect(card("plan-usage").getByRole("button")).toHaveCount(0)

      // Quick find: filtering keeps all five rows (non-matches disabled), selection marks the row, empty keeps the rows.
      const find = card("quick-find")
      const search = find.getByRole("searchbox", { name: "Search commands" })
      const rows = find.getByRole("list", { name: "Commands" }).getByRole("button")
      await search.fill("export")
      await expect(rows).toHaveCount(5)
      await expect(find.getByRole("button", { name: /Export theme JSON/ })).toBeEnabled()
      await expect(find.getByRole("button", { name: /Edit theme colors/ })).toBeDisabled()
      await unchanged("quick-find-filter")
      await find.getByRole("button", { name: /Export theme JSON/ }).focus()
      await page.keyboard.press("Enter")
      await expect(find.getByRole("button", { name: /Export theme JSON/ })).toHaveAttribute("aria-current", "true")
      await expect(find.getByRole("status")).toHaveText("Opened “Export theme JSON” in this preview only.")
      await unchanged("quick-find-open")
      await search.fill("zzz")
      await expect(rows).toHaveCount(5)
      for (const row of await rows.all()) await expect(row).toBeDisabled()
      await expect(find.getByText("0 results")).toBeAttached()
      await unchanged("quick-find-empty")
      await search.fill("")
      for (const row of await rows.all()) await expect(row).toBeEnabled()

      // Signup: typing and submitting announce a preview notice only; no validation region is appended (PUI-91).
      const signup = card("signup-form")
      await signup.getByLabel("Email").fill("someone@example.com")
      await signup.getByLabel("Password", { exact: true }).fill("short")
      await unchanged("signup-typing")
      await signup.getByRole("button", { name: "Create Account" }).click()
      await expect(signup.getByRole("status")).toHaveText("Preview only. No account was created.")
      await expect(signup.getByRole("alert")).toHaveCount(0)
      await unchanged("signup-submit")

      // Calendar: choosing days and changing month keeps six fixed weeks (PUI-92).
      const calendar = card("offsite-calendar")
      await calendar.getByRole("button", { name: /October 20th, 2026/ }).click()
      await unchanged("calendar-extend")
      await calendar.getByRole("button", { name: /next month/i }).click()
      await expect(calendar.getByText("November 2026")).toBeVisible()
      await unchanged("calendar-next-month")
      await calendar.getByRole("button", { name: /previous month/i }).click()
      await expect(calendar.getByText("October 2026")).toBeVisible()

      // Music: play, track change, like and repeat are local state only.
      const player = card("now-playing")
      await player.getByRole("button", { name: "Play" }).click()
      await player.getByRole("button", { name: "Next track" }).click()
      await player.getByRole("button", { name: "Like" }).click()
      await player.getByRole("button", { name: "Repeat" }).click()
      await expect(player.getByRole("button", { name: "Pause" })).toBeVisible()
      await unchanged("music-controls")

      // Studio revenue: every range keeps the card's height.
      const revenue = card("revenue-overview")
      for (const range of ["Week", "Quarter", "Month"]) {
        await revenue.getByRole("radio", { name: range }).click()
        await expect(revenue.getByRole("radio", { name: range })).toHaveAttribute("aria-checked", "true")
        await unchanged(`revenue-${range}`)
      }
      await info.attach(`cgcr-04-heights-${reducedMotion}.json`, { body: JSON.stringify({ baseline: baseline.items, log }, null, 2), contentType: "application/json" })
      await axe(page, info, `interactions-light-${reducedMotion}`)
      await setColorMode(page, "dark")
      await axe(page, info, `interactions-dark-${reducedMotion}`)
    })
  }
})

test.describe("CGCR-05 Studio revenue", () => {
  test("range tabs lead, one divided metric row, and a Revenue-only chart with no x-axis labels (PUI-87)", async ({ page }, info) => {
    await open(page)
    await workspaceMode(page, "Preview")
    const frame = previewFrame(page)
    const revenue = frame.locator('[data-composition="revenue-overview"]')
    const shape = () => revenue.evaluate(section => {
      const card = section.firstElementChild!.getBoundingClientRect()
      const group = section.querySelector('[aria-label="Revenue range"]')!.getBoundingClientRect()
      // The first visible text in reading order (visually hidden text excluded).
      const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT)
      const visible: Text[] = []
      for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent!.trim() && !node.parentElement!.closest(".sr-only") && node.parentElement!.getClientRects().length) visible.push(node as Text)
      const firstVisible = visible[0]!.parentElement
      const metrics = Array.from(section.querySelectorAll("dl > div"), el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { top: r.top, height: r.height, borderLeft: s.borderLeftWidth, borderRight: s.borderRightWidth, borderColor: s.borderRightColor, background: s.backgroundColor, radius: s.borderTopLeftRadius, shadow: s.boxShadow } })
      const t = document.createElement("span"); t.style.color = "var(--border)"; document.body.append(t); const border = getComputedStyle(t).color; t.remove()
      return {
        cardTop: card.top, cardHeight: card.height, groupTop: group.top,
        firstVisible: [firstVisible!.closest('[aria-label="Revenue range"]')?.getAttribute("aria-label") ?? firstVisible!.outerHTML.slice(0, 80), firstVisible!.textContent],
        heading: Array.from(section.querySelectorAll("h2"), h => ({ text: h.textContent, width: h.getBoundingClientRect().width })),
        text: visible.map(node => node.textContent!.trim()).join(" "),
        metrics, border,
        areas: section.querySelectorAll(".recharts-area").length,
        dashed: section.querySelectorAll('.recharts-area-curve[stroke-dasharray]').length,
        stroke: section.querySelector(".recharts-area-curve")?.getAttribute("stroke"),
        ticks: Array.from(section.querySelectorAll(".recharts-cartesian-axis-tick-value"), el => el.textContent),
        caption: section.querySelector("figcaption")!.textContent,
      }
    })
    const month = await shape()
    // Tabs are the first visible content; the title and subtitle are not shown (the heading is visually hidden).
    expect(month.firstVisible).toEqual(["Revenue range", "Week"])
    // ...and the range group sits at the top of the card, one card padding below its edge.
    expect(month.groupTop - month.cardTop).toBeLessThanOrEqual(32)
    expect(month.heading).toEqual([{ text: "Studio revenue", width: 1 }])
    expect(month.text).not.toMatch(/Studio revenue|Income against costs|Costs/)
    // Three metrics on one row, no nested card surface; the two dividers are the semantic border token.
    expect(month.metrics).toHaveLength(3)
    for (const metric of month.metrics) { close(metric.top, month.metrics[0]!.top); expect(metric).toMatchObject({ background: "rgba(0, 0, 0, 0)", radius: "0px", shadow: "none" }) }
    expect(month.metrics.map(metric => metric.borderRight)).toEqual(["1px", "1px", "0px"])
    expect(month.metrics.map(metric => metric.borderLeft)).toEqual(["0px", "0px", "0px"])
    for (const metric of month.metrics.slice(0, 2)) expect(metric.borderColor).toBe(month.border)
    expect(month.text).toMatch(/Revenue[\s\S]*Margin[\s\S]*Invoices paid/)
    // One primary Revenue area, no dashed series or legend; no x-axis labels in any range, while the text summary follows it.
    expect(month).toMatchObject({ areas: 1, dashed: 0, stroke: "var(--color-revenue)", ticks: [] })
    expect(month.caption).toMatch(/^Revenue this month: W1 /)
    // Keyboard: the range group is a single tab stop with arrow roving; Space selects; height is stable for every range.
    await revenue.getByRole("radio", { name: "Month" }).focus()
    await page.keyboard.press("ArrowRight")
    await expect(revenue.getByRole("radio", { name: "Quarter" })).toBeFocused()
    await expect.poll(() => revenue.getByRole("radio", { name: "Quarter" }).evaluate(el => el.matches(":focus-visible") && getComputedStyle(el).boxShadow.includes("3px"))).toBe(true)
    await page.keyboard.press("Space")
    await expect(revenue.getByRole("radio", { name: "Quarter" })).toHaveAttribute("aria-checked", "true")
    await expect.poll(async () => (await shape()).caption).toMatch(/^Revenue this quarter: Jul /)
    expect((await shape()).ticks).toEqual([])
    close((await shape()).cardHeight, month.cardHeight, 0.5)
    // Roving focus settles asynchronously, so each arrow step is confirmed before the next.
    for (const name of ["Month", "Week"]) {
      await page.keyboard.press("ArrowLeft")
      await expect(revenue.getByRole("radio", { name })).toBeFocused()
    }
    await page.keyboard.press("Space")
    await expect.poll(async () => (await shape()).caption).toMatch(/^Revenue this week: Mon /)
    expect((await shape()).ticks).toEqual([])
    close((await shape()).cardHeight, month.cardHeight, 0.5)
    await info.attach("cgcr-05-revenue.json", { body: JSON.stringify(month, null, 2), contentType: "application/json" })
    await info.attach("cgcr-05-revenue.png", { body: await revenue.screenshot(), contentType: "image/png" })
  })
})

test.describe("CGCR-08 theme responsiveness", () => {
  for (const themeId of ["default", "quiet-editorial"] as const) {
    for (const mode of ["light", "dark"] as const) {
      test(`${themeId} ${mode}: curated cards resolve live tokens and pass decoded axe`, async ({ page }, info) => {
        test.setTimeout(90_000)
        await open(page)
        if (themeId !== "default") await selectTheme(page, themeId)
        await setColorMode(page, mode)
        await workspaceMode(page, "Preview")
        const frame = previewFrame(page)
        await page.mouse.move(0, 0)
        await expect.poll(() => frame.locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
        const resolved = await frame.locator("html").evaluate(() => {
          const as = (value: string) => { const t = document.createElement("span"); t.style.color = value; document.body.append(t); const c = getComputedStyle(t).color; t.remove(); return c }
          const segment = document.querySelector('[data-composition="plan-usage"] [role=img] > span')!
          const day = document.querySelector('[data-composition="offsite-calendar"] [data-range-start="true"]')!
          const divider = document.querySelector('[data-composition="revenue-overview"] dl > div')!
          return {
            segment: [getComputedStyle(segment).backgroundColor, as("var(--chart-1)")],
            day: [getComputedStyle(day).backgroundColor, as("var(--primary)")],
            divider: [getComputedStyle(divider).borderRightColor, as("var(--border)")],
          }
        })
        for (const [name, [actual, expected]] of Object.entries(resolved)) expect(actual, name).toBe(expected)
        await info.attach(`cgcr-08-${themeId}-${mode}.json`, { body: JSON.stringify(resolved, null, 2), contentType: "application/json" })
        await axe(page, info, `theme-${themeId}-${mode}`)
        await info.attach(`cgcr-08-${themeId}-${mode}.png`, { body: await page.screenshot(), contentType: "image/png" })
      })
    }
  }
})
