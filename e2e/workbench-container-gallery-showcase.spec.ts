import AxeBuilder from "@axe-core/playwright"
import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { copyThemeCode, colorInput, editorCategory, isMobileShell, selectTheme, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * workbench-container-gallery-showcase-v1-001 producer definitions (Lead-executed under playwright.workbench.config.ts at
 * 390x844 and 1440x900). CGS-03 container geometry at a fixed viewport, CGS-04 independent flow, CGS-05 containment,
 * CGS-08 theme responsiveness, CGS-09 composition behaviour and accessibility, CGS-10/11 toolbar Switch. Every axe run is
 * decoded: serious/critical findings outside the pre-approved known debt must be empty.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const revision = async (page: Page) => Number(await page.locator("#workbench-active-theme").getAttribute("data-revision"))
const toggle = (page: Page) => page.getByRole("switch", { name: "Toggle dark mode", exact: true })
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)

/** PUI-86–92 set in the PUI-97 order (workbench-gallery-preview-expansion-v1-001) with the PUI-108 Bitcoin card, placed after the Chat / Recent activity pair by PUI-117: the left stack, then the right region. */
const ORDER = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing", "revenue-overview", "team-chat", "recent-activity", "bitcoin-price", "recent-payments", "offsite-calendar", "local-weather"]

async function open(page: Page) {
  await page.goto("/workbench")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  await expect.poll(() => previewFrame(page).locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `cgs-${label}`)
  await info.attach(`axe-cgs-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
  expect(blocking.filter(v => v.impact === "critical" || v.impact === "serious"), label).toEqual([])
}

/** Frame, region, and local-group geometry of the gallery, read inside the preview document. */
const geometry = (frame: FrameLocator) => frame.locator("html").evaluate(() => {
  const gallery = document.querySelector<HTMLElement>("[data-gallery]")!
  const box = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height } }
  const region = (side: string) => box(gallery.querySelector(`[data-gallery-region="${side}"]`)!)
  return {
    viewport: innerWidth,
    gallery: box(gallery).width,
    frameColumns: getComputedStyle(gallery.firstElementChild!).gridTemplateColumns.split(" ").length,
    left: region("left"),
    right: region("right"),
    groups: Array.from(gallery.querySelectorAll("[data-gallery-group]"), el => getComputedStyle(el).gridTemplateColumns.split(" ").length),
    items: Object.fromEntries(Array.from(gallery.querySelectorAll("[data-composition]"), el => [el.getAttribute("data-composition")!, box(el)])),
    overflow: document.documentElement.scrollWidth > innerWidth || Array.from(gallery.querySelectorAll("[data-composition]")).some(el => el.scrollWidth > el.clientWidth + 1),
  }
})

test.describe("CGS-03 to CGS-05 container-responsive gallery", () => {
  test("CGS-03 the frame and local groups recompute from the gallery's own width while the browser viewport stays fixed", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    await open(page)
    const frame = previewFrame(page)
    const viewport = page.viewportSize()!
    const sweep: Record<string, Awaited<ReturnType<typeof geometry>>> = {}
    // Constrain only the gallery's own box: the iframe viewport, and so every media query, is unchanged.
    for (const width of [600, 760, 1000, 1300]) {
      await frame.locator("[data-gallery]").evaluate((el, w) => { el.style.width = `${w}px` }, width)
      // Let ResizeObserver-driven content (the Recharts containers) settle at the new width before measuring.
      await expect.poll(async () => { const g = await geometry(frame); return Math.round(g.gallery) === width && !g.overflow }).toBe(true)
      sweep[width] = await geometry(frame)
    }
    await frame.locator("[data-gallery]").evaluate(el => { el.style.width = "" })
    // The real Workbench path: collapsing the sidebar widens the gallery at the same browser viewport.
    sweep.open = await geometry(frame)
    await page.keyboard.press("Control+b")
    await expect.poll(async () => (await geometry(frame)).gallery).toBeGreaterThan(sweep.open!.gallery + 300)
    sweep.collapsed = await geometry(frame)
    expect(page.viewportSize()).toEqual(viewport)
    await info.attach("cgs-03-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })

    const viewports = new Set(Object.entries(sweep).filter(([key]) => /^\d+$/.test(key)).map(([, g]) => g.viewport))
    expect(viewports.size).toBe(1)
    // < 42rem: one column. 42rem: 6/6. 56rem: 5/7. 72rem: 4/8. Right is larger than left at every wide step. The chat
    // pair splits from its region's 32rem; the Calendar / Weather pair (PUI-97) from its region's 42rem.
    expect(sweep[600]).toMatchObject({ frameColumns: 1, groups: [2, 1], overflow: false })
    close(sweep[600]!.left.width, 600)
    expect(sweep[760]).toMatchObject({ frameColumns: 12, groups: [1, 1], overflow: false })
    close(sweep[760]!.left.width, sweep[760]!.right.width)
    for (const [width, share, groups] of [[1000, 7 / 5, [2, 1]], [1300, 8 / 4, [2, 2]]] as const) {
      const g = sweep[width]!
      expect(g).toMatchObject({ frameColumns: 12, groups, overflow: false })
      close(g.left.y, g.right.y)
      // 12 tracks with 11 x 16px gaps (PUI-81): the spans' track ratio shows in the regions' widths.
      const track = (width - 11 * 16) / 12
      close(g.right.width, share * (12 / (1 + share)) * track + (share * (12 / (1 + share)) - 1) * 16, 2)
      expect(g.right.width).toBeGreaterThan(g.left.width * 1.3)
    }
    expect(sweep[1300]!.right.width / sweep[1300]!.left.width).toBeGreaterThan(sweep[1000]!.right.width / sweep[1000]!.left.width)
    // Sidebar open (960px gallery) vs collapsed (1408px): the split rebalances from 5/7 to 4/8 at the same viewport.
    expect(sweep.open!.gallery).toBeGreaterThanOrEqual(896)
    expect(sweep.open!.gallery).toBeLessThan(1152)
    expect(sweep.collapsed!.gallery).toBeGreaterThanOrEqual(1152)
    expect(sweep.collapsed!.right.width / sweep.collapsed!.left.width).toBeGreaterThan(sweep.open!.right.width / sweep.open!.left.width + 0.3)
  })

  test("CGS-04 a tall card never holds down an unrelated stack; natural heights remain and the local pair matches (PUI-82)", async ({ page }, info) => {
    test.skip(isMobileShell(page), "side-by-side regions need the desktop gallery width")
    await open(page)
    const frame = previewFrame(page)
    const before = await geometry(frame)
    const grow = (id: string, px: number) => frame.locator(`[data-composition="${id}"]`).evaluate((el, h) => { (el.firstElementChild as HTMLElement).style.minHeight = `${h}px` }, px)
    await grow("plan-usage", 1400)
    const tallLeft = await geometry(frame)
    // The right region is untouched by a very tall left card.
    for (const id of ["revenue-overview", "team-chat", "recent-activity", "bitcoin-price", "recent-payments", "offsite-calendar", "local-weather"]) close(tallLeft.items[id]!.y, before.items[id]!.y)
    close(tallLeft.items["quick-find"]!.y - tallLeft.items["plan-usage"]!.bottom, 16)
    await grow("plan-usage", 0)
    await grow("revenue-overview", 1400)
    const tallRight = await geometry(frame)
    for (const id of ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing"]) close(tallRight.items[id]!.y, before.items[id]!.y)
    // PUI-117: the chat pair directly follows Studio revenue and the Bitcoin card follows the pair; each gap stays 16px.
    close(tallRight.items["team-chat"]!.y - tallRight.items["revenue-overview"]!.bottom, 16)
    close(tallRight.items["bitcoin-price"]!.y - Math.max(tallRight.items["team-chat"]!.bottom, tallRight.items["recent-activity"]!.bottom), 16)
    close(tallRight.items["recent-payments"]!.y - tallRight.items["bitcoin-price"]!.bottom, 16)
    // The intentional local pair starts together and, side by side, shares the taller card's height (PUI-82
    // supersedes the earlier independent pair heights).
    close(tallRight.items["team-chat"]!.y, tallRight.items["recent-activity"]!.y)
    close(tallRight.items["team-chat"]!.height, tallRight.items["recent-activity"]!.height)
    await info.attach("cgs-04-flow.json", { body: JSON.stringify({ before: before.items, tallLeft: tallLeft.items, tallRight: tallRight.items }, null, 2), contentType: "application/json" })
  })

  for (const size of [{ width: 390, height: 844 }, { width: 1100, height: 900 }, { width: 1440, height: 900 }]) {
    test(`CGS-05 one coherent instance of each composition, no clipped control or overflow at ${size.width}px`, async ({ page }, info) => {
      test.skip(size.width === 1100 && isMobileShell(page), "the intermediate width runs once, in the desktop project")
      if (size.width !== page.viewportSize()!.width) await page.setViewportSize(size)
      await open(page)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      expect(await frame.locator("[data-composition]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-composition")))).toEqual(ORDER)
      const clipped = await frame.locator("[data-gallery]").evaluate(gallery => {
        const failures: string[] = []
        for (const composition of Array.from(gallery.querySelectorAll("[data-composition]"))) {
          const outer = composition.getBoundingClientRect()
          for (const control of Array.from(composition.querySelectorAll<HTMLElement>("button, input, select, textarea, [role=switch], [role=progressbar]"))) {
            if (control.closest(".sr-only") || control.getClientRects().length === 0) continue
            const r = control.getBoundingClientRect()
            if (r.left < outer.left - 0.5 || r.right > outer.right + 0.5 || control.scrollWidth > control.clientWidth + 2 && control.tagName !== "SELECT") failures.push(`${composition.getAttribute("data-composition")}:${control.tagName}:${control.getAttribute("aria-label") ?? control.textContent?.trim()}`)
          }
        }
        return failures
      })
      expect(clipped).toEqual([])
      expect((await geometry(frame)).overflow).toBe(false)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await info.attach(`cgs-05-${size.width}.png`, { body: await page.screenshot({ fullPage: false }), contentType: "image/png" })
    })
  }
})

test.describe("CGS-08 theme responsiveness", () => {
  for (const themeId of ["default", "quiet-editorial"] as const) {
    for (const mode of ["light", "dark"] as const) {
      test(`${themeId} ${mode}: showcase tokens resolve from the active theme and pass decoded axe`, async ({ page }, info) => {
        test.setTimeout(90_000)
        await open(page)
        if (themeId !== "default") await selectTheme(page, themeId)
        await setColorMode(page, mode)
        await workspaceMode(page, "Preview")
        const frame = previewFrame(page)
        const root = frame.locator("html")
        await page.mouse.move(0, 0)
        await expect.poll(() => root.evaluate(() => document.getAnimations().length)).toBe(0)
        const tokens = await root.evaluate(() => Object.fromEntries(["--chart-1", "--chart-2", "--primary", "--card"].map(name => [name, getComputedStyle(document.documentElement).getPropertyValue(name).trim()])))
        // Every chart-token mark resolves to the theme's own token (no raw-colour bypass).
        const resolved = await root.evaluate(() => {
          const as = (value: string) => { const t = document.createElement("span"); t.style.color = value; document.body.append(t); const c = getComputedStyle(t).color; t.remove(); return c }
          const plan = document.querySelector('[data-composition="plan-usage"] [role=img] > span')!
          const day = document.querySelector('[data-composition="offsite-calendar"] [data-range-start="true"]')!
          return {
            plan: [getComputedStyle(plan).backgroundColor, as("var(--chart-1)")],
            day: [getComputedStyle(day).backgroundColor, as("var(--primary)")],
            stroke: [document.querySelector('[data-composition="revenue-overview"] .recharts-area-curve')?.getAttribute("stroke") ?? "", "var(--color-revenue)"],
          }
        })
        for (const [name, [actual, expected]] of Object.entries(resolved)) expect(actual, name).toBe(expected)
        await info.attach(`cgs-08-${themeId}-${mode}.json`, { body: JSON.stringify({ tokens, resolved }, null, 2), contentType: "application/json" })
        await axe(page, info, `theme-${themeId}-${mode}`)
        await info.attach(`cgs-08-${themeId}-${mode}.png`, { body: await page.screenshot(), contentType: "image/png" })
      })
    }
  }

  test("live edits to a chart colour, Heading font, radius, spacing, and elevation restyle the showcase without reload", async ({ page }) => {
    test.setTimeout(90_000)
    await open(page)
    const frame = previewFrame(page)
    await frame.locator("html").evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true))
    const style = (selector: string, property: string) => frame.locator(selector).first().evaluate((el, name) => getComputedStyle(el).getPropertyValue(name), property)
    const segment = '[data-composition="plan-usage"] [role=img] > span'
    // PUI-86 removed Storage's elevated upgrade tile: the music artwork carries elevation, the chat composer field
    // radius and spacing (PUI-100 removed the weather hourly strip; PUI-103 moves the field chrome from the borderless
    // Input to its composer wrapper), and the Storage title the Heading font.
    const tile = '[data-composition="now-playing"] [data-slot="card-content"] .shadow-sm'
    const title = '[data-composition="plan-usage"] h2'
    const kpi = '[data-composition="team-chat"] [data-slot="chat-composer"]'
    const before = { segment: await style(segment, "background-color"), radius: await style(kpi, "border-top-left-radius"), padding: await style(kpi, "padding-left"), shadow: await style(tile, "box-shadow"), font: await style(title, "font-family") }

    await editorCategory(page, "Colors")
    const r0 = await revision(page)
    await colorInput(page, "chart-1").fill("oklch(0.62 0.2 30)")
    await colorInput(page, "chart-1").press("Enter")
    await expect.poll(() => revision(page)).toBeGreaterThan(r0)
    await expect.poll(() => style(segment, "background-color")).not.toBe(before.segment)

    await editorCategory(page, "Typography")
    await page.getByRole("combobox", { name: "Heading Font", exact: true }).click()
    await page.getByRole("combobox", { name: "Search Heading fonts", exact: true }).fill("Playfair Display")
    await page.getByRole("option", { name: "Playfair Display", exact: true }).click()
    await expect.poll(() => style(title, "font-family")).toContain("Playfair Display")

    for (const [category, name, value] of [["Geometry", "Radius", "1.2"], ["Geometry", "Spacing", "0.3"], ["Effects", "Blur", "18"]] as const) {
      await editorCategory(page, category)
      const field = page.getByRole("textbox", { name, exact: true })
      await field.fill(value)
      await field.blur()
    }
    await expect.poll(() => style(kpi, "border-top-left-radius")).not.toBe(before.radius)
    await expect.poll(() => style(kpi, "padding-left")).not.toBe(before.padding)
    await expect.poll(() => style(tile, "box-shadow")).not.toBe(before.shadow)
    expect(await frame.locator("html").evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
  })
})

test.describe("CGS-09 showcase interactions", () => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`every curated showcase composition is operable with named controls and status feedback (${reducedMotion})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await page.emulateMedia({ reducedMotion })
      await open(page)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const card = (id: string) => frame.locator(`[data-composition="${id}"]`)

      // Gallery presentations are stable (PUI-84); geometry before/after is asserted in workbench-cards-gallery-curation.spec.ts.
      const revenue = card("revenue-overview")
      const monthly = await revenue.locator("dd").first().innerText()
      await revenue.getByRole("radio", { name: "Quarter" }).click()
      await expect(revenue.getByRole("radio", { name: "Quarter" })).toHaveAttribute("aria-checked", "true")
      await expect(revenue.locator("dd").first()).not.toHaveText(monthly)

      const calendar = card("offsite-calendar")
      await calendar.getByRole("button", { name: /October 20th, 2026/ }).click()
      await expect(calendar.locator('[data-range-start="true"]')).toHaveCount(1)
      await expect(calendar.getByRole("grid")).toHaveCount(1)

      const table = card("recent-payments")
      await expect(table.getByRole("table")).toBeVisible()
      // PUI-96: a select column and a blank-headed row-action column around Status / Email / Amount.
      await expect(table.getByRole("columnheader")).toHaveText(["", "Status", "Email", "Amount", ""])
      await expect(table.getByRole("button")).toHaveCount(5)

      const player = card("now-playing")
      await player.getByRole("button", { name: "Next track" }).click()
      await expect(player.getByText("Paper Weather", { exact: true })).toBeVisible()
      await player.getByRole("button", { name: "Repeat" }).click()
      await expect(player.getByRole("button", { name: "Repeat" })).toHaveAttribute("aria-pressed", "true")

      const find = card("quick-find")
      await find.getByRole("searchbox", { name: "Search commands" }).fill("export")
      await expect(find.getByRole("list", { name: "Commands" }).getByRole("button", { disabled: false })).toHaveCount(1)
      await find.getByRole("button", { name: /Export theme JSON/ }).click()
      await expect(find.getByRole("status")).toHaveText("Opened “Export theme JSON” in this preview only.")
      await find.getByRole("searchbox", { name: "Search commands" }).fill("zzz")
      await expect(find.getByRole("list", { name: "Commands" }).getByRole("button", { disabled: true })).toHaveCount(5)

      const plan = card("plan-usage")
      await expect(plan.getByRole("img", { name: /% of storage used$/ })).toBeVisible()
      await expect(plan.getByRole("button")).toHaveText(["Manage storage"])
      await expect(plan.getByRole("button")).toHaveAttribute("data-variant", "secondary")
      const signup = card("signup-form")
      await signup.getByRole("button", { name: "Create Account" }).click()
      await expect(signup.getByRole("status")).toHaveText("Preview only. No account was created.")

      await axe(page, info, `interactions-light-${reducedMotion}`)
      await setColorMode(page, "dark")
      await axe(page, info, `interactions-dark-${reducedMotion}`)
    })
  }
})

test.describe("CGS-10/11 toolbar colour-mode Switch", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`right-side Switch | history | export/save, short matching separators, sun/moon thumb (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const toolbar = page.getByTestId("workbench-toolbar")
      const bar = (await toolbar.boundingBox())!
      expect(bar.height).toBe(64)
      // Exact right-cluster order; the SidebarTrigger alone stays on the left.
      const sequence = await toolbar.locator("button, [role=switch], [role=separator]").evaluateAll(els => els.map(el => el.getAttribute("role") === "separator" ? "|" : el.getAttribute("role") === "switch" ? "switch" : el.getAttribute("aria-label") ?? el.textContent!.trim()))
      expect(sequence).toEqual(["Toggle Sidebar", "switch", "|", "Undo", "Redo", "Reset", "|", "Code", "Save"])
      const sw = toggle(page)
      const trigger = (await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).boundingBox())!
      const swBox = (await sw.boundingBox())!
      // The Switch leads the right-aligned action cluster (with Undo and Save), which ends at the toolbar's 16px inset;
      // the space between the left SidebarTrigger and that cluster is free.
      // PUI-139: the Switch sits inside its tooltip wrapper, whose parent is the action cluster.
      const cluster = await sw.evaluate(el => { const c = el.closest('[data-slot="tooltip-trigger"]')!.parentElement!; const r = c.getBoundingClientRect(); return { left: r.left, right: r.right, hasUndo: !!c.querySelector('[aria-label="Undo"]'), hasSave: !!c.querySelector('[title="Save"]'), marginLeft: getComputedStyle(c).marginLeft } })
      expect(cluster).toMatchObject({ hasUndo: true, hasSave: true })
      close(cluster.right, bar.x + bar.width - 16)
      expect(swBox.x).toBeGreaterThan(trigger.x + trigger.width + 8)
      if (!isMobileShell(page)) expect(swBox.x).toBeGreaterThan(bar.x + bar.width / 2)
      // No visible "Dark mode" text anywhere in the toolbar.
      expect(await toolbar.innerText()).not.toMatch(/dark mode/i)
      await expect(toolbar.getByText("Dark mode")).toHaveCount(0)
      // Both separators share one treatment and stay shorter than the toolbar, vertically centred with the Switch.
      const separators = await toolbar.locator("[role=separator]").evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return { width: r.width, height: r.height, center: r.top + r.height / 2, color: s.backgroundColor, className: el.className } }))
      expect(separators).toHaveLength(2)
      expect(separators[0]).toEqual(separators[1])
      expect(separators[0]!.height).toBeLessThan(bar.height * 0.75)
      close(separators[0]!.center, swBox.y + swBox.height / 2)
      // Switch semantics and the mode-mirroring thumb glyph.
      await expect(sw).toHaveAttribute("aria-checked", String(mode === "dark"))
      const thumb = sw.locator('[data-slot="switch-thumb"]')
      await expect(thumb.locator(`[data-icon="${mode === "dark" ? "moon" : "sun"}"]`)).toHaveCount(1)
      await expect(thumb.locator(`[data-icon="${mode === "dark" ? "sun" : "moon"}"]`)).toHaveCount(0)
      await page.waitForTimeout(250)
      const [t, i] = [(await thumb.boundingBox())!, (await thumb.locator("svg").boundingBox())!]
      close(t.x + t.width / 2, i.x + i.width / 2)
      close(t.y + t.height / 2, i.y + i.height / 2)
      expect(await toolbar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      await axe(page, info, `toolbar-${mode}`)
      await info.attach(`cgs-10-toolbar-${mode}.png`, { body: await toolbar.screenshot(), contentType: "image/png" })
    })
  }

  test("CGS-11 keyboard Space toggles with focus-visible; session mode persistence, history, export, and save are unchanged", async ({ page }) => {
    await open(page)
    await setColorMode(page, "light")
    await workspaceMode(page, "Preview")
    const sw = toggle(page)
    const r0 = await revision(page)
    const exportJson = async () => {
      return (await copyThemeCode(page)).text
    }
    const lightPayload = await exportJson()
    // Keyboard modality: Tab from the SidebarTrigger reaches the Switch next.
    await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).focus()
    await page.keyboard.press("Tab")
    await expect(sw).toBeFocused()
    await expect.poll(() => sw.evaluate(el => el.matches(":focus-visible"))).toBe(true)
    expect(await sw.evaluate(el => getComputedStyle(el).boxShadow)).toContain("3px")
    await page.keyboard.press("Space")
    await expect(sw).toHaveAttribute("aria-checked", "true")
    await expect(page.locator("html")).toHaveClass(/dark/)
    await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-mode", "dark")
    await expect(sw.locator('[data-icon="moon"]')).toHaveCount(1)
    // Focus order: the Switch comes next before the history group; on a clean theme Undo/Redo/Reset are disabled, so
    // Tab lands on Export.
    await page.keyboard.press("Tab")
    await expect(page.getByRole("button", { name: "Code", exact: true })).toBeFocused()
    // Colour mode is presentation only: no revision, history entry, or dirty state.
    expect(await revision(page)).toBe(r0)
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled()
    await expect(page.getByRole("button", { name: "Reset", exact: true })).toBeDisabled()
    // Export is byte-identical across colour modes: the payload is the canonical theme, not presentation state.
    const darkPayload = await exportJson()
    expect(darkPayload).toBe(lightPayload)
    expect(JSON.parse(darkPayload)).toMatchObject({ id: "default", schemaVersion: "3.0" })
    // Persistence is unchanged from the accepted product: the mode is session state that survives theme switches and
    // layout changes, and a reload starts from the accepted light default (no new storage was introduced).
    await selectTheme(page, "quiet-editorial")
    await workspaceMode(page, "Preview")
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true")
    await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-mode", "dark")
    expect(await page.evaluate(() => Object.keys(localStorage).filter(key => /mode/i.test(key)))).toEqual([])
    await page.reload()
    await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
    await expect(toggle(page)).toHaveAttribute("aria-checked", "false")
    await expect(toggle(page).locator('[data-icon="sun"]')).toHaveCount(1)
    await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).focus()
    await page.keyboard.press("Tab")
    await page.keyboard.press("Space")
    await expect(toggle(page)).toHaveAttribute("aria-checked", "true")
    await expect(toggle(page).locator('[data-icon="moon"]')).toHaveCount(1)
  })
})
