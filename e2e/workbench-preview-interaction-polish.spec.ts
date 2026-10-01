import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { colorInput, editorCategory, isMobileShell, previewView, selectTheme, setColorMode, sidebarSheet, workspaceMode } from "./workbench-navigation"

/**
 * workbench-preview-interaction-polish-v1-001 producer definitions (Lead-executed under playwright.workbench.config.ts
 * at 390x844 and 1440x900; container sweeps run once, in the desktop project). WPIP-03 Chat avatars, bottom composer and
 * active no-op send; WPIP-04 Weather highs and live Body weight; WPIP-05 Design system labels, HEX and swatches;
 * WPIP-06 floating reset toast with history Undo; WPIP-07 contained, independently collapsible App shells isolated
 * from each other and from the Workbench Sidebar; WPIP-08 Bitcoin placement and static ranges. Every axe run is
 * decoded: serious/critical findings outside the pre-approved known debt must be empty.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
const box = async (el: Locator) => (await el.boundingBox())!
const css = (el: Locator, property: string) => el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)

async function open(page: Page) {
  await page.goto("/workbench")
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
      // The accepted frame was 27rem (432px), then 30rem (480px). PUI-127 scales it with the ~90% width to a
      // believable landscape app window, bounded at 44rem (704px).
      expect(frameBox.height).toBeGreaterThan(480 + 24)
      expect(frameBox.height).toBeLessThanOrEqual(704)
      expect(frameBox.width / frameBox.height).toBeGreaterThan(1.3)
      expect(frameBox.width / frameBox.height).toBeLessThan(2)
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

/** Every card's outer height, for interaction-stability checks. */
const heights = (frame: FrameLocator) => frame.locator("[data-gallery]").evaluate(gallery => Object.fromEntries(Array.from(gallery.querySelectorAll("[data-composition]"), el => [el.getAttribute("data-composition")!, el.firstElementChild!.getBoundingClientRect().height])))

const ORDER = ["plan-usage", "quick-find", "productive-week", "signup-form", "now-playing", "revenue-overview", "team-chat", "recent-activity", "bitcoin-price", "recent-payments", "offsite-calendar", "local-weather"]

test.describe("WPIP-03 Chat avatars, bottom composer and active send (PUI-111)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`single-initial avatars follow alignment, the composer sits on the card's bottom edge and send is an active no-op (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const chat = frame.locator('[data-composition="team-chat"]')
      const surface = chat.locator('[data-slot="card"]')
      const log = chat.getByRole("log", { name: "Conversation with Maya Chen" })
      // No contact header; one decorative initial per message, leading on the row's alignment edge.
      await expect(chat.locator('[data-slot="card-header"], [data-slot="card-title"]')).toHaveCount(0)
      const rows = await log.locator('[data-slot="message"]').evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect(), avatar = node.querySelector('[data-slot="message-avatar"]')!, a = avatar.getBoundingClientRect(), b = node.querySelector('[data-slot="bubble"]')!.getBoundingClientRect()
        return { align: node.getAttribute("data-align"), initial: avatar.textContent, hidden: avatar.querySelector('[data-slot="avatar"]')!.getAttribute("aria-hidden"), start: a.left - r.left, end: r.right - a.right, width: a.width, beside: b.left >= a.right || b.right <= a.left }
      }))
      expect(rows.map(row => [row.align, row.initial, row.hidden])).toEqual([["start", "M", "true"], ["end", "Y", "true"], ["start", "M", "true"], ["end", "Y", "true"]])
      for (const row of rows) {
        expect(row.align === "start" ? row.start : row.end).toBeLessThanOrEqual(1)
        expect(row.beside).toBe(true)
        close(row.width, 24)
      }
      await expect(chat.locator('[data-slot="avatar-fallback"]').first()).toHaveCSS("background-color", await token(frame, "muted"))
      // Bottom composer: the footer ends on the card's bottom padding, and it stays there when the card is taller.
      const form = chat.locator("form")
      const edge = async () => {
        const [card, f] = [await box(surface), await box(form)]
        return card.y + card.height - parseFloat(await css(surface, "padding-bottom")) - parseFloat(await css(surface, "border-bottom-width")) - (f.y + f.height)
      }
      close(await edge(), 0)
      const logTop = (await box(log)).y
      await surface.evaluate(el => { el.style.minHeight = `${el.getBoundingClientRect().height + 240}px` })
      close(await edge(), 0)
      close((await box(log)).y, logTop)
      expect((await box(chat.locator('[data-slot="card-content"]'))).height).toBeGreaterThan((await box(log)).height + 200)
      await surface.evaluate(el => { el.style.minHeight = "" })
      // Paired side by side (desktop gallery), Chat still matches Recent activity's height with the composer at the bottom.
      if (!isMobileShell(page)) {
        const activity = await box(frame.locator('[data-composition="recent-activity"] [data-slot="card"]'))
        close((await box(surface)).height, activity.height)
        close(await edge(), 0)
      }
      // Composer: exact placeholder; the send button is inside the field at the far right, enabled, filled primary.
      const input = chat.getByRole("textbox", { name: "Message Maya Chen" })
      const send = chat.getByRole("button", { name: "Send message", exact: true })
      await expect(input).toHaveAttribute("placeholder", "Type your message...")
      await expect(send).toBeEnabled()
      await expect.poll(() => css(send, "background-color")).toBe(await token(frame, "primary"))
      await expect.poll(() => css(send, "color")).toBe(await token(frame, "primary-foreground"))
      const [field, s] = [await box(chat.locator('[data-slot="chat-composer"]')), await box(send)]
      expect(s.x + s.width).toBeLessThanOrEqual(field.x + field.width)
      expect(s.y).toBeGreaterThanOrEqual(field.y)
      expect(s.y + s.height).toBeLessThanOrEqual(field.y + field.height)
      // Keyboard: Tab reaches the button with a visible ring; Enter, Space and a click insert nothing.
      const before = await heights(frame)
      await input.fill("Looks good to me")
      await input.focus()
      await page.keyboard.press("Tab")
      await expect(send).toBeFocused()
      expect(await send.evaluate(el => el.matches(":focus-visible"))).toBe(true)
      await expect.poll(() => css(send, "box-shadow")).toContain("3px")
      await page.keyboard.press("Enter")
      await page.keyboard.press("Space")
      await send.click()
      await expect(log.locator('[data-slot="message"]')).toHaveCount(4)
      await expect(chat.getByText("Looks good to me", { exact: true })).toHaveCount(0)
      expect(await heights(frame)).toEqual(before)
      // Live theme: a primary edit restyles the send button and the local user's bubbles.
      const edit = mode === "light" ? "oklch(0.45 0.15 150)" : "oklch(0.75 0.12 150)"
      await editorCategory(page, "Colors")
      await colorInput(page, "primary").fill(edit)
      await colorInput(page, "primary").press("Enter")
      await workspaceMode(page, "Preview")
      await expect.poll(() => css(send, "background-color")).toBe(await token(frame, "primary"))
      await expect(log.locator('[data-align="end"] [data-slot="bubble"]').first()).toHaveCSS("background-color", await token(frame, "primary"))
      expect(await overflowing(frame)).toEqual([])
      await axe(page, info, `chat-${mode}`)
    })
  }
})

test.describe("WPIP-04 Weather highs only and live Body weight (PUI-112)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`forecast shows day, icon and high only; temperature and place follow the Body weight control (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const weather = frame.locator('[data-composition="local-weather"]')
      const days = weather.getByRole("list", { name: "Five-day forecast" }).getByRole("listitem")
      await expect(days).toHaveCount(5)
      const columns = await days.evaluateAll(els => els.map(el => {
        const r = el.getBoundingClientRect()
        const visible = Array.from(el.children).filter(c => !c.classList.contains("sr-only") && c.tagName !== "svg").map(c => c.textContent)
        const last = Array.from(el.children).filter(c => !c.classList.contains("sr-only")).at(-1)!.getBoundingClientRect()
        return { visible, hidden: Array.from(el.querySelectorAll(".sr-only"), c => c.textContent), svg: el.querySelectorAll("svg").length, gapBelow: r.bottom - last.bottom }
      }))
      expect(columns.map(column => column.visible[0])).toEqual(["Wed", "Thu", "Fri", "Sat", "Sun"])
      for (const column of columns) {
        expect(column.visible).toEqual([expect.stringMatching(/^[A-Z][a-z]{2}$/), expect.stringMatching(/^\d+°$/)])
        expect(column.hidden).toEqual([expect.stringMatching(/^[A-Za-z ]+, high$/)])
        expect(column.svg).toBe(1)
        // No orphaned row space where the low used to be.
        expect(column.gapBelow).toBeLessThanOrEqual(1)
      }
      await expect(weather.getByText(/^L 16°$/)).toBeVisible()
      // Temperature and place: Body family and live Body weight at their accepted sizes.
      const temperature = weather.locator('[data-slot="card-content"] > div > p').first()
      const place = weather.getByRole("heading", { name: "Lisbon", level: 2 })
      const body = () => frame.locator("body").evaluate(el => [getComputedStyle(el).fontFamily, getComputedStyle(el).fontWeight])
      const styles = async () => [await css(temperature, "font-family"), await css(temperature, "font-weight"), await css(place, "font-family"), await css(place, "font-weight")]
      const [family, weight] = await body()
      expect(await styles()).toEqual([family, weight, family, weight])
      expect([await css(temperature, "font-size"), await css(place, "font-size")]).toEqual(["48px", "16px"])
      for (const value of ["300", "700"]) {
        await editorCategory(page, "Typography")
        const field = page.getByRole("textbox", { name: "Body Weight", exact: true })
        await field.fill(value)
        await field.blur()
        await workspaceMode(page, "Preview")
        await expect.poll(styles).toEqual([family, value, family, value])
      }
      // Heading weight never reaches them.
      await editorCategory(page, "Typography")
      const heading = page.getByRole("textbox", { name: "Heading Weight", exact: true })
      await heading.fill("300")
      await heading.blur()
      await workspaceMode(page, "Preview")
      await expect.poll(styles).toEqual([family, "700", family, "700"])
      expect([await css(temperature, "font-size"), await css(place, "font-size")]).toEqual(["48px", "16px"])
      expect(await overflowing(frame)).toEqual([])
      await axe(page, info, `weather-${mode}`)
    })
  }
})

/** The sRGB bytes the browser paints for a token, via a 1px canvas, as an independent check of the displayed HEX. */
const painted = (frame: FrameLocator, name: string) => frame.locator("html").evaluate((_, value) => {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = 1
  const context = canvas.getContext("2d")!
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(`--${value}`).trim()
  context.fillRect(0, 0, 1, 1)
  return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3))
}, name)
const bytes = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))

test.describe("WPIP-05 Design system labels, HEX and swatches (PUI-114)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`Contextual labels, HEX values, rectangular swatches, uppercase Sidebar heading and no Type scale summary (${mode})`, async ({ page }, info) => {
      test.setTimeout(120_000)
      await open(page)
      await setColorMode(page, mode)
      await previewView(page, "Design system")
      const frame = previewFrame(page)
      const panel = frame.getByRole("tabpanel", { name: "Design system", exact: true })
      const swatch = (name: string) => panel.locator(`[data-token="${name}"]`)
      const value = (name: string) => swatch(name).getByTestId("token-value")
      await expect(panel.locator("[data-token]")).toHaveCount(32)
      // Labels: display only; unpaired tokens keep their key, shown in title case (PUI-126).
      for (const [token, label] of [["primary", "Background"], ["primary-foreground", "Foreground"], ["background", "Background"], ["foreground", "Foreground"], ["destructive", "Background"], ["destructive-foreground", "Foreground"], ["sidebar", "Background"], ["sidebar-accent-foreground", "Foreground"], ["border", "Border"], ["chart-3", "Chart-3"], ["sidebar-ring", "Sidebar Ring"]] as const) {
        await expect(swatch(token).getByTestId("token-label")).toHaveText(new RegExp(`${label}$`))
      }
      await expect(swatch("sidebar-primary").getByTestId("token-label")).toHaveText("Primary Background")
      await expect(panel.getByText(/oklch\(/)).toHaveCount(0)
      // HEX: every value is #RRGGBB (or #RRGGBBAA when translucent) and matches what the browser paints.
      for (const text of await panel.getByTestId("token-value").allTextContents()) expect(text).toMatch(/^#[0-9A-F]{6}([0-9A-F]{2})?$/)
      for (const token of ["primary", "background", "muted-foreground", "chart-2", "destructive", "sidebar-accent"]) {
        const shown = bytes((await value(token).textContent())!)
        const actual = await painted(frame, token)
        for (const [i, channel] of shown.entries()) expect(Math.abs(channel - actual[i]!), `${token} ${i}`).toBeLessThanOrEqual(2)
      }
      // Swatches: wider than tall, contained in their own column, still bordered and rounded.
      const shapes = await panel.locator('[data-testid="swatch"]').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(), li = node.parentElement!.getBoundingClientRect(); return { ratio: r.width / r.height, inside: r.left >= li.left - 0.5 && r.right <= li.right + 0.5, radius: parseFloat(getComputedStyle(node).borderTopLeftRadius), border: getComputedStyle(node).borderTopWidth } }))
      expect(shapes).toHaveLength(32)
      for (const shape of shapes) {
        expect(shape.ratio).toBeGreaterThan(1.5)
        expect(shape.inside).toBe(true)
        expect(shape.radius).toBeGreaterThan(0)
        expect(shape.border).toBe("1px")
      }
      // PUI-126: group headings keep their plain title text and render uppercase; no alias annotations or Type scale
      // summary line.
      const sidebarHeading = panel.getByRole("heading", { name: "Sidebar", exact: true, level: 3 })
      expect(await sidebarHeading.textContent()).toBe("Sidebar")
      expect(await sidebarHeading.innerText()).toBe("SIDEBAR")
      await expect(panel.getByText(/base aliases|dedicated|^= /)).toHaveCount(0)
      const scale = panel.locator('[data-design-section="type-scale"]')
      await expect(scale.locator("[data-type-size]")).toHaveCount(9)
      expect(await scale.evaluate(el => el.children[1]!.tagName)).toBe("UL")
      await expect(scale.getByText(/·/)).toHaveCount(0)
      // Sidebar OFF: aliases' values. ON: dedicated values. OFF again: aliases again. Editor labels and storage stay.
      await expect(value("sidebar")).toHaveText((await value("background").textContent())!)
      await editorCategory(page, "Colors")
      const section = page.getByTestId("section-colors-sidebar")
      await section.scrollIntoViewIfNeeded()
      const toggle = section.getByRole("switch", { name: "Use sidebar tokens" })
      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-checked", "true")
      const edit = mode === "light" ? "oklch(0.93 0.03 250)" : "oklch(0.3 0.04 250)"
      await colorInput(page, "sidebar").fill(edit)
      await colorInput(page, "sidebar").press("Enter")
      await expect(colorInput(page, "sidebar")).toHaveValue(edit)
      await expect(colorInput(page, "primary")).toHaveValue(/^oklch\(/)
      await workspaceMode(page, "Preview")
      await expect(value("sidebar")).toHaveAttribute("data-resolved", edit)
      await expect(value("sidebar")).not.toHaveText((await value("background").textContent())!)
      const sidebarBytes = await painted(frame, "sidebar")
      for (const [i, channel] of bytes((await value("sidebar").textContent())!).entries()) expect(Math.abs(channel - sidebarBytes[i]!)).toBeLessThanOrEqual(2)
      await expect(sidebarHeading).toBeVisible()
      await editorCategory(page, "Colors")
      await toggle.click()
      await expect(toggle).toHaveAttribute("aria-checked", "false")
      await workspaceMode(page, "Preview")
      await expect(value("sidebar")).toHaveText((await value("background").textContent())!)
      // Light/dark: the values follow the mode.
      const background = await value("background").textContent()
      await setColorMode(page, mode === "light" ? "dark" : "light")
      await expect(value("background")).not.toHaveText(background!)
      await setColorMode(page, mode)
      await expect(value("background")).toHaveText(background!)
      expect(await overflowing(frame)).toEqual([])
      await axe(page, info, `design-system-${mode}`)
    })
  }

  test("specimens stay contained as the view's container narrows", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    await open(page)
    await previewView(page, "Design system")
    const frame = previewFrame(page)
    const sweep: Record<number, { overflow: string[]; minRatio: number }> = {}
    for (const width of [300, 420, 700, 960]) {
      await frame.locator("[data-design-system]").evaluate((el, w) => { el.style.width = `${w}px` }, width)
      await expect.poll(() => frame.locator("[data-design-system]").evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(width)
      const minRatio = await frame.locator("[data-design-system]").evaluate(el => Math.min(...Array.from(el.querySelectorAll('[data-testid="swatch"]'), s => s.getBoundingClientRect().width / s.getBoundingClientRect().height)))
      sweep[width] = { overflow: await overflowing(frame), minRatio }
    }
    await frame.locator("[data-design-system]").evaluate(el => { el.style.width = "" })
    await info.attach("wpip-05-design-system-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })
    for (const [width, m] of Object.entries(sweep)) {
      expect(m.overflow, width).toEqual([])
      expect(m.minRatio, width).toBeGreaterThan(1.5)
    }
  })
})

const shellStatus = (page: Page) => page.locator(".quiet-shell")
const activeTheme = (page: Page) => page.locator("#workbench-active-theme")
const revision = async (page: Page) => Number(await activeTheme(page).getAttribute("data-revision"))
const historyButton = (page: Page, name: "Undo" | "Redo" | "Reset") => page.getByTestId("history-controls").getByRole("button", { name, exact: true })
const resetToast = (page: Page) => page.getByTestId("reset-toast")

async function setRadius(page: Page, value: string) {
  await editorCategory(page, "Geometry")
  const field = page.getByRole("textbox", { name: "Radius", exact: true })
  await field.fill(value)
  await field.blur()
  await expect(field).toHaveValue(value)
}
const radiusValue = async (page: Page) => {
  await editorCategory(page, "Geometry")
  return page.getByRole("textbox", { name: "Radius", exact: true }).inputValue()
}
async function confirmReset(page: Page, name = "Default") {
  await workspaceMode(page, "Preview")
  await historyButton(page, "Reset").click()
  await page.getByRole("dialog", { name: `Reset ${name}?` }).getByRole("button", { name: "Reset theme", exact: true }).click()
}

test.describe("WPIP-06 floating reset toast with history Undo (PUI-115)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`reset floats a transient toast without shifting layout or taking focus; its Undo is the history Undo (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await setRadius(page, "1.5")
      await workspaceMode(page, "Preview")
      const frameBox = await box(page.getByTestId("preview-frame"))
      const toolbar = await box(page.getByTestId("history-controls"))
      const r = await revision(page)
      await confirmReset(page)
      await expect(shellStatus(page)).toHaveAttribute("data-theme-status", "built-in")
      const toast = resetToast(page)
      await expect(toast).toHaveCount(1)
      await expect(toast.getByRole("heading", { name: "Reset to Default" })).toBeVisible()
      await expect(toast).toContainText("Theme restored to its built-in values.")
      // No inline banner, no layout shift: the preview and toolbar keep their exact geometry.
      await expect(page.getByTestId("notice")).toHaveCount(0)
      await expect(page.getByTestId("review-scroll")).toHaveCount(0)
      expect(await box(page.getByTestId("preview-frame"))).toEqual(frameBox)
      expect(await box(page.getByTestId("history-controls"))).toEqual(toolbar)
      // Floating: fixed at the bottom-right inside the viewport, above the page, on semantic popover tokens.
      const viewport = page.getByRole("region", { name: "Notifications" })
      await expect(viewport).toHaveAttribute("aria-live", "polite")
      expect(await css(page.getByTestId("toast-viewport"), "position")).toBe("fixed")
      const t = await box(toast)
      const size = page.viewportSize()!
      expect(t.x + t.width).toBeLessThanOrEqual(size.width - 8)
      expect(t.y + t.height).toBeLessThanOrEqual(size.height - 8)
      expect(t.x).toBeGreaterThanOrEqual(8)
      await expect.poll(() => css(toast, "background-color")).toBe(await page.evaluate(() => { const p = document.createElement("span"); p.style.color = "var(--popover)"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c }))
      // Focus stays outside the toast.
      expect(await toast.evaluate(el => el.contains(document.activeElement))).toBe(false)
      await axe(page, info, `reset-toast-${mode}`)
      // Undo in the toast is the toolbar's history Undo: the pre-reset state returns at the next revision.
      await toast.getByRole("button", { name: "Undo", exact: true }).click()
      await expect(shellStatus(page)).toHaveAttribute("data-theme-status", "built-in, edited")
      await expect(activeTheme(page)).toHaveAttribute("data-revision", String(r + 2))
      await expect(resetToast(page)).toHaveCount(0)
      expect(await radiusValue(page)).toBe("1.5")
      // History is intact: toolbar Redo re-applies the reset, toolbar Undo reverses it again.
      await workspaceMode(page, "Preview")
      await historyButton(page, "Redo").click()
      await expect(shellStatus(page)).toHaveAttribute("data-theme-status", "built-in")
      await historyButton(page, "Undo").click()
      await expect(shellStatus(page)).toHaveAttribute("data-theme-status", "built-in, edited")
      expect(await radiusValue(page)).toBe("1.5")
    })
  }

  test("dismissal and auto-dismiss change no history; repeated resets never stack", async ({ page }) => {
    test.setTimeout(90_000)
    await open(page)
    await setRadius(page, "1.5")
    await confirmReset(page)
    const r = await revision(page)
    await resetToast(page).getByRole("button", { name: "Dismiss", exact: true }).click()
    await expect(resetToast(page)).toHaveCount(0)
    await expect(shellStatus(page)).toHaveAttribute("data-theme-status", "built-in")
    expect(await revision(page)).toBe(r)
    await expect(historyButton(page, "Undo")).toBeEnabled()
    await expect(historyButton(page, "Redo")).toBeDisabled()
    // A second reset after a new edit shows exactly one toast.
    await setRadius(page, "1.25")
    await confirmReset(page)
    await expect(resetToast(page)).toHaveCount(1)
    // Left alone (pointer and focus elsewhere) it closes by itself, with the history untouched.
    const settled = await revision(page)
    await page.mouse.move(0, 0)
    await expect(resetToast(page)).toHaveCount(0, { timeout: 15_000 })
    expect(await revision(page)).toBe(settled)
    await expect(shellStatus(page)).toHaveAttribute("data-theme-status", "built-in")
    await historyButton(page, "Undo").click()
    expect(await radiusValue(page)).toBe("1.25")
  })

  test("a later edit, toolbar Undo or theme switch closes the toast, so its Undo can never target another step", async ({ page }) => {
    test.setTimeout(90_000)
    await open(page)
    // Toolbar Undo after reset: the toast closes; the toast cannot undo a second time.
    await setRadius(page, "1.5")
    await confirmReset(page)
    await expect(resetToast(page)).toHaveCount(1)
    await historyButton(page, "Undo").click()
    await expect(resetToast(page)).toHaveCount(0)
    expect(await radiusValue(page)).toBe("1.5")
    // A new edit after reset closes it.
    await confirmReset(page)
    await expect(resetToast(page)).toHaveCount(1)
    await setRadius(page, "0.9")
    await expect(resetToast(page)).toHaveCount(0)
    // A theme switch after reset closes it.
    await confirmReset(page)
    await expect(resetToast(page)).toHaveCount(1)
    await selectTheme(page, "quiet-editorial")
    await expect(resetToast(page)).toHaveCount(0)
    await selectTheme(page, "default")
    await expect(shellStatus(page)).toHaveAttribute("data-theme-status", "built-in")
  })

  test("keyboard: F6 reaches the toast without it taking focus first, and its Undo works by keyboard", async ({ page }) => {
    await open(page)
    await setRadius(page, "1.5")
    await confirmReset(page)
    const toast = resetToast(page)
    await expect(toast).toHaveCount(1)
    expect(await toast.evaluate(el => el.contains(document.activeElement))).toBe(false)
    await page.keyboard.press("F6")
    await expect.poll(() => page.getByTestId("toast-viewport").evaluate(el => el.contains(document.activeElement))).toBe(true)
    const undo = toast.getByRole("button", { name: "Undo", exact: true })
    for (let i = 0; i < 4 && !(await undo.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press("Tab")
    await expect(undo).toBeFocused()
    expect(await undo.evaluate(el => el.matches(":focus-visible"))).toBe(true)
    await page.keyboard.press("Enter")
    await expect(shellStatus(page)).toHaveAttribute("data-theme-status", "built-in, edited")
    expect(await radiusValue(page)).toBe("1.5")
  })
})

test.describe("WPIP-08 Bitcoin placement and static 1Y / 3Y / 5Y ranges (PUI-117)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`after the Chat pair, full width, no caption; ranges swap static series and endpoint figures (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      const external: string[] = []
      page.on("request", request => { if (!request.url().startsWith("http://127.0.0.1") && !request.url().startsWith("data:") && !request.url().startsWith("blob:")) external.push(request.url()) })
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      expect(await frame.locator("[data-composition]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-composition")))).toEqual(ORDER)
      const card = frame.locator('[data-composition="bitcoin-price"]')
      const right = await box(frame.locator('[data-gallery-region="right"]'))
      const [chat, activity, bitcoin, table] = [await box(frame.locator('[data-composition="team-chat"]')), await box(frame.locator('[data-composition="recent-activity"]')), await box(card), await box(frame.locator('[data-composition="recent-payments"]'))]
      close(bitcoin.x, right.x)
      close(bitcoin.width, right.width)
      close(bitcoin.y - Math.max(chat.y + chat.height, activity.y + activity.height), 16)
      close(table.y - (bitcoin.y + bitcoin.height), 16)
      expect(await card.evaluate(el => el.parentElement!.hasAttribute("data-gallery-region"))).toBe(true)
      // The side-by-side pairing of Chat and Recent activity survives at desktop width.
      if (!isMobileShell(page)) close(chat.y, activity.y)
      // No visible caption or provenance copy; no live claim.
      await expect(card.getByText(/Source|FRED|Coinbase|Historical|illustrative|live|real-time/i)).toHaveCount(0)
      const group = card.getByRole("radiogroup", { name: "Bitcoin range" })
      const radio = (name: string) => group.getByRole("radio", { name, exact: true })
      await expect(group.getByRole("radio")).toHaveText(["1Y", "3Y", "5Y"])
      await expect(radio("1Y")).toBeChecked()
      await expect(radio("1Y")).toHaveCSS("background-color", await token(frame, "accent"))
      const chart = card.getByTestId("btc-chart")
      const footprint = await box(chart.locator('[data-slot="chart"]'))
      const cardHeight = (await box(card)).height
      const expectRange = async (dots: number, change: string, first: string) => {
        await expect(chart.locator(".recharts-line-dots .recharts-dot")).toHaveCount(dots)
        await expect(card.getByTestId("btc-price")).toHaveText("$88,642.88")
        await expect(card.getByTestId("btc-change")).toHaveText(change)
        await expect(chart.locator("figcaption")).toContainText(first)
        await expect(chart.locator(".recharts-line")).toHaveCount(1)
        await expect(chart.locator(".recharts-cartesian-grid, .recharts-cartesian-axis-tick, .recharts-legend-wrapper")).toHaveCount(0)
        const now = await box(chart.locator('[data-slot="chart"]'))
        close(now.height, footprint.height)
        close(now.width, footprint.width)
        close((await box(card)).height, cardHeight)
      }
      await expectRange(13, "−8.52% over one year", "Jan 1, 2025 $96,903.19")
      // Keyboard: arrows move within the single-select group, Space selects; the focused item shows its ring.
      await radio("1Y").focus()
      await page.keyboard.press("ArrowRight")
      await expect(radio("3Y")).toBeFocused()
      expect(await radio("3Y").evaluate(el => el.matches(":focus-visible"))).toBe(true)
      await page.keyboard.press("Space")
      await expect(radio("3Y")).toBeChecked()
      await expect(radio("1Y")).not.toBeChecked()
      await expectRange(13, "+433.99% over three years", "Jan 1, 2023 $16,600.00")
      await radio("5Y").click()
      await expect(radio("5Y")).toBeChecked()
      await expectRange(21, "+205.67% over five years", "Jan 1, 2021 $29,000.00")
      await expect(chart.locator(".recharts-line-curve")).toHaveAttribute("stroke", "var(--color-price)")
      expect(await chart.locator(".recharts-line-curve").evaluate(el => getComputedStyle(el).stroke)).toBe(await token(frame, "chart-1"))
      expect(await overflowing(frame)).toEqual([])
      await axe(page, info, `bitcoin-5y-${mode}`)
      await radio("1Y").click()
      await expectRange(13, "−8.52% over one year", "Jan 1, 2025 $96,903.19")
      expect(external).toEqual([])
    })
  }

  test("every range stays contained and full width across gallery container widths", async ({ page }, info) => {
    test.skip(isMobileShell(page), "the fixed-viewport container sweep runs once, in the desktop project")
    await open(page)
    const frame = previewFrame(page)
    const card = frame.locator('[data-composition="bitcoin-price"]')
    const sweep: Record<string, { card: number; region: number; chart: number; overflow: boolean }> = {}
    for (const range of ["1Y", "3Y", "5Y"]) {
      await card.getByRole("radio", { name: range, exact: true }).click()
      for (const width of [320, 672, 1160]) {
        await frame.locator("[data-gallery]").evaluate((el, w) => { el.style.width = `${w}px` }, width)
        await expect.poll(() => frame.locator("[data-gallery]").evaluate(el => Math.round(el.getBoundingClientRect().width))).toBe(width)
        // Steady state: Recharts resizes on its ResizeObserver tick, so a persistent overflow still fails the poll.
        await expect.poll(() => card.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
        sweep[`${range}@${width}`] = await frame.locator("html").evaluate(() => {
          const el = document.querySelector<HTMLElement>('[data-composition="bitcoin-price"]')!
          return { card: el.getBoundingClientRect().width, region: document.querySelector('[data-gallery-region="right"]')!.getBoundingClientRect().width, chart: el.querySelector('[data-slot="chart"]')!.getBoundingClientRect().height, overflow: el.scrollWidth > el.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth }
        })
      }
    }
    await frame.locator("[data-gallery]").evaluate(el => { el.style.width = "" })
    await info.attach("wpip-08-bitcoin-sweep.json", { body: JSON.stringify(sweep, null, 2), contentType: "application/json" })
    const heightsSeen = new Set(Object.values(sweep).map(m => Math.round(m.chart)))
    expect(heightsSeen.size).toBe(1)
    for (const [key, m] of Object.entries(sweep)) {
      expect(m.overflow, key).toBe(false)
      close(m.card, m.region)
    }
  })
})
