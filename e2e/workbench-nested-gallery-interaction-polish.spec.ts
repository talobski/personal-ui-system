import AxeBuilder from "@axe-core/playwright"
import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import type { Locator, Page, TestInfo } from "@playwright/test"

import { prepareCommand } from "./design-command-fixture"
import { flatGalleryRegression } from "./fixtures/flat-gallery-regression"
import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { editorCategory, isMobileShell, previewView, saveTheme, selectTheme, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * workbench-nested-gallery-interaction-polish-v1-001 producer definitions (Lead-executed under
 * playwright.workbench.config.ts at 390x844 and 1440x900; the 1100px medium gallery case runs in the desktop project).
 * NGIP-03 to NGIP-05 nested gallery, NGIP-07 preview Tabs, NGIP-08 Body trigger typography, NGIP-09 built-in sans
 * Heading, NGIP-11 toolbar grouping, and NGIP-12/13 picker debounce, flush, latest-value, lifecycle, and history.
 * Every axe run is decoded: serious/critical findings outside the pre-approved Default muted debt must be empty.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const activeStyle = (page: Page) => page.locator("#workbench-active-theme")
const revision = async (page: Page) => Number(await activeStyle(page).getAttribute("data-revision"))
const history = (page: Page, name: "Undo" | "Redo" | "Reset") => page.getByTestId("history-controls").getByRole("button", { name, exact: true })
const css = (el: Locator, property: string) => el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)
const box = async (el: Locator) => (await el.boundingBox())!
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)

/** PUI-86–92 recipe in the PUI-97 order (migrated from PUI-78/79/83): the left stack, then the right region top to bottom. */
const GALLERY_ORDER = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing", "revenue-overview", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "local-weather"]
const REGIONS = { left: ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing"], right: ["revenue-overview", "team-chat", "recent-activity", "recent-payments", "offsite-calendar", "local-weather"] }
/** Right-region flow: full items and the local pairs, each followed by exactly one gap. */
const RIGHT_FLOW = [["revenue-overview"], ["team-chat", "recent-activity"], ["recent-payments"], ["offsite-calendar", "local-weather"]]
/** Each local pair's own region-width query: chat 32rem (512px), Calendar / Weather 42rem (672px, PUI-97). */
const PAIR_QUERY: Record<string, number> = { "team-chat": 512, "offsite-calendar": 672 }

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `ngip-${label}`)
  await info.attach(`axe-ngip-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
  expect(blocking.filter(v => v.impact === "critical" || v.impact === "serious"), label).toEqual([])
}

async function open(page: Page) {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

test.describe("NGIP-03 to NGIP-06 nested gallery regions", () => {
  test("NGIP-03 the frozen flat grid reproduces global-row dead space; the nested gallery packs Quick Find under Storage", async ({ page }, info) => {
    // The frozen a33c3d0 reproduction: a taller default item holds the shared row, so the next wide item waits for it.
    await page.setViewportSize({ width: 1200, height: 900 })
    await page.setContent(flatGalleryRegression)
    const old = await page.evaluate(() => {
      const rect = (id: string) => document.getElementById(id)!.getBoundingClientRect()
      return { weekBottom: rect("week").bottom, profileBottom: rect("profile").bottom, teamTop: rect("team").top }
    })
    const oldGap = old.teamTop - old.weekBottom
    expect(oldGap).toBe(324)
    expect(old.teamTop).toBe(old.profileBottom + 24)

    await page.setViewportSize({ width: 1440, height: 900 })
    await open(page)
    await workspaceMode(page, "Preview")
    const rects = await previewFrame(page).locator("html").evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll("[data-composition]")).map(el => {
      const r = el.getBoundingClientRect()
      return [el.getAttribute("data-composition")!, { top: r.top, bottom: r.bottom, left: r.left, height: r.height }]
    })))
    // Storage and Revenue Overview start together, yet Quick Find follows Storage by exactly one 16px gap (PUI-81)
    // whatever the right region's height: the regions no longer share a row.
    const fixed = rects["quick-find"]!.top - rects["plan-usage"]!.bottom
    await info.attach("ngip-03-dead-space.json", { body: JSON.stringify({ old: { ...old, gap: oldGap }, nested: { gap: fixed, rects } }, null, 2), contentType: "application/json" })
    close(rects["revenue-overview"]!.top, rects["plan-usage"]!.top)
    close(fixed, 16)
    // Storage plus one gap can coincide with Studio revenue's height, so independence is shown directly: a much taller
    // revenue card leaves Quick Find exactly where it was.
    const frame = previewFrame(page)
    await frame.locator('[data-composition="revenue-overview"] > [data-slot="card"]').evaluate(el => { (el as HTMLElement).style.minHeight = "1200px" })
    const quickFind = await frame.locator('[data-composition="quick-find"]').evaluate(el => el.getBoundingClientRect().top)
    const revenueBottom = await frame.locator('[data-composition="revenue-overview"]').evaluate(el => el.getBoundingClientRect().bottom)
    close(quickFind, rects["quick-find"]!.top)
    expect(quickFind).toBeLessThan(revenueBottom - 600)
  })

  const layout = (page: Page) =>
    previewFrame(page).locator("html").evaluate(() => {
      const gallery = document.querySelector("[data-gallery]")!
      const frame = gallery.firstElementChild!
      const rect = (el: Element) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) } }
      const items = Array.from(gallery.querySelectorAll("[data-composition]")).map(el => ({
        id: el.getAttribute("data-composition")!,
        region: el.closest("[data-gallery-region]")!.getAttribute("data-gallery-region")!,
        grouped: el.parentElement!.hasAttribute("data-gallery-group"),
        ...rect(el),
        cardHeight: Math.round(el.firstElementChild!.getBoundingClientRect().height),
        aspect: getComputedStyle(el).aspectRatio,
        scroll: el.scrollWidth,
        client: el.clientWidth,
        placement: [getComputedStyle(el).gridColumnStart, getComputedStyle(el).gridRowStart],
      }))
      const regions = Object.fromEntries(Array.from(gallery.querySelectorAll("[data-gallery-region]")).map(el => [el.getAttribute("data-gallery-region")!, { ...rect(el), display: getComputedStyle(el).display, direction: getComputedStyle(el).flexDirection, gap: getComputedStyle(el).rowGap, container: getComputedStyle(el).containerType }]))
      const groups = Array.from(gallery.querySelectorAll("[data-gallery-group]")).map(el => ({ columns: getComputedStyle(el).gridTemplateColumns.split(" ").length, align: getComputedStyle(el).alignItems }))
      return {
        width: innerWidth,
        overflow: document.documentElement.scrollWidth > innerWidth,
        gallery: { ...rect(gallery), container: getComputedStyle(gallery).containerType, name: getComputedStyle(gallery).containerName },
        frame: { columns: getComputedStyle(frame).gridTemplateColumns.split(" ").length, rows: getComputedStyle(frame).gridTemplateRows.split(" ").length, flow: getComputedStyle(frame).gridAutoFlow, align: getComputedStyle(frame).alignItems, gap: getComputedStyle(frame).rowGap },
        regions,
        groups,
        items,
      }
    })

  for (const size of [{ width: 390, height: 844 }, { width: 1100, height: 900 }, { width: 1440, height: 900 }]) {
    test(`NGIP-04/05 regions, order, natural heights, containment, focus order at ${size.width}px`, async ({ page }, info) => {
      test.skip(size.width === 1100 && isMobileShell(page), "the 1100px medium check runs once, in the desktop project")
      test.setTimeout(120_000)
      if (size.width !== page.viewportSize()!.width) await page.setViewportSize(size)
      await open(page)
      await workspaceMode(page, "Preview")
      const result = await layout(page)
      await info.attach(`ngip-layout-${size.width}.json`, { body: JSON.stringify(result, null, 2), contentType: "application/json" })
      // Thresholds are the gallery container's own width (CGS-03), not the viewport.
      const w = result.gallery.width
      const split = w >= 672, wide = w >= 896
      if (size.width === 390) expect([split, wide]).toEqual([false, false])
      if (size.width === 1100) expect([split, wide]).toEqual([false, false])
      if (size.width === 1440) expect([split, wide]).toEqual([true, true])
      // PUI-81: every gallery gap is 16px at every width (the earlier 24px wide gap is superseded).
      const gap = 16

      // Explicit nested regions: a named container, a one-row frame, two independent stacks, and local groups.
      expect(result.gallery).toMatchObject({ container: "inline-size", name: "gallery" })
      expect(result.frame).toMatchObject({ columns: split ? 12 : 1, flow: "row", align: "flex-start", gap: `${gap}px` })
      if (split) expect(result.frame.rows).toBe(1)
      for (const name of ["left", "right"]) expect(result.regions[name]).toMatchObject({ display: "flex", direction: "column", gap: `${gap}px`, container: "inline-size" })
      // PUI-82: each local pair stretches (side by side only; see the pair checks below). PUI-97 adds the second pair.
      expect(result.groups).toHaveLength(2)
      result.groups.forEach((group, index) => expect(group).toMatchObject({ columns: result.regions.right!.width >= [512, 672][index]! ? 2 : 1, align: "stretch" }))
      expect(result.items.map(item => item.id)).toEqual(GALLERY_ORDER)
      for (const [region, ids] of Object.entries(REGIONS)) expect(result.items.filter(item => item.region === region).map(item => item.id)).toEqual(ids)

      // Natural heights, no per-item placement, and containment.
      expect(result.overflow).toBe(false)
      for (const item of result.items) {
        expect(item.aspect, item.id).toBe("auto")
        expect(item.placement, item.id).toEqual(["auto", "auto"])
        close(item.height, item.cardHeight)
        expect(item.x, item.id).toBeGreaterThanOrEqual(result.gallery.x)
        expect(item.right, item.id).toBeLessThanOrEqual(result.gallery.right)
        expect(item.scroll, item.id).toBeLessThanOrEqual(item.client + 1)
      }
      // Eleven natural-height cards. The side-by-side pair shares a height by design (PUI-82), and Quick find and Studio
      // revenue can coincide at some widths; exact natural-height proofs are in workbench-cards-gallery-curation.spec.ts.
      expect(new Set(result.items.map(item => item.height)).size).toBeGreaterThanOrEqual(6)

      // Independent stacks: every left card starts one gap after its predecessor; every right step follows the tallest
      // item of the previous full item or local group by one gap.
      const at = (id: string) => result.items.find(item => item.id === id)!
      for (let i = 1; i < REGIONS.left.length; i++) close(at(REGIONS.left[i]!).y - at(REGIONS.left[i - 1]!).bottom, gap)
      for (let i = 1; i < RIGHT_FLOW.length; i++) {
        const previous = Math.max(...RIGHT_FLOW[i - 1]!.map(id => at(id).bottom))
        // A side-by-side group starts together; a stacked group's second item is checked with the pairs below.
        const step = RIGHT_FLOW[i]!
        for (const id of step.length === 2 && result.regions.right!.width >= PAIR_QUERY[step[0]!]! ? step : step.slice(0, 1)) close(at(id).y - previous, gap)
      }
      const left = result.regions.left!, right = result.regions.right!
      if (split) {
        close(left.y, right.y)
        close(right.x - left.right, gap)
        if (wide) expect(right.width).toBeGreaterThan(left.width * 1.3)
      } else {
        close(left.x, right.x)
        close(right.y - left.bottom, gap)
      }
      for (const pair of RIGHT_FLOW.filter(step => step.length === 2)) {
        const [a, b] = pair.map(at)
        if (result.regions.right!.width >= PAIR_QUERY[pair[0]!]!) { close(a!.y, b!.y); expect(b!.x).toBeGreaterThan(a!.right); close(a!.cardHeight, b!.cardHeight) } else close(b!.y - a!.bottom, gap)
      }

      // DOM order is reading order within each region, and keyboard focus visits compositions in DOM order.
      const frame = previewFrame(page)
      await frame.getByRole("tabpanel", { name: "Cards", exact: true }).focus()
      const visited: string[] = []
      for (let step = 0; step < 400; step++) {
        await page.keyboard.press("Tab")
        const where = await frame.locator("html").evaluate(() => {
          const active = document.activeElement
          return active?.closest("[data-gallery]") ? active.closest("[data-composition]")?.getAttribute("data-composition") ?? "gallery" : null
        })
        if (where === null) { if (visited.length > 0) break; continue }
        if (visited.at(-1) !== where) visited.push(where)
      }
      // Every composition that owns a tabbable control is visited once, in gallery DOM order.
      const tabbable = await frame.locator("[data-composition]").evaluateAll(nodes => nodes.filter(node => Array.from(node.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")).some(el => el.tabIndex >= 0 && !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0)).map(node => node.getAttribute("data-composition")!))
      // Read-only Storage, Weather and Recent activity own no tab stop; PUI-95/96 give Chat a composer and the compact
      // Table its checkboxes and row actions.
      expect(tabbable).toEqual(["quick-find", "productive-week", "signup-form", "now-playing", "revenue-overview", "team-chat", "recent-payments", "offsite-calendar"])
      expect(visited).toEqual(tabbable)

      await axe(page, info, `gallery-${size.width}-light`)
      await setColorMode(page, "dark")
      await axe(page, info, `gallery-${size.width}-dark`)
      await info.attach(`ngip-gallery-${size.width}.png`, { body: await page.screenshot(), contentType: "image/png" })
    })
  }
})

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`NGIP-07 Cards / States Tabs: left aligned, shared sidebar styling, keyboard, ARIA, focus (${reducedMotion})`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion })
    await open(page)
    let sidebar: { active: string[]; inactive: string[] } | null = null
    const shape = (el: Locator) => el.evaluate(node => {
      const c = getComputedStyle(node)
      return [c.backgroundColor, c.color, c.fontFamily, c.fontSize, c.fontWeight, c.letterSpacing, c.paddingLeft, c.paddingRight, c.borderTopLeftRadius, c.cursor, String(Math.round(node.getBoundingClientRect().height))]
    })
    if (!isMobileShell(page)) {
      await editorCategory(page, "Colors")
      await page.mouse.move(0, 0)
      await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
      const tabs = page.getByRole("tablist", { name: "Editor categories" })
      sidebar = { active: await shape(tabs.getByRole("tab", { name: "Colors", exact: true })), inactive: await shape(tabs.getByRole("tab", { name: "Typography", exact: true })) }
    }
    await workspaceMode(page, "Preview")
    await page.mouse.move(0, 0)
    const frame = previewFrame(page)
    const list = frame.getByRole("tablist", { name: "Preview views" })
    const cards = list.getByRole("tab", { name: "Cards", exact: true }), states = list.getByRole("tab", { name: "States", exact: true })
    const designSystem = list.getByRole("tab", { name: "Design system", exact: true }), appShells = list.getByRole("tab", { name: "App shells", exact: true })
    // PUI-101/102: the final order is Cards / Design system / App shells / States.
    await expect(list.getByRole("tab")).toHaveText(["Cards", "Design system", "App shells", "States"])
    // The preview's first theme message transitions colours; compare only settled styles.
    await expect.poll(() => frame.locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
    await expect(frame.getByRole("combobox", { name: "Preview views" })).toHaveCount(0)
    expect(await list.getAttribute("aria-orientation")).toBe("horizontal")
    await expect(cards).toHaveAttribute("aria-selected", "true")
    await expect(states).toHaveAttribute("aria-selected", "false")
    const panel = frame.getByRole("tabpanel", { name: "Cards", exact: true })
    await expect(panel).toBeVisible()
    expect(await cards.getAttribute("aria-controls")).toBe(await panel.getAttribute("id"))

    // Left aligned at the preview inset on every viewport.
    const main = frame.getByTestId("preview")
    close((await box(list)).x, (await box(main)).x + parseFloat(await css(main, "padding-left")))
    // Content width, never stretched: the four triggers (PUI-101/102) fill the list exactly and fit inside the inset.
    const triggers = await list.getByRole("tab").evaluateAll(els => els.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0))
    close((await box(list)).width, triggers, 2)
    expect((await box(list)).width).toBeLessThanOrEqual((await box(main)).width - 2 * parseFloat(await css(main, "padding-left")))
    if (sidebar) {
      expect(await shape(cards)).toEqual(sidebar.active)
      expect(await shape(states)).toEqual(sidebar.inactive)
    }
    expect(await css(states, "cursor")).toBe("pointer")

    // Pointer switches immediately; each panel keeps its content.
    await states.click()
    await expect(states).toHaveAttribute("aria-selected", "true")
    await expect(frame.getByRole("heading", { name: "Button", exact: true })).toBeVisible()
    await expect(frame.locator("[data-gallery]")).toBeHidden()
    await cards.click()
    await expect(frame.locator("[data-composition]")).toHaveCount(GALLERY_ORDER.length)
    await expect(frame.locator("[data-gallery]")).toBeVisible()

    // Keyboard: automatic activation with arrows/Home/End, a visible focus ring, and a single tab stop.
    await page.keyboard.press("Tab")
    await cards.focus()
    await expect.poll(() => cards.evaluate(el => el.matches(":focus-visible"))).toBe(true)
    await expect.poll(() => css(cards, "box-shadow")).toContain("3px")
    expect(await states.getAttribute("tabindex")).toBe("-1")
    await page.keyboard.press("ArrowRight")
    await expect(designSystem).toBeFocused()
    await expect(designSystem).toHaveAttribute("aria-selected", "true")
    await expect(frame.getByRole("tabpanel", { name: "Design system", exact: true })).toBeVisible()
    await page.keyboard.press("ArrowRight")
    await expect(appShells).toBeFocused()
    await expect(frame.getByRole("tabpanel", { name: "App shells", exact: true })).toBeVisible()
    await page.keyboard.press("ArrowRight")
    await expect(states).toBeFocused()
    await expect(states).toHaveAttribute("aria-selected", "true")
    await expect(frame.getByRole("tabpanel", { name: "States", exact: true })).toBeVisible()
    await page.keyboard.press("Home")
    await expect(cards).toBeFocused()
    await expect(cards).toHaveAttribute("aria-selected", "true")
    await page.keyboard.press("End")
    await expect(states).toHaveAttribute("aria-selected", "true")
    await page.keyboard.press("ArrowLeft")
    await expect(appShells).toHaveAttribute("aria-selected", "true")
    await page.keyboard.press("Home")
    await expect(cards).toHaveAttribute("aria-selected", "true")
    await page.keyboard.press("Tab")
    await expect(panel).toBeFocused()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await axe(page, info, `tabs-${reducedMotion}`)
  })
}

test.describe("NGIP-08/09 Body trigger typography and built-in sans Heading", () => {
  const trigger = (page: Page, id = "type-heading") => page.getByTestId(`section-${id}`).locator("h3 > button")
  const bodyStyle = (page: Page) => page.locator("body").evaluate(el => { const s = getComputedStyle(el); return { family: s.fontFamily, weight: s.fontWeight, tracking: s.letterSpacing } })

  for (const themeId of ["default", "quiet-editorial"] as const) {
    for (const mode of ["light", "dark"] as const) {
      test(`${themeId} ${mode}: every shared trigger resolves Body; semantic titles keep Heading; Heading equals the sans Body stack`, async ({ page }, info) => {
        await open(page)
        await setColorMode(page, mode)
        if (themeId !== "default") await selectTheme(page, themeId)
        await editorCategory(page, "Typography")
        const body = await bodyStyle(page)
        expect(body.weight).toBe("400")
        const sections = page.locator('[data-testid^="section-"]:visible > h3 > button')
        expect(await sections.count()).toBeGreaterThanOrEqual(3)
        for (const section of await sections.all()) {
          const s = await section.evaluate(el => { const c = getComputedStyle(el); return { family: c.fontFamily, weight: c.fontWeight, tracking: c.letterSpacing, transform: c.textTransform, size: c.fontSize, radius: c.borderTopLeftRadius, cursor: c.cursor } })
          expect(s).toMatchObject({ family: body.family, weight: body.weight, tracking: body.tracking, transform: "uppercase", size: "11px", cursor: "pointer" })
        }
        expect(await trigger(page).locator("svg").count()).toBe(1)
        await trigger(page).focus()
        await trigger(page).press("Enter")
        await expect(trigger(page)).toHaveAttribute("aria-expanded", "false")
        await trigger(page).press("Space")
        await expect(trigger(page)).toHaveAttribute("aria-expanded", "true")

        // NGIP-09: the built-in Heading is its own sans Body stack, shown as the default sans-serif family.
        const fontCopy = (role: string) => page.getByTestId(`control-font-${role}`).getByRole("combobox")
        await expect(fontCopy("heading")).toHaveText((await fontCopy("body").innerText()).trim())
        if (themeId === "default") await expect(fontCopy("heading")).toHaveText("Sans-serif font...")
        await workspaceMode(page, "Preview")
        const frame = previewFrame(page)
        const title = frame.locator('[data-composition="plan-usage"] h2')
        const previewBody = await frame.locator("body").evaluate(el => getComputedStyle(el).fontFamily)
        expect(await css(title, "font-family")).toBe(previewBody)
        expect(await css(title, "font-weight")).toBe("600")
        await axe(page, info, `typography-${themeId}-${mode}`)
      })
    }
  }

  test("changing Body restyles triggers; a manual serif Heading stays valid and does not reach triggers", async ({ page }) => {
    await open(page)
    await editorCategory(page, "Typography")
    const choose = async (role: "Heading" | "Body", name: string) => {
      await page.getByRole("combobox", { name: `${role} Font`, exact: true }).click()
      await page.getByRole("combobox", { name: `Search ${role} fonts`, exact: true }).fill(name)
      await page.getByRole("option", { name, exact: true }).click()
    }
    await choose("Body", "Manrope")
    await expect.poll(() => css(trigger(page), "font-family")).toContain("Manrope")
    await choose("Heading", "Playfair Display")
    await expect(page.getByTestId("control-font-heading")).toHaveAttribute("data-font", "playfair-display")
    expect(await css(trigger(page), "font-family")).not.toContain("Playfair")
    await workspaceMode(page, "Preview")
    await expect.poll(() => css(previewFrame(page).locator('[data-composition="plan-usage"] h2'), "font-family")).toContain("Playfair Display")
  })
})

for (const mode of ["light", "dark"] as const) {
  test(`NGIP-11 toolbar grouping, short separator, enabled-only pointer, Export label and payload (${mode})`, async ({ page }, info) => {
    await open(page)
    await setColorMode(page, mode)
    await workspaceMode(page, "Preview")
    const toolbar = page.getByTestId("workbench-toolbar")
    const toolbarBox = await box(toolbar)
    expect(toolbarBox.height).toBe(64)
    const names = await toolbar.locator("button, [role=separator]").evaluateAll(els => els.map(el => el.getAttribute("role") === "separator" ? "|" : el.getAttribute("aria-label") ?? el.textContent!.trim()))
    const from = names.indexOf("Undo")
    expect(names.slice(from, from + 6)).toEqual(["Undo", "Redo", "Reset", "|", "Export", "Save"])
    await expect(toolbar.getByRole("button", { name: /Export JSON/ })).toHaveCount(0)
    const exportButton = toolbar.getByRole("button", { name: "Export", exact: true })
    await expect(exportButton).toHaveAttribute("title", "Export")
    if (isMobileShell(page)) await expect(exportButton.getByText("Export")).toHaveClass(/sr-only/)
    else await expect(exportButton).toHaveText("Export")

    // A semantic vertical separator: button height, centred, border token, between Reset and Export. PUI-80 adds a
    // matching one after the colour-mode Switch (checked in CGS-10), so this targets the Reset/Export boundary.
    await expect(toolbar.getByRole("separator")).toHaveCount(2)
    const separator = toolbar.getByRole("separator").nth(1)
    await expect(separator).toHaveAttribute("aria-orientation", "vertical")
    const s = await box(separator), reset = await box(history(page, "Reset")), exp = await box(exportButton)
    expect(s.width).toBe(1)
    close(s.height, reset.height)
    expect(s.height).toBeLessThan(toolbarBox.height / 2 + 1)
    close(s.y + s.height / 2, toolbarBox.y + toolbarBox.height / 2)
    expect(s.x).toBeGreaterThanOrEqual(reset.x + reset.width)
    expect(s.x + s.width).toBeLessThanOrEqual(exp.x)
    expect(await css(separator, "background-color")).toBe(await separator.evaluate(el => {
      const probe = document.createElement("div")
      probe.style.backgroundColor = "var(--border)"
      el.parentElement!.append(probe)
      const value = getComputedStyle(probe).backgroundColor
      probe.remove()
      return value
    }))
    expect(await toolbar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

    // Disabled recovery actions keep default cursor and disabled semantics; enabled ones show a pointer.
    for (const name of ["Undo", "Redo", "Reset"] as const) {
      await expect(history(page, name)).toBeDisabled()
      expect(await css(history(page, name), "cursor"), name).toBe("default")
      expect(await css(history(page, name), "pointer-events"), name).toBe("none")
    }
    await editorCategory(page, "Geometry")
    const radius = page.getByRole("textbox", { name: "Radius", exact: true })
    await radius.fill("0.5")
    await radius.blur()
    await workspaceMode(page, "Preview")
    for (const name of ["Undo", "Reset"] as const) {
      await expect(history(page, name)).toBeEnabled()
      expect(await css(history(page, name), "cursor"), name).toBe("pointer")
    }
    await history(page, "Undo").click()
    await expect(history(page, "Redo")).toBeEnabled()
    expect(await css(history(page, "Redo"), "cursor")).toBe("pointer")

    // Keyboard order is unchanged: Reset, then Export, then Save (the separator is not focusable).
    await history(page, "Redo").click()
    await history(page, "Reset").focus()
    await page.keyboard.press("Tab")
    await expect(exportButton).toBeFocused()
    await expect.poll(() => css(exportButton, "box-shadow")).toContain("3px")
    await page.keyboard.press("Tab")
    await expect(toolbar.getByRole("button", { name: "Save", exact: true })).toBeFocused()

    // Label-only rename: the payload is the same canonical JSON file.
    const download = page.waitForEvent("download")
    await exportButton.click()
    const file = await download
    expect(file.suggestedFilename()).toMatch(/\.json$/)
    const exported = JSON.parse(readFileSync((await file.path())!, "utf8"))
    expect(exported).toMatchObject({ id: "default", schemaVersion: "3.0" })
    expect(exported.radius.base.$value).toMatch(/^0\.5/)
    await axe(page, info, `toolbar-${mode}`)
  })
}

/**
 * Drives one picker from inside the page so event timing is exact: each `input` step sets the native value and fires the
 * native `input` event exactly as a picker drag does. Returns every active-revision change and a sample after each
 * movement, all timed from the first step. `click`/`focus` targets are resolved by accessible label, text, or selector.
 */
type Step = ["input", string] | ["wait", number] | ["change"] | ["pointerup"] | ["focus-picker"] | ["blur"] | ["focus", string] | ["click", string]
async function drive(page: Page, testId: string, steps: Step[]) {
  return page.evaluate(async ({ testId, steps }) => {
    const input = document.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)!
    const style = document.getElementById("workbench-active-theme")!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!
    const find = (target: string) => document.querySelector<HTMLElement>(target) ?? Array.from(document.querySelectorAll<HTMLElement>("button")).find(el => el.getAttribute("aria-label") === target || el.textContent!.trim() === target)!
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    const t0 = performance.now()
    const now = () => performance.now() - t0
    const initial = Number(style.getAttribute("data-revision"))
    const revisions: { at: number; revision: number }[] = []
    const observer = new MutationObserver(() => revisions.push({ at: now(), revision: Number(style.getAttribute("data-revision")) }))
    observer.observe(style, { attributes: true, attributeFilter: ["data-revision"] })
    const samples: { at: number; local: string; revision: number }[] = []
    const marks: Record<string, number> = {}
    for (const [kind, arg] of steps) {
      if (kind === "input") {
        setter.call(input, arg)
        input.dispatchEvent(new Event("input", { bubbles: true }))
        marks.lastInput = now()
        await Promise.resolve()
        samples.push({ at: now(), local: input.value, revision: Number(style.getAttribute("data-revision")) })
      } else if (kind === "wait") await sleep(arg)
      else if (kind === "change") { marks.complete = now(); input.dispatchEvent(new Event("change", { bubbles: true })) }
      else if (kind === "pointerup") { marks.complete = now(); input.dispatchEvent(new PointerEvent("pointerup", { bubbles: true })) }
      else if (kind === "focus-picker") input.focus()
      else if (kind === "blur") { marks.complete = now(); input.blur() }
      else if (kind === "focus") { marks.complete = now(); find(arg).focus() }
      else if (kind === "click") { marks.complete = now(); find(arg).click() }
    }
    await sleep(400)
    observer.disconnect()
    return { initial, revisions, samples, marks, final: Number(style.getAttribute("data-revision")), local: input.value }
  }, { testId, steps })
}

const RED = "oklch(0.627955 0.257683 29.23388)"
const primaryText = (page: Page) => page.getByRole("textbox", { name: "Primary", exact: true })

test.describe("NGIP-12/13 picker debounce, flush, latest value, lifecycle, and history", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`immediate local feedback, 120ms latest-wins commit, one checkpoint across a pause (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      await editorCategory(page, "Colors")
      const original = await primaryText(page).inputValue()
      const moves = ["#102030", "#203040", "#304050", "#ff0000"]
      const run = await drive(page, "color-primary-picker", moves.flatMap((hex): Step[] => [["input", hex], ["wait", 40]]))
      await info.attach(`ngip-12-debounce-${mode}.json`, { body: JSON.stringify(run, null, 2), contentType: "application/json" })
      // Local swatch follows each movement at once, while no canonical write happens during continuous movement.
      expect(run.samples.map(sample => sample.local)).toEqual(moves)
      expect(run.samples.every(sample => sample.revision === run.initial)).toBe(true)
      // Exactly one canonical write, ~120ms after the latest movement, carrying the latest value.
      expect(run.revisions).toHaveLength(1)
      const delay = run.revisions[0]!.at - run.marks.lastInput!
      expect(delay).toBeGreaterThanOrEqual(110)
      expect(delay).toBeLessThanOrEqual(220)
      expect(run.revisions[0]!.revision).toBe(run.initial + 1)
      await expect(primaryText(page)).toHaveValue(RED)
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", String(run.initial + 1))
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")

      // The same gesture continues after a pause and completes on change: still one revision and one checkpoint.
      const more = await drive(page, "color-primary-picker", [["input", "#00ff00"], ["wait", 200], ["input", "#ff0000"], ["change"]])
      expect(more.final).toBe(run.initial + 1)
      expect(more.revisions.every(entry => entry.revision === run.initial + 1)).toBe(true)
      await expect(primaryText(page)).toHaveValue(RED)
      await workspaceMode(page, "Preview")
      await expect(history(page, "Undo")).toBeEnabled()
      await history(page, "Undo").click()
      await expect(history(page, "Undo")).toBeDisabled()
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
      await editorCategory(page, "Colors")
      await expect(primaryText(page)).toHaveValue(original)
      await expect(page.getByTestId("color-primary-picker")).not.toHaveValue("#ff0000")
      await workspaceMode(page, "Preview")
      await history(page, "Redo").click()
      await editorCategory(page, "Colors")
      await expect(primaryText(page)).toHaveValue(RED)
    })
  }

  const completions: [string, Step][] = [["change", ["change"]], ["pointerup", ["pointerup"]], ["blur", ["blur"]], ["text focus", ["focus", "#color-primary-input"]]]
  for (const [label, completion] of completions) {
    test(`${label} flushes the pending value immediately and nothing lands later`, async ({ page }) => {
      await open(page)
      await editorCategory(page, "Colors")
      const run = await drive(page, "color-primary-picker", [["focus-picker"], ["input", "#ff0000"], ["wait", 20], completion])
      expect(run.revisions).toHaveLength(1)
      expect(run.revisions[0]!.at - run.marks.complete!).toBeLessThan(60)
      expect(run.revisions[0]!.at - run.marks.lastInput!).toBeLessThan(110)
      await expect(primaryText(page)).toHaveValue(RED)
      await workspaceMode(page, "Preview")
      await expect(history(page, "Undo")).toBeEnabled()
      await history(page, "Undo").click()
      await expect(history(page, "Undo")).toBeDisabled()
    })
  }

  test("mode switch flushes into the edited mode only; nothing crosses into the other mode", async ({ page }) => {
    await open(page)
    await setColorMode(page, "dark")
    await editorCategory(page, "Colors")
    const dark = await primaryText(page).inputValue()
    await setColorMode(page, "light")
    await editorCategory(page, "Colors")
    const run = await drive(page, "color-primary-picker", [["input", "#ff0000"], ["wait", 20], ["click", "#color-mode-switch"]])
    expect(run.revisions).toHaveLength(1)
    expect(run.revisions[0]!.at - run.marks.complete!).toBeLessThan(60)
    await expect(page.locator("html")).toHaveClass(/dark/)
    await editorCategory(page, "Colors")
    await expect(primaryText(page)).toHaveValue(dark)
    await setColorMode(page, "light")
    await editorCategory(page, "Colors")
    await expect(primaryText(page)).toHaveValue(RED)
  })

  test("theme switch flushes into the leaving theme; the new theme receives no stale write", async ({ page }) => {
    await open(page)
    await editorCategory(page, "Colors")
    const quietPrimary = JSON.parse(readFileSync(new URL("../packages/core/src/theme/fixtures/valid.json", import.meta.url), "utf8")).colors.light.primary.$value
    // Moving to the theme select takes focus off the picker, which completes the gesture before `load` can run.
    const run = await drive(page, "color-primary-picker", [["focus-picker"], ["input", "#ff0000"], ["wait", 20], ["focus", "#theme-select"]])
    expect(run.revisions).toHaveLength(1)
    expect(run.revisions[0]!.at - run.marks.complete!).toBeLessThan(60)
    await selectTheme(page, "quiet-editorial")
    const settled = await revision(page)
    await page.waitForTimeout(400)
    expect(await revision(page)).toBe(settled)
    await editorCategory(page, "Colors")
    await expect(primaryText(page)).toHaveValue(quietPrimary)
    await workspaceMode(page, "Preview")
    await expect(history(page, "Undo")).toBeDisabled()
    await selectTheme(page, "default")
    await editorCategory(page, "Colors")
    await expect(primaryText(page)).toHaveValue(RED)
    await workspaceMode(page, "Preview")
    await history(page, "Undo").click()
    await expect(history(page, "Undo")).toBeDisabled()
  })

  test("command evaluation flushes first, stages against the flushed revision, locks pickers, and applies cleanly", async ({ page }) => {
    await open(page)
    await prepareCommand(page, [{ op: "setRadius", value: "1rem" }])
    const run = await drive(page, "color-primary-picker", [["input", "#ff0000"], ["wait", 20], ["click", "Evaluate"]])
    expect(run.revisions[0]!.revision).toBe(run.initial + 1)
    expect(run.revisions[0]!.at - run.marks.complete!).toBeLessThan(60)
    await expect(page.getByTestId("design-command-outcome")).toBeVisible()
    await expect(page.getByTestId("proposal-base-moved")).toHaveCount(0)
    // Locked: a picker event while staged neither shows nor writes anything.
    const locked = await drive(page, "color-primary-picker", [["input", "#00ff00"], ["wait", 200]])
    expect(locked.revisions).toEqual([])
    await expect(page.getByTestId("color-primary-picker")).toBeDisabled()
    await workspaceMode(page, "Preview")
    await page.getByRole("button", { name: "Apply proposal" }).click()
    await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
    await expect(activeStyle(page)).toHaveAttribute("data-revision", String(run.initial + 2))
    await editorCategory(page, "Colors")
    await expect(primaryText(page)).toHaveValue(RED)
    // Apply and the colour gesture are separate checkpoints.
    await workspaceMode(page, "Preview")
    await history(page, "Undo").click()
    await history(page, "Undo").click()
    await expect(history(page, "Undo")).toBeDisabled()
  })

  test("Export and Save flush the pending picker value into their payloads", async ({ page }) => {
    await open(page)
    await saveTheme(page, "Picker Flush")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, saved")
    await editorCategory(page, "Colors")
    const download = page.waitForEvent("download")
    await drive(page, "color-primary-picker", [["input", "#ff0000"], ["wait", 20], ["click", "Export"]])
    const exported = JSON.parse(readFileSync((await (await download).path())!, "utf8"))
    expect(exported.colors.light.primary.$value).toBe(RED)
    const saved = await drive(page, "color-primary-picker", [["input", "#00ff00"], ["wait", 20], ["click", "Save"]])
    expect(saved.revisions).toHaveLength(1)
    const stored = await page.evaluate(() => { const data = JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!); return data.themes[data.activeId].colors.light.primary.$value })
    expect(stored).not.toBe(RED)
    await expect(primaryText(page)).toHaveValue(stored)
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, saved")
  })

  test("the shadow colour picker shares the same debounce and single checkpoint", async ({ page }) => {
    await open(page)
    await editorCategory(page, "Effects")
    const run = await drive(page, "shadow-color-picker", [["input", "#102030"], ["wait", 40], ["input", "#ff0000"], ["wait", 40], ["change"]])
    expect(run.samples.map(sample => sample.revision)).toEqual([run.initial, run.initial])
    expect(run.revisions).toHaveLength(1)
    await expect(page.getByLabel("Shadow color", { exact: true })).toHaveValue(RED)
    await workspaceMode(page, "Preview")
    await history(page, "Undo").click()
    await expect(history(page, "Undo")).toBeDisabled()
  })
})
