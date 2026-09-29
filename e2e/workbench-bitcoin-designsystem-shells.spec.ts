import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { colorInput, editorCategory, isMobileShell, previewView, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * workbench-bitcoin-designsystem-shells-v1-001 producer definitions (Lead-executed under playwright.workbench.config.ts
 * at 390x844 and 1440x900; container sweeps run once, in the desktop project). WBDS-03/04 static Bitcoin 1Y card,
 * WBDS-05 Design system Colors, WBDS-06 Type scale, WBDS-07 standardized App shells. Every axe run is decoded:
 * serious/critical findings outside the pre-approved known debt must be empty.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
const box = async (el: Locator) => (await el.boundingBox())!
const css = (el: Locator, property: string) => el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)

async function open(page: Page) {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  await expect.poll(() => previewFrame(page).locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `wbds-${label}`)
  await info.attach(`axe-wbds-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
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

/** Horizontally overflowing surfaces (the document, a composition, a preview view); empty when contained. */
const overflowing = (frame: FrameLocator) => frame.locator("html").evaluate(() => [
  ...(document.documentElement.scrollWidth > innerWidth ? ["document"] : []),
  ...Array.from(document.querySelectorAll<HTMLElement>("[data-composition], [data-design-system], [data-design-section], [data-app-shell]")).filter(el => el.getClientRects().length > 0 && el.scrollWidth > el.clientWidth + 1).map(el => el.getAttribute("data-composition") ?? el.getAttribute("data-app-shell") ?? el.getAttribute("data-design-section") ?? "design-system"),
])

const EDITS = {
  light: { sidebar: "oklch(0.99 0.005 250)", accent: "oklch(0.9 0.02 150)" },
  dark: { sidebar: "oklch(0.25 0.02 250)", accent: "oklch(0.36 0.03 150)" },
} as const

async function sidebarTokens(page: Page, on: boolean) {
  await editorCategory(page, "Colors")
  const section = page.getByTestId("section-colors-sidebar")
  await section.scrollIntoViewIfNeeded()
  const toggle = section.getByRole("switch", { name: "Use sidebar tokens" })
  if ((await toggle.getAttribute("aria-checked")) !== String(on)) await toggle.click()
  await expect(toggle).toHaveAttribute("aria-checked", String(on))
}

test.describe("WBDS-03/04 static Bitcoin 1Y card (PUI-108)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`directly after Studio revenue, full width, identifier / 1Y / price / change, one dotted line only (${mode})`, async ({ page }, info) => {
      const external: string[] = []
      page.on("request", request => { if (!request.url().startsWith("http://127.0.0.1") && !request.url().startsWith("data:") && !request.url().startsWith("blob:")) external.push(request.url()) })
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const right = frame.locator('[data-gallery-region="right"]')
      expect(await right.locator("[data-composition]").evaluateAll(nodes => nodes.slice(0, 2).map(n => n.getAttribute("data-composition")))).toEqual(["revenue-overview", "bitcoin-price"])
      const card = frame.locator('[data-composition="bitcoin-price"]')
      // Full width of the right region, one 16px gap below Studio revenue, and a direct child of the region.
      const [region, revenue, bitcoin] = [await box(right), await box(frame.locator('[data-composition="revenue-overview"]')), await box(card)]
      close(bitcoin.x, region.x)
      close(bitcoin.width, region.width)
      close(bitcoin.y - (revenue.y + revenue.height), 16)
      expect(await card.evaluate(el => el.parentElement!.hasAttribute("data-gallery-region"))).toBe(true)
      // Content: identifier, fixed 1Y, historical price, one-year change and the dated historical source note.
      await expect(card.getByRole("heading", { level: 2 })).toHaveText("Bitcoin BTC")
      await expect(card.getByTestId("btc-range")).toHaveText("1Y range")
      await expect(card.getByTestId("btc-range")).toHaveCSS("color", await token(frame, "muted-foreground"))
      await expect(card.getByTestId("btc-price")).toHaveText("$88,642.88")
      await expect(card.getByTestId("btc-change")).toHaveText("−8.52% over one year")
      await expect(card.getByText("Historical first-of-month BTC/USD, Jan 1, 2025 – Jan 1, 2026. Source: Coinbase via FRED.")).toBeVisible()
      // Price in the Body family (not the Heading role), larger than the change and identifier.
      expect(await css(card.getByTestId("btc-price"), "font-family")).toBe(await frame.locator("body").evaluate(el => getComputedStyle(el).fontFamily))
      expect(parseFloat(await css(card.getByTestId("btc-price"), "font-size"))).toBeGreaterThanOrEqual(30)
      // The identifier leads at the top-left and the 1Y label sits at the top-right.
      const [heading, range] = [await box(card.getByRole("heading", { level: 2 })), await box(card.getByTestId("btc-range"))]
      expect(range.x).toBeGreaterThan(heading.x + heading.width)
      close(range.x + range.width, bitcoin.x + bitcoin.width - 24 - 1, 2)
      // Chart: one line with thirteen restrained dots; no grid, visible axis ticks, legend, or second series.
      const chart = card.getByTestId("btc-chart")
      await expect(chart.locator(".recharts-line")).toHaveCount(1)
      await expect(chart.locator(".recharts-line-dots .recharts-dot")).toHaveCount(13)
      await expect(chart.locator(".recharts-cartesian-grid, .recharts-cartesian-axis-tick, .recharts-legend-wrapper, .recharts-area, .recharts-bar")).toHaveCount(0)
      await expect(chart.locator(".recharts-line-curve")).toHaveAttribute("stroke", "var(--color-price)")
      expect(await chart.locator(".recharts-line-curve").evaluate(el => getComputedStyle(el).stroke)).toBe(await token(frame, "chart-1"))
      const dot = await chart.locator(".recharts-line-dots .recharts-dot").first().evaluate(el => ({ r: Number(el.getAttribute("r")), fill: getComputedStyle(el).fill }))
      expect(dot.r).toBeLessThanOrEqual(3)
      expect(dot.fill).toBe(await token(frame, "chart-1"))
      await expect(chart.locator("figcaption")).toContainText("Jan 1, 2025 $96,903.19")
      await expect(chart.locator("figcaption")).toContainText("Jan 1, 2026 $88,642.88")
      // No controls; hovering the chart and focusing its surface never change any card's geometry.
      await expect(card.getByRole("button")).toHaveCount(0)
      const before = await heights(frame)
      await chart.hover()
      await chart.locator("svg.recharts-surface[tabindex='0'], .recharts-wrapper [tabindex='0']").first().focus()
      await page.keyboard.press("ArrowRight")
      expect(await heights(frame)).toEqual(before)
      expect(await overflowing(frame)).toEqual([])
      expect(external).toEqual([])
      await axe(page, info, `bitcoin-${mode}`)
    })
  }

  test("stays contained and full-width across gallery container widths", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    await open(page)
    const frame = previewFrame(page)
    const sweep: Record<number, { region: number; card: number; chart: number; overflow: boolean }> = {}
    for (const width of [320, 480, 672, 900, 1160, 1400]) {
      await frame.locator("[data-gallery]").evaluate((el, w) => { el.style.width = `${w}px` }, width)
      await expect.poll(() => frame.locator('[data-gallery-region="right"]').evaluate(el => Math.round(el.getBoundingClientRect().width) > 0)).toBe(true)
      sweep[width] = await frame.locator("html").evaluate(() => {
        const card = document.querySelector<HTMLElement>('[data-composition="bitcoin-price"]')!
        return {
          region: document.querySelector('[data-gallery-region="right"]')!.getBoundingClientRect().width,
          card: card.getBoundingClientRect().width,
          chart: card.querySelector('[data-slot="chart"]')!.getBoundingClientRect().height,
          overflow: card.scrollWidth > card.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
        }
      })
    }
    await frame.locator("[data-gallery]").evaluate(el => { el.style.width = "" })
    await info.attach("wbds-03-bitcoin-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })
    for (const [width, m] of Object.entries(sweep)) {
      expect(m.overflow, width).toBe(false)
      close(m.card, m.region)
      close(m.chart, sweep[1400]!.chart)
    }
  })
})

test.describe("WBDS-05/06 Design system reference sheet (PUI-109)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`flat Colors and Type scale sections, sidebar order and pairs, Body values, live descending scale (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await previewView(page, "Design system")
      const frame = previewFrame(page)
      const panel = frame.getByRole("tabpanel", { name: "Design system", exact: true })
      const [colors, scale] = [panel.locator('[data-design-section="colors"]'), panel.locator('[data-design-section="type-scale"]')]
      // Flat: no border, surface, shadow or radius of their own, but comfortable padding.
      for (const section of [colors, scale]) {
        expect(await section.evaluate(el => { const c = getComputedStyle(el); return [c.borderTopWidth, c.borderLeftWidth, c.backgroundColor, c.boxShadow] })).toEqual(["0px", "0px", "rgba(0, 0, 0, 0)", "none"])
        expect(parseFloat(await css(section, "padding-left"))).toBeGreaterThanOrEqual(16)
        expect(parseFloat(await css(section, "padding-top"))).toBeGreaterThanOrEqual(16)
      }
      await expect(panel.locator('[data-slot="card"]')).toHaveCount(0)
      // Side by side on the wide desktop preview, stacked in the narrow one.
      const [c, s] = [await box(colors), await box(scale)]
      if (isMobileShell(page)) { close(c.x, s.x); expect(s.y).toBeGreaterThanOrEqual(c.y + c.height - 1) } else { close(c.y, s.y); expect(s.x).toBeGreaterThanOrEqual(c.x + c.width - 1) }
      // Colors: sidebar order, related pairs side by side on one row, larger swatches, Body-role values.
      await expect(colors.getByRole("heading", { level: 3 })).toHaveText(["Primary", "Secondary", "Accent", "Base", "Card", "Popover", "Muted", "Destructive", "Border, Input & Ring", "Charts", "Sidebar · base aliases"])
      for (const [background, foreground] of [["primary", "primary-foreground"], ["background", "foreground"], ["card", "card-foreground"], ["destructive", "destructive-foreground"], ["sidebar", "sidebar-foreground"], ["sidebar-accent", "sidebar-accent-foreground"]]) {
        const [a, b] = [await box(panel.locator(`[data-token="${background}"]`)), await box(panel.locator(`[data-token="${foreground}"]`))]
        close(a.y, b.y)
        expect(b.x).toBeGreaterThan(a.x + a.width - 1)
      }
      const swatch = await box(panel.locator('[data-token="primary"] > span').first())
      expect([Math.round(swatch.width), Math.round(swatch.height)]).toEqual([48, 48])
      const bodyFamily = await frame.locator("body").evaluate(el => getComputedStyle(el).fontFamily)
      for (const name of ["primary", "chart-3", "sidebar-ring"]) expect(await css(panel.locator(`[data-token="${name}"]`).getByTestId("token-value"), "font-family")).toBe(bodyFamily)
      // Sidebar OFF shows base aliases; ON shows dedicated values, immediately.
      await expect(panel.locator('[data-token="sidebar"]').getByTestId("sidebar-alias")).toHaveText("= background")
      await sidebarTokens(page, true)
      await colorInput(page, "sidebar").fill(EDITS[mode].sidebar)
      await colorInput(page, "sidebar").press("Enter")
      await workspaceMode(page, "Preview")
      await expect(colors.getByRole("heading", { name: "Sidebar · dedicated", level: 3 })).toBeVisible()
      await expect(panel.locator('[data-token="sidebar"]').getByTestId("token-value")).toHaveText(EDITS[mode].sidebar)
      await expect(panel.locator('[data-token="sidebar"]').getByTestId("sidebar-alias")).toHaveCount(0)
      // Type scale: nine rows, strictly descending, label left and specimen right, specimen at its own size in Body.
      await expect(scale.getByRole("heading", { level: 2 })).toHaveText("Type scale")
      await expect(scale.getByRole("heading", { level: 3 })).toHaveCount(0)
      const rows = await scale.locator("[data-type-size]").evaluateAll(nodes => nodes.map(node => {
        const [label, sample] = Array.from(node.children) as HTMLElement[]
        const l = label!.getBoundingClientRect(), s = sample!.getBoundingClientRect()
        return { size: node.getAttribute("data-type-size"), label: label!.textContent, sample: sample!.textContent, labelSize: parseFloat(getComputedStyle(label!).fontSize), sampleSize: parseFloat(getComputedStyle(sample!).fontSize), family: getComputedStyle(sample!).fontFamily, labelRight: l.right, sampleLeft: s.left, sampleRight: s.right, row: node.getBoundingClientRect().right }
      }))
      expect(rows.map(row => row.size)).toEqual(["text-5xl", "text-4xl", "text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-xs"])
      expect(rows.map(row => row.sampleSize)).toEqual([48, 36, 30, 24, 20, 18, 16, 14, 12])
      for (const row of rows) {
        expect(row.label).toBe(row.size)
        expect(row.sample).toBe("The quick brown fox jumps over the lazy dog.")
        expect(row.labelSize).toBe(12)
        expect(row.family).toBe(bodyFamily)
        expect(row.sampleLeft).toBeGreaterThan(row.labelRight)
        expect(row.sampleRight).toBeLessThanOrEqual(row.row + 0.5)
      }
      expect(await overflowing(frame)).toEqual([])
      await axe(page, info, `design-system-${mode}`)
    })
  }

  test("the two sections pair only when the view's own container is wide enough", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    await open(page)
    await previewView(page, "Design system")
    const frame = previewFrame(page)
    const sweep: Record<number, { side: boolean; overflow: string[] }> = {}
    for (const width of [340, 520, 700, 780, 960]) {
      await frame.locator("[data-design-system]").evaluate((el, w) => { el.style.width = `${w}px` }, width)
      await expect.poll(() => frame.locator("[data-design-system]").evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(width)
      const side = await frame.locator("html").evaluate(() => {
        const [a, b] = Array.from(document.querySelectorAll("[data-design-section]"), el => el.getBoundingClientRect())
        return Math.abs(a!.top - b!.top) < 1
      })
      sweep[width] = { side, overflow: await overflowing(frame) }
    }
    await frame.locator("[data-design-system]").evaluate(el => { el.style.width = "" })
    await info.attach("wbds-05-design-system-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })
    // @3xl is 48rem (768px).
    for (const [width, m] of Object.entries(sweep)) {
      expect(m.side, width).toBe(Number(width) >= 768)
      expect(m.overflow, width).toEqual([])
    }
  })
})

test.describe("WBDS-07 standardized App shells (PUI-110)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`three vertically stacked landscape shells share the Sidebar pattern, switcher and abstract main panel (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await previewView(page, "App shells")
      const frame = previewFrame(page)
      const panel = frame.getByRole("tabpanel", { name: "App shells", exact: true })
      const shells = panel.locator("[data-app-shell]")
      await expect(shells).toHaveCount(3)
      const panelBox = await box(panel)
      // Page coordinates throughout (Playwright boxes), so frame, panel and footer measurements share one origin.
      const frames = await Promise.all([0, 1, 2].map(async index => { const r = await box(shells.nth(index).locator(":scope > div")); return { ...r, bottom: r.y + r.height } }))
      // Vertical: one column, never side by side; one shared width and height.
      for (let i = 1; i < frames.length; i++) {
        close(frames[i]!.x, frames[0]!.x)
        expect(frames[i]!.y).toBeGreaterThan(frames[i - 1]!.bottom)
        close(frames[i]!.width, frames[0]!.width)
        close(frames[i]!.height, frames[0]!.height)
      }
      if (isMobileShell(page)) close(frames[0]!.width, panelBox.width)
      else {
        // Restrained and centred at desktop width, with a balanced landscape proportion.
        expect(frames[0]!.width / panelBox.width).toBeGreaterThan(0.6)
        expect(frames[0]!.width / panelBox.width).toBeLessThan(0.8)
        close(frames[0]!.x - panelBox.x, panelBox.x + panelBox.width - (frames[0]!.x + frames[0]!.width), 2)
        expect(frames[0]!.width / frames[0]!.height).toBeGreaterThan(1.3)
        expect(frames[0]!.width / frames[0]!.height).toBeLessThan(2.2)
      }
      for (const [index, name] of ["Classic workspace", "Inset project", "Compact utility"].entries()) {
        const shell = shells.nth(index)
        const frameBox = frames[index]!
        // Shared Sidebar: switcher, two labelled groups of icon items with one active, and a profile footer, all inside
        // the frame with no clipped navigation.
        await expect(shell.getByRole("combobox", { name: `${name} workspace` })).toBeVisible()
        await expect(shell.locator('[data-slot="sidebar-group-label"]')).toHaveText(["Workspace", "Team"])
        const items = shell.getByRole("navigation", { name: `${name} navigation` }).getByRole("button")
        await expect(items).toHaveText(["Home", "Inbox", "Documents", "Members", "Settings"])
        for (const item of await items.all()) await expect(item.locator("svg")).toHaveCount(1)
        await expect(shell.locator('[aria-current="page"]')).toHaveCount(1)
        const footer = await box(shell.locator('[data-slot="sidebar-footer"]'))
        await expect(shell.locator('[data-slot="sidebar-footer"] [data-slot="avatar"]')).toBeVisible()
        expect(footer.y + footer.height).toBeLessThanOrEqual(frameBox.y + frameBox.height + 0.5)
        expect(await shell.locator('[data-slot="sidebar-content"]').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true)
        // Shared abstract main panel: breadcrumb row, three muted blocks in one row, one larger muted block below.
        await expect(shell.locator("[data-shell-header]")).toBeVisible()
        const blocks = await shell.locator("[data-shell-content]").evaluate(el => Array.from(el.querySelectorAll(".bg-muted"), b => { const r = b.getBoundingClientRect(); return { y: r.y, width: r.width, height: r.height, color: getComputedStyle(b).backgroundColor } }))
        expect(blocks).toHaveLength(4)
        for (const b of blocks.slice(1, 3)) close(b.y, blocks[0]!.y)
        expect(blocks[3]!.y).toBeGreaterThan(blocks[0]!.y + blocks[0]!.height)
        expect(blocks[3]!.width * blocks[3]!.height).toBeGreaterThan(blocks[0]!.width * blocks[0]!.height * 3)
        for (const b of blocks) expect(b.color).toBe(await token(frame, "muted"))
      }
      // Switcher: keyboard operable, updates the header and breadcrumb only, never the shell geometry.
      const classic = shells.nth(0)
      const before = await panel.evaluate(root => Array.from(root.querySelectorAll("[data-app-shell]"), el => el.getBoundingClientRect().height))
      const trigger = classic.getByRole("combobox", { name: "Classic workspace workspace" })
      // The pointer is parked away from the popup so only the keyboard moves the highlight.
      await page.mouse.move(0, 0)
      await trigger.focus()
      await page.keyboard.press("Enter")
      const atlas = frame.getByRole("option", { name: "Atlas", exact: true })
      await expect(atlas).toBeVisible()
      await expect(frame.getByRole("option", { name: "Northwind", exact: true })).toHaveAttribute("data-highlighted")
      await expect.poll(() => frame.locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
      await page.keyboard.press("ArrowDown")
      await expect(atlas).toHaveAttribute("data-highlighted")
      await page.keyboard.press("Enter")
      await expect(atlas).toHaveCount(0)
      await expect(trigger).toContainText("Atlas")
      await expect(classic.locator("[data-shell-header]")).toHaveText("Atlas/Home")
      await expect(trigger).toBeFocused()
      expect(await panel.evaluate(root => Array.from(root.querySelectorAll("[data-app-shell]"), el => el.getBoundingClientRect().height))).toEqual(before)
      // Navigation selection by keyboard updates the breadcrumb.
      await classic.getByRole("button", { name: "Members" }).focus()
      await page.keyboard.press("Enter")
      await expect(classic.getByRole("button", { name: "Members" })).toHaveAttribute("aria-current", "page")
      await expect(classic.locator("[data-shell-header]")).toHaveText("Atlas/Members")
      // Live Sidebar source in every shell: OFF follows the base aliases, ON the dedicated tokens.
      const sidebars = panel.locator('[data-slot="sidebar"]')
      for (const index of [0, 2]) expect(await css(sidebars.nth(index), "background-color")).toBe(await token(frame, "background"))
      await sidebarTokens(page, true)
      await colorInput(page, "sidebar").fill(EDITS[mode].sidebar)
      await colorInput(page, "sidebar").press("Enter")
      await colorInput(page, "sidebar-accent").fill(EDITS[mode].accent)
      await colorInput(page, "sidebar-accent").press("Enter")
      await workspaceMode(page, "Preview")
      for (const index of [0, 2]) await expect.poll(() => css(sidebars.nth(index), "background-color")).toBe(await token(frame, "sidebar"))
      await expect(shells.nth(1).locator(":scope > div > div").first()).toHaveCSS("background-color", await token(frame, "sidebar"))
      for (const index of [0, 1, 2]) await expect(shells.nth(index).locator('[data-active="true"]')).toHaveCSS("background-color", await token(frame, "sidebar-accent"))
      expect(await overflowing(frame)).toEqual([])
      await axe(page, info, `app-shells-${mode}`)
    })
  }

  test("shells widen to the full panel only in narrow containers and never overflow", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    await open(page)
    await previewView(page, "App shells")
    const frame = previewFrame(page)
    // PUI-116: each shell is now its own provider, so the shared container is the App shells root.
    const root = frame.locator("[data-app-shells]")
    const sweep: Record<number, { ratio: number; overflow: string[] }> = {}
    for (const width of [340, 600, 760, 900, 1200]) {
      await root.evaluate((el, w) => { el.style.width = `${w}px` }, width)
      await expect.poll(() => root.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(width)
      const ratio = await frame.locator("html").evaluate(() => {
        const wrapper = document.querySelector("[data-app-shells]")!.getBoundingClientRect().width
        return document.querySelector("[data-app-shell]")!.getBoundingClientRect().width / wrapper
      })
      sweep[width] = { ratio, overflow: await overflowing(frame) }
    }
    await root.evaluate(el => { el.style.width = "" })
    await info.attach("wbds-07-app-shells-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })
    for (const [width, m] of Object.entries(sweep)) {
      expect(m.overflow, width).toEqual([])
      if (Number(width) >= 768) expect(m.ratio, width).toBeLessThan(0.8)
      else close(m.ratio, 1, 0.01)
    }
  })
})
