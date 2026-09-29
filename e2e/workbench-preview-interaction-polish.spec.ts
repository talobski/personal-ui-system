import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { isMobileShell, previewView, setColorMode, sidebarSheet } from "./workbench-navigation"

/**
 * workbench-preview-interaction-polish-v1-001 producer definitions (Lead-executed under playwright.workbench.config.ts
 * at 390x844 and 1440x900; container sweeps run once, in the desktop project). WPIP-07 contained, independently
 * collapsible App shells isolated from each other and from the Workbench Sidebar. Every axe run is decoded:
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
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `wpip-${label}`)
  await info.attach(`axe-wpip-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
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

/** Horizontally overflowing surfaces (the document, a composition, a preview view); empty when contained. */
const overflowing = (frame: FrameLocator) => frame.locator("html").evaluate(() => [
  ...(document.documentElement.scrollWidth > innerWidth ? ["document"] : []),
  ...Array.from(document.querySelectorAll<HTMLElement>("[data-composition], [data-design-system], [data-app-shell]"))
    .filter(el => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1)
    .map(el => el.getAttribute("data-composition") ?? el.getAttribute("data-app-shell") ?? "design-system"),
])

const SHELLS = ["Classic workspace", "Inset project", "Compact utility"] as const

/**
 * The Workbench's own Sidebar state, read from the top-level document only: the desktop Sidebar's data-state, or on a
 * mobile viewport whether its off-canvas sheet is open. Preview shells live in the iframe and can never match here.
 */
const workbenchSidebar = async (page: Page) => isMobileShell(page)
  ? ((await sidebarSheet(page).count()) > 0 ? "sheet-open" : "sheet-closed")
  : await page.locator('[data-slot="sidebar"]').first().getAttribute("data-state")

const shellStates = (frame: FrameLocator) => frame.locator("[data-app-shell]").evaluateAll(nodes => nodes.map(el => el.getAttribute("data-shell-state")))

test.describe("WPIP-07 independently collapsible, contained App shells (PUI-116)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`each shell collapses to its themed icon rail and restores without moving another shell or the Workbench (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await previewView(page, "App shells")
      const frame = previewFrame(page)
      const shells = frame.locator("[data-app-shell]")
      await expect(shells).toHaveCount(3)
      const workbench = await workbenchSidebar(page)
      expect(workbench).toBe(isMobileShell(page) ? "sheet-closed" : "expanded")
      // Expanded at rest; each shell is its own provider (the frame), none shared.
      expect(await shellStates(frame)).toEqual(["expanded", "expanded", "expanded"])
      await expect(frame.locator('[data-app-shell] > [data-slot="sidebar-wrapper"]')).toHaveCount(3)
      const frames = await Promise.all([0, 1, 2].map(index => box(shells.nth(index).locator(":scope > div"))))
      for (const index of [0, 1, 2]) {
        const name = SHELLS[index]!
        const shell = shells.nth(index)
        const trigger = shell.getByRole("button", { name: `Toggle ${name} sidebar`, exact: true })
        const sidebar = shell.locator('[data-slot="sidebar"]')
        const expandedWidth = (await box(sidebar)).width
        const mainBefore = (await box(shell.locator("[data-shell-content]"))).width
        await expect(trigger).toHaveAttribute("aria-expanded", "true")
        await expect(trigger).toHaveAttribute("aria-controls", (await sidebar.getAttribute("id"))!)
        await trigger.click()
        await expect(trigger).toHaveAttribute("aria-expanded", "false")
        await expect(sidebar).toHaveAttribute("data-collapsible", "icon")
        const expected = ["expanded", "expanded", "expanded"]
        expected[index] = "collapsed"
        expect(await shellStates(frame)).toEqual(expected)
        // The icon rail: 3rem wide, in flow inside the frame; the main panel takes the freed width.
        await expect.poll(async () => Math.round((await box(sidebar)).width)).toBe(48)
        // Measured together after the click, which may scroll the preview: page coordinates share one origin.
        const [rail, frameBox] = [await box(sidebar), await box(shell.locator(":scope > div"))]
        expect(rail.x).toBeGreaterThanOrEqual(frameBox.x - 0.5)
        expect(rail.y).toBeGreaterThanOrEqual(frameBox.y - 0.5)
        expect(rail.y + rail.height).toBeLessThanOrEqual(frameBox.y + frameBox.height + 0.5)
        expect(await css(sidebar, "position")).toBe("static")
        expect((await box(shell.locator("[data-shell-content]"))).width).toBeGreaterThan(mainBefore + (expandedWidth - 48) * 0.8)
        // Icon-only navigation keeps every accessible name, one icon each, square and inside the rail.
        const items = shell.getByRole("navigation", { name: `${name} navigation` }).getByRole("button")
        await expect(items).toHaveCount(5)
        for (const [position, label] of ["Home", "Inbox", "Documents", "Members", "Settings"].entries()) {
          await expect(items.nth(position)).toHaveAccessibleName(label)
          const item = await box(items.nth(position))
          close(item.width, 32)
          close(item.height, 32)
          expect(item.x).toBeGreaterThanOrEqual(rail.x - 0.5)
          expect(item.x + item.width).toBeLessThanOrEqual(rail.x + rail.width + 0.5)
        }
        await expect(shell.locator('[data-slot="sidebar-menu-badge"]')).toBeHidden()
        await expect(shell.getByRole("combobox", { name: `${name} workspace` })).toBeVisible()
        await expect(shell.locator('[data-slot="sidebar-footer"] [data-slot="avatar"]')).toBeVisible()
        // Live theme on the rail: the active item still paints the Sidebar accent.
        await expect(shell.locator('[data-active="true"]')).toHaveCSS("background-color", await token(frame, "sidebar-accent"))
        // Geometry of every frame and the Workbench Sidebar are untouched.
        for (const other of [0, 1, 2]) {
          const now = await box(shells.nth(other).locator(":scope > div"))
          close(now.height, frames[other]!.height)
          close(now.width, frames[other]!.width)
        }
        expect(await workbenchSidebar(page)).toBe(workbench)
        expect(await overflowing(frame)).toEqual([])
        if (index === 1) await axe(page, info, `app-shells-collapsed-${mode}`)
        // Restore: back to the expanded width with the same trigger.
        await trigger.click()
        await expect(trigger).toHaveAttribute("aria-expanded", "true")
        await expect.poll(async () => Math.round((await box(sidebar)).width)).toBe(Math.round(expandedWidth))
        expect(await shellStates(frame)).toEqual(["expanded", "expanded", "expanded"])
        expect(await workbenchSidebar(page)).toBe(workbench)
      }
    })
  }

  test("keyboard: triggers are focusable buttons and the Cmd/Ctrl+B shortcut is scoped to the focused shell", async ({ page }) => {
    test.setTimeout(90_000)
    await open(page)
    await previewView(page, "App shells")
    const frame = previewFrame(page)
    const shells = frame.locator("[data-app-shell]")
    const workbench = await workbenchSidebar(page)
    // Trigger by keyboard, with visible focus kept on the trigger.
    const compact = shells.nth(2).getByRole("button", { name: "Toggle Compact utility sidebar", exact: true })
    await compact.focus()
    await page.keyboard.press("Enter")
    expect(await shellStates(frame)).toEqual(["expanded", "expanded", "collapsed"])
    await expect(compact).toBeFocused()
    expect(await compact.evaluate(el => el.matches(":focus-visible"))).toBe(true)
    await page.keyboard.press("Space")
    expect(await shellStates(frame)).toEqual(["expanded", "expanded", "expanded"])
    // The shortcut inside one shell moves only that shell and never the Workbench.
    const home = shells.nth(1).getByRole("navigation", { name: "Inset project navigation" }).getByRole("button", { name: "Documents" })
    await home.focus()
    await page.keyboard.press("ControlOrMeta+b")
    expect(await shellStates(frame)).toEqual(["expanded", "collapsed", "expanded"])
    await expect(home).toBeFocused()
    expect(await workbenchSidebar(page)).toBe(workbench)
    await page.keyboard.press("ControlOrMeta+b")
    expect(await shellStates(frame)).toEqual(["expanded", "expanded", "expanded"])
    // Outside every shell (the preview's view tabs) the shortcut moves no shell and cannot reach the Workbench.
    await frame.getByRole("tab", { name: "App shells", exact: true }).focus()
    await page.keyboard.press("ControlOrMeta+b")
    await page.waitForTimeout(250)
    expect(await shellStates(frame)).toEqual(["expanded", "expanded", "expanded"])
    expect(await workbenchSidebar(page)).toBe(workbench)
    // From Workbench chrome the shortcut still drives the Workbench Sidebar, and never a preview shell.
    if (!isMobileShell(page)) {
      await page.getByRole("switch", { name: "Dark mode" }).focus()
      await page.keyboard.press("ControlOrMeta+b")
      await expect.poll(() => workbenchSidebar(page)).toBe("collapsed")
      expect(await shellStates(frame)).toEqual(["expanded", "expanded", "expanded"])
      await page.keyboard.press("ControlOrMeta+b")
      await expect.poll(() => workbenchSidebar(page)).toBe("expanded")
      expect(await shellStates(frame)).toEqual(["expanded", "expanded", "expanded"])
    }
  })

  test("the Workbench trigger never moves a preview shell, and a collapsed shell survives Workbench toggles", async ({ page }) => {
    await open(page)
    await previewView(page, "App shells")
    const frame = previewFrame(page)
    await frame.getByRole("button", { name: "Toggle Classic workspace sidebar", exact: true }).click()
    expect(await shellStates(frame)).toEqual(["collapsed", "expanded", "expanded"])
    const workbenchTrigger = page.getByRole("button", { name: "Toggle Sidebar", exact: true })
    await workbenchTrigger.click()
    if (isMobileShell(page)) {
      await expect(sidebarSheet(page)).toBeVisible()
      expect(await shellStates(frame)).toEqual(["collapsed", "expanded", "expanded"])
      await page.keyboard.press("Escape")
      await expect(sidebarSheet(page)).toHaveCount(0)
    } else {
      await expect.poll(() => workbenchSidebar(page)).toBe("collapsed")
      expect(await shellStates(frame)).toEqual(["collapsed", "expanded", "expanded"])
      await workbenchTrigger.click()
      await expect.poll(() => workbenchSidebar(page)).toBe("expanded")
    }
    expect(await shellStates(frame)).toEqual(["collapsed", "expanded", "expanded"])
    expect(await overflowing(frame)).toEqual([])
  })

  test("shells are moderately taller, stay landscape at desktop and contain collapsed and expanded rails at every width", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    await open(page)
    await previewView(page, "App shells")
    const frame = previewFrame(page)
    const shells = frame.locator("[data-app-shell]")
    for (const index of [0, 1, 2]) {
      const frameBox = await box(shells.nth(index).locator(":scope > div"))
      // The accepted frame was 27rem (432px) tall; the increase is moderate, not a redesign.
      expect(frameBox.height).toBeGreaterThan(432 + 24)
      expect(frameBox.height).toBeLessThanOrEqual(512)
      expect(frameBox.width / frameBox.height).toBeGreaterThan(1.3)
    }
    await frame.getByRole("button", { name: "Toggle Inset project sidebar", exact: true }).click()
    const root = frame.locator("[data-app-shells]")
    const sweep: Record<number, { overflow: string[]; rails: number[] }> = {}
    for (const width of [340, 600, 760, 900, 1200]) {
      await root.evaluate((el, w) => { el.style.width = `${w}px` }, width)
      await expect.poll(() => root.evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(width)
      await page.waitForTimeout(250)
      const rails = await root.evaluate(el => Array.from(el.querySelectorAll('[data-slot="sidebar"]'), s => Math.round(s.getBoundingClientRect().width)))
      sweep[width] = { overflow: await overflowing(frame), rails }
    }
    await root.evaluate(el => { el.style.width = "" })
    await info.attach("wpip-07-app-shells-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })
    for (const [width, m] of Object.entries(sweep)) {
      expect(m.overflow, width).toEqual([])
      expect(m.rails[1], width).toBe(48)
      expect(m.rails[0]!, width).toBeGreaterThan(48)
      expect(m.rails[2]!, width).toBeGreaterThan(48)
    }
  })
})
