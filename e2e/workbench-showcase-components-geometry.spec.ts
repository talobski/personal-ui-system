import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { editorCategory, isMobileShell, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * workbench-showcase-components-geometry-v1-001 producer definitions (Lead-executed under playwright.workbench.config.ts
 * at 390x844 and 1440x900). WSCG-03 Storage, WSCG-04 Revenue axis, WSCG-05 weekly steps, WSCG-06 to WSCG-10 the new
 * compositions, WSCG-11 gallery containment and focus, WSCG-12 Sidebar toggle polish, WSCG-13 Geometry tab. Every axe
 * run is decoded: serious/critical findings outside the pre-approved known debt must be empty.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const css = (el: Locator, property: string) => el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)
const revision = async (page: Page) => Number(await page.locator("#workbench-active-theme").getAttribute("data-revision"))
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)

async function open(page: Page) {
  await page.goto("/workbench")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  await expect.poll(() => previewFrame(page).locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `wscg-${label}`)
  await info.attach(`axe-wscg-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
  expect(blocking.filter(v => v.impact === "critical" || v.impact === "serious"), label).toEqual([])
}

/** A semantic token resolved to a computed colour inside the preview document. */
const token = (page: Page, name: string) => previewFrame(page).locator("html").evaluate((_, value) => {
  const probe = document.createElement("span")
  probe.style.color = `var(--${value})`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}, name)

test.describe("WSCG-03 to WSCG-05 simplified cards", () => {
  test("Storage keeps every usage element and no promotion, followed by Manage storage (PUI-86/PUI-120)", async ({ page }) => {
    await open(page)
    await workspaceMode(page, "Preview")
    const storage = previewFrame(page).locator('[data-composition="plan-usage"]')
    for (const text of ["Team plan", "100 GB and shared libraries.", "Upgrade"]) await expect(storage.getByText(text)).toHaveCount(0)
    await expect(storage.getByRole("button")).toHaveText(["Manage storage"])
    await expect(storage.getByRole("button")).toHaveAttribute("data-variant", "secondary")
    await expect(storage.getByRole("heading", { name: "Storage", level: 2 })).toBeVisible()
    // PUI-103 (workbench-gallery-card-polish-v1-001): no plan/renewal subtitle and no per-category values.
    await expect(storage.getByText(/Pro plan|renews/)).toHaveCount(0)
    await expect(storage.getByText("18.4", { exact: true })).toBeVisible()
    await expect(storage.getByRole("img", { name: "74% of storage used" })).toBeVisible()
    await expect(storage.getByRole("listitem")).toHaveText(["Design files", "Video", "Documents", "Other"])
    // PUI-120 places the Secondary specimen last; preserve the no-dead-space tail check.
    const gap = await storage.evaluate(section => {
      const card = section.firstElementChild!.getBoundingClientRect()
      const list = section.querySelector("button")!.getBoundingClientRect()
      return { tail: card.bottom - list.bottom, padding: parseFloat(getComputedStyle(section.firstElementChild!).paddingBottom) }
    })
    close(gap.tail, gap.padding + 1, 2)
  })

  test("Studio revenue shows no x-axis labels or reserved axis space in any range (PUI-87)", async ({ page }) => {
    await open(page)
    await workspaceMode(page, "Preview")
    const revenue = previewFrame(page).locator('[data-composition="revenue-overview"]')
    const chart = revenue.getByTestId("revenue-chart")
    const height = await revenue.evaluate(el => el.firstElementChild!.getBoundingClientRect().height)
    for (const [range, first] of [["Week", "Mon"], ["Month", "W1"], ["Quarter", "Jul"]] as const) {
      await revenue.getByRole("radio", { name: range }).click()
      await expect(chart.locator("figcaption")).toContainText(`: ${first} `)
      await expect(chart.locator(".recharts-xAxis, .recharts-cartesian-axis-tick-value")).toHaveCount(0)
      await expect(chart.locator(".recharts-area-curve")).toHaveCount(1)
      // The plotting area reaches the chart's bottom edge: no empty tick row remains.
      const fill = await chart.evaluate(figure => {
        const surface = figure.querySelector(".recharts-surface")!.getBoundingClientRect()
        const area = figure.querySelector(".recharts-area-area, .recharts-area-curve")!.getBoundingClientRect()
        return surface.bottom - area.bottom
      })
      expect(fill).toBeLessThanOrEqual(2)
      close(await revenue.evaluate(el => el.firstElementChild!.getBoundingClientRect().height), height, 0.5)
    }
  })

  test("weekly steps leads with a Heading-role average and keeps seven daily bars with no weekday row (PUI-89, PUI-103)", async ({ page }) => {
    await open(page)
    await workspaceMode(page, "Preview")
    const frame = previewFrame(page)
    const steps = frame.locator('[data-composition="productive-week"]')
    await expect(steps.getByText(/A productive week|Your workspace, at a glance|tasks completed/)).toHaveCount(0)
    const value = steps.getByText("8,357", { exact: true })
    await expect(value).toBeVisible()
    expect(await css(value, "font-family")).toBe(await css(frame.locator('[data-composition="plan-usage"] h2'), "font-family"))
    await expect(steps.getByText("Average steps this week")).toBeVisible()
    await expect(steps.getByText("+12.4% vs last week")).toBeVisible()
    await expect(steps.locator(".recharts-bar-rectangle")).toHaveCount(7)
    // PUI-103: the weekday labels and their axis row are gone; the bars reach the chart's bottom edge.
    await expect(steps.locator(".recharts-xAxis, .recharts-cartesian-axis-tick-value")).toHaveCount(0)
    expect(await steps.evaluate(section => {
      const surface = section.querySelector(".recharts-surface")!.getBoundingClientRect()
      return surface.bottom - Math.max(...Array.from(section.querySelectorAll(".recharts-bar-rectangle"), bar => bar.getBoundingClientRect().bottom))
    })).toBeLessThanOrEqual(2)
    // No visible text precedes the metric.
    const first = await steps.evaluate(section => {
      const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.textContent!.trim() && !node.parentElement!.closest(".sr-only")) return node.textContent!.trim()
      return null
    })
    expect(first).toBe("8,357")
  })
})

test.describe("WSCG-06 to WSCG-10 new compositions", () => {
  test("chat, table, signup, calendar, music and weather are contained, named and operable", async ({ page }, info) => {
    test.setTimeout(90_000)
    await open(page)
    await workspaceMode(page, "Preview")
    const frame = previewFrame(page)
    const card = (id: string) => frame.locator(`[data-composition="${id}"]`)

    // Chat (PUI-88, superseded in detail by PUI-95): official Message rows aligned start/end, named senders, Bubble
    // surfaces on semantic tokens; any avatar is decorative (PUI-103 removed the header one; PUI-111 adds one per message,
    // leading its row on the row's alignment edge) and the composer is its only textbox.
    const chat = card("team-chat")
    const log = chat.getByRole("log", { name: "Conversation with Maya Chen" })
    await expect(log.locator('[data-slot="message"]')).toHaveCount(4)
    await expect(log.locator('[data-slot="message"][data-align="end"] [data-slot="bubble"]').first()).toHaveCSS("background-color", await token(page, "primary"))
    await expect(log.locator('[data-slot="message"][data-align="start"] [data-slot="bubble"]').first()).toHaveCSS("background-color", await token(page, "muted"))
    const rows = await log.locator('[data-slot="message"]').evaluateAll(nodes => nodes.map(node => { const lead = (node.querySelector('[data-slot="message-avatar"]') ?? node.querySelector('[data-slot="bubble"]'))!.getBoundingClientRect(); const r = node.getBoundingClientRect(); return { left: lead.left - r.left, right: r.right - lead.right } }))
    expect(rows[1]!.right).toBeLessThanOrEqual(1)
    expect(rows[0]!.left).toBeLessThanOrEqual(1)
    await expect(chat.locator('[data-slot="avatar"]')).toHaveCount(4)
    for (const avatar of await chat.locator('[data-slot="avatar"]').all()) await expect(avatar).toHaveAttribute("aria-hidden", "true")
    await expect(chat.getByRole("textbox")).toHaveCount(1)

    // Table (PUI-90, with the PUI-96 select and action columns): caption, headers and five rows, never a scroll region.
    const table = card("recent-payments").getByRole("table", { name: "Five most recent payments with status, email and amount." })
    await expect(table.getByRole("columnheader")).toHaveText(["", "Status", "Email", "Amount", ""])
    await expect(table.getByRole("row")).toHaveCount(6)
    for (const absent of ["Filter emails...", "Columns", "Previous", "Next"]) await expect(card("recent-payments").getByText(absent)).toHaveCount(0)
    await expect(card("recent-payments").getByRole("checkbox")).toHaveCount(6)
    expect(await card("recent-payments").locator('[data-slot="table-container"]').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)

    // Signup (PUI-91): the block's form only.
    const signup = card("signup-form")
    await expect(signup.getByRole("heading", { name: "Create your account", level: 2 })).toBeVisible()
    for (const label of ["Email", "Confirm Password"]) await expect(signup.getByLabel(label, { exact: true })).toBeVisible()
    await expect(signup.getByLabel("Password", { exact: true })).toHaveAccessibleDescription("Must be at least 8 characters long.")
    for (const name of ["Create Account", "GitHub", "Google"]) await expect(signup.getByRole("button", { name, exact: true })).toBeVisible()
    await expect(signup.getByText("Or continue with")).toBeVisible()
    await expect(signup.getByRole("link", { name: "Sign in" })).toBeVisible()
    await expect(signup.locator("img")).toHaveCount(0)

    // Calendar (PUI-92): one single-month range grid with visible start/middle/end and keyboard movement.
    const calendar = card("offsite-calendar")
    await expect(calendar.getByRole("grid")).toHaveCount(1)
    await expect(calendar.locator('[data-range-start="true"]')).toHaveCSS("background-color", await token(page, "primary"))
    await expect(calendar.locator('[data-range-middle="true"]')).toHaveCount(3)
    await expect(calendar.locator('[data-range-end="true"]')).toHaveCount(1)
    await calendar.locator('[data-range-start="true"]').focus()
    await page.keyboard.press("ArrowDown")
    await expect.poll(() => calendar.evaluate(el => document.activeElement?.getAttribute("data-day") ?? null)).toBe(new Date(2026, 9, 19).toLocaleDateString())

    // Music: slider keyboard and local controls.
    const player = card("now-playing")
    const position = player.getByRole("slider", { name: "Track position" })
    await position.focus()
    await page.keyboard.press("ArrowRight")
    await expect(position).toHaveAttribute("aria-valuetext", "1:25 of 3:52")
    await player.getByRole("button", { name: "Play" }).press("Enter")
    await expect(player.getByRole("button", { name: "Pause" })).toBeFocused()

    // Weather (PUI-100 two-zone redesign): no controls, a five-day forecast list, no hourly strip.
    const weather = card("local-weather")
    await expect(weather.getByRole("button")).toHaveCount(0)
    await expect(weather.getByRole("list", { name: "Five-day forecast" }).getByRole("listitem")).toHaveCount(5)
    await expect(weather.getByRole("list", { name: "Next hours" })).toHaveCount(0)

    // Containment for all twelve cards (PUI-108 adds Bitcoin) at this viewport.
    const overflow = await frame.locator("[data-gallery]").evaluate(gallery => Array.from(gallery.querySelectorAll<HTMLElement>("[data-composition]")).filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.dataset.composition))
    expect(overflow).toEqual([])
    // A doubled spacing token never turns the compact table into an unreachable scroll region.
    await editorCategory(page, "Geometry")
    await page.getByRole("textbox", { name: "Spacing", exact: true }).fill("0.5")
    await page.getByRole("textbox", { name: "Spacing", exact: true }).blur()
    await workspaceMode(page, "Preview")
    await expect.poll(() => card("recent-payments").locator('[data-slot="table-container"]').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await axe(page, info, "compositions-light")
    await setColorMode(page, "dark")
    await axe(page, info, "compositions-dark")
  })
})

test.describe("WSCG-11 gallery balance", () => {
  test("wide regions end at comparable heights and each composition renders once", async ({ page }, info) => {
    test.skip(isMobileShell(page), "region balance applies to side-by-side regions")
    await open(page)
    await workspaceMode(page, "Preview")
    const g = await previewFrame(page).locator("[data-gallery]").evaluate(gallery => ({
      ids: Array.from(gallery.querySelectorAll("[data-composition]"), el => el.getAttribute("data-composition")),
      heights: Object.fromEntries(Array.from(gallery.querySelectorAll("[data-gallery-region]"), el => [el.getAttribute("data-gallery-region"), el.getBoundingClientRect().height])),
      bitcoin: gallery.querySelector('[data-composition="bitcoin-price"]')!.getBoundingClientRect().height,
    }))
    await info.attach("wscg-11-balance.json", { body: JSON.stringify(g, null, 2), contentType: "application/json" })
    expect(new Set(g.ids).size).toBe(12)
    expect(g.ids).toHaveLength(12)
    // PUI-108 (workbench-bitcoin-designsystem-shells-v1-001) mandates one more full-width card in the right region
    // without reordering the accepted eleven. The accepted balance still holds for those eleven; the only added
    // difference is exactly the admitted Bitcoin card and its one 16px gap (recorded as a phase residual).
    expect(Math.abs(g.heights.left! - (g.heights.right! - g.bitcoin - 16))).toBeLessThanOrEqual(200)
    expect(g.heights.right!).toBeGreaterThan(g.heights.left!)
  })
})

test.describe("WSCG-12/13 editor polish", () => {
  test("Sidebar toggle: smaller muted label, gap below the trigger, no note in either state (PUI-93, PUI-98)", async ({ page }, info) => {
    await open(page)
    await editorCategory(page, "Colors")
    const section = page.getByTestId("section-colors-sidebar")
    await section.scrollIntoViewIfNeeded()
    const toggle = section.getByRole("switch", { name: "Use sidebar tokens" })
    const label = section.locator('label[for="sidebar-tokens-switch"]')
    expect(await css(label, "font-size")).toBe("12px")
    expect(await css(label, "color")).toBe(await page.evaluate(() => { const p = document.createElement("span"); p.style.color = "var(--muted-foreground)"; document.querySelector(".quiet-editor")!.append(p); const c = getComputedStyle(p).color; p.remove(); return c }))
    await expect(section.getByText("Sidebar tokens are currently not applied.")).toHaveCount(0)
    expect(await toggle.getAttribute("aria-describedby")).toBeNull()
    const trigger = await section.locator("h3").boundingBox()
    const row = await section.getByTestId("control-sidebar-tokens").boundingBox()
    expect(row!.y - (trigger!.y + trigger!.height)).toBeGreaterThanOrEqual(14)
    await toggle.focus()
    await page.keyboard.press("Space")
    await expect(toggle).toHaveAttribute("aria-checked", "true")
    // PUI-98 supersedes the PUI-93 active note: no description in either state.
    expect(await toggle.getAttribute("aria-describedby")).toBeNull()
    await expect(section.getByText("Sidebar tokens are active.")).toHaveCount(0)
    await page.keyboard.press("Space")
    await expect(toggle).toHaveAttribute("aria-checked", "false")
    await axe(page, info, "sidebar-toggle")
  })

  test("switching tabs from a focused panel control keeps focus on the pressed tab, so the next slider step lands (PUI-94)", async ({ page }) => {
    await open(page)
    const frames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    // Focus inside the outgoing panel (the case the mobile sheet's focus restoration used to intercept).
    await editorCategory(page, "Effects")
    await page.getByRole("textbox", { name: "Duration", exact: true }).focus()
    await editorCategory(page, "Geometry")
    const tab = page.getByRole("tab", { name: "Geometry", exact: true })
    await expect(tab).toBeFocused()
    await frames()
    await expect(tab).toBeFocused()
    // Pointer activation keeps the browser's pointer focus appearance: no focus-visible ring on the pressed tab.
    expect(await tab.evaluate(el => el.matches(":focus-visible"))).toBe(false)
    // A slider focused immediately after the switch keeps focus through later frames and takes the keyboard step.
    const spacing = page.getByRole("slider", { name: "Spacing", exact: true })
    await spacing.focus()
    await frames()
    await expect(spacing).toBeFocused()
    await page.keyboard.press("ArrowRight")
    await expect(page.getByRole("textbox", { name: "Spacing", exact: true })).toHaveValue("0.255")
    // The same holds from a focused section trigger.
    await page.getByTestId("section-radius").getByRole("button").first().focus()
    await editorCategory(page, "Colors")
    await frames()
    await expect(page.getByRole("tab", { name: "Colors", exact: true })).toBeFocused()
  })

  test("five top-level tabs; Geometry holds Radius and Spacing, Effects holds Shadow and Motion (PUI-94)", async ({ page }, info) => {
    await open(page)
    await workspaceMode(page, "Controls")
    const list = page.getByRole("tablist", { name: "Editor categories" })
    await expect(list.getByRole("tab")).toHaveText(["Colors", "Typography", "Geometry", "Effects", "Command"])
    const sections = (name: string) => page.getByRole("tabpanel", { name, exact: true }).locator('[data-testid^="section-"]').evaluateAll(nodes => nodes.map(n => n.getAttribute("data-testid")))
    await editorCategory(page, "Geometry")
    expect(await sections("Geometry")).toEqual(["section-radius", "section-spacing"])
    await expect(page.getByRole("textbox", { name: "Radius", exact: true })).toHaveValue("0.7")
    await editorCategory(page, "Effects")
    // PUI-113 inserts UI Effects between Shadow and Motion.
    expect(await sections("Effects")).toEqual(["section-shadow", "section-ui-effects", "section-motion"])
    for (const id of ["section-radius", "section-spacing", "section-shadow", "section-motion"]) await expect(page.getByTestId(id)).toHaveCount(1)
    // Keyboard: arrows move between the shared-style triggers in order.
    await page.getByRole("tab", { name: "Typography", exact: true }).focus()
    await page.keyboard.press("ArrowRight")
    await expect(page.getByRole("tab", { name: "Geometry", exact: true })).toBeFocused()
    await page.keyboard.press("ArrowRight")
    await expect(page.getByRole("tab", { name: "Effects", exact: true })).toBeFocused()
    const geometryTab = page.getByRole("tab", { name: "Geometry", exact: true })
    const effectsTab = page.getByRole("tab", { name: "Effects", exact: true })
    await geometryTab.click()
    for (const property of ["font-size", "padding-left", "border-top-left-radius", "height"]) expect(await css(geometryTab, property)).toBe(await css(effectsTab, property))
    // Edits under Geometry still go through the same mutation path and one history checkpoint.
    const before = await revision(page)
    const radius = page.getByRole("textbox", { name: "Radius", exact: true })
    await radius.fill("0.5")
    await radius.blur()
    await expect.poll(() => revision(page)).toBe(before + 1)
    await workspaceMode(page, "Preview")
    await page.getByTestId("history-controls").getByRole("button", { name: "Undo", exact: true }).click()
    await editorCategory(page, "Geometry")
    await expect(page.getByRole("textbox", { name: "Radius", exact: true })).toHaveValue("0.7")
    await axe(page, info, "geometry-tab")
  })
})
