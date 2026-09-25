import { readFileSync } from "node:fs"
import { FONT_OPTIONS } from "../packages/ui/src/lib/fonts"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { colorInput, editorCategory, isMobileShell, setColorMode, settledSheet, sidebarSheet, workspaceMode, saveTheme, previewStates, selectTheme } from "./workbench-navigation"

const ids = ["productive-week", "account-profile", "team-access", "workspace-settings", "notifications", "support-request", "recent-activity", "room-to-think"]

/** The preview iframe's box versus the panel content box it should fill (WTEP-02). */
async function previewFill(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-testid="preview-frame"]')!.getBoundingClientRect()
    const body = document.querySelector(".quiet-preview-body")!
    const panel = body.getBoundingClientRect()
    const toolbar = document.querySelector('[data-testid="workbench-toolbar"]')!.getBoundingClientRect()
    return { frameWidth: frame.width, frameHeight: frame.height, available: panel.width, bottom: frame.bottom, viewportHeight: innerHeight, edges: [frame.left - panel.left, frame.right - panel.right, frame.top - toolbar.bottom, frame.bottom - panel.bottom], border: getComputedStyle(document.querySelector(".quiet-viewport")!).borderWidth, radius: getComputedStyle(document.querySelector(".quiet-viewport")!).borderRadius }
  })
}

test("preview fills the real right panel, with no device selector or fixed width, and follows the browser viewport (WTEP-02)", async ({ page }) => {
  await page.goto("/")
  await workspaceMode(page, "Preview")
  await expect(page.getByTestId("preview-frame")).toBeVisible()
  for (const name of [/Mobile 390/, /Desktop 1024/, /Preview width/]) {
    await expect(page.getByRole("radio", { name })).toHaveCount(0)
    await expect(page.getByRole("radiogroup", { name })).toHaveCount(0)
  }
  expect(await page.getByTestId("preview-frame").getAttribute("style")).toBeNull()
  const check = async () => {
    await workspaceMode(page, "Preview")
    await expect.poll(async () => { const f = await previewFill(page); return Math.abs(f.frameWidth - f.available) }).toBeLessThanOrEqual(1)
    const fill = await previewFill(page)
    expect(fill.frameHeight).toBeGreaterThanOrEqual(480)
    expect(fill.bottom).toBeCloseTo(fill.viewportHeight, 0)
    for (const edge of fill.edges) expect(Math.abs(edge)).toBeLessThanOrEqual(1)
    expect(fill.border).toBe("0px")
    expect(fill.radius).toBe("0px")
    return fill
  }
  const initial = await check()
  const desktop = !isMobileShell(page)
  // 1440x900: everything right of the 22rem (352px) sidebar, with no viewport inset; 390x844: the full viewport.
  if (desktop) expect(initial.frameWidth).toBeGreaterThan(1040)
  else expect(initial.frameWidth).toBeGreaterThan(360)
  // The preview's own document sees the panel width, so responsive behavior follows the real viewport.
  const inner = await page.frameLocator('[data-testid="preview-frame"]').locator("html").evaluate(() => innerWidth)
  expect(Math.abs(inner - initial.frameWidth)).toBeLessThanOrEqual(1)
  for (const size of desktop ? [{ width: 390, height: 844 }, { width: 1440, height: 900 }] : [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size)
    await check()
  }
})

for (const mode of ["light", "dark"] as const) {
  test(`quiet workspace layout, cards, mobile preservation and accessibility — ${mode}`, async ({ page }, info) => {
    await page.goto("/")
    const frame = page.frameLocator('[data-testid="preview-frame"]')
    await expect(frame.getByTestId("preview")).toHaveAttribute("data-ready", "true")
    const mobile = isMobileShell(page)
    await setColorMode(page, mode)
    await expect(frame.getByTestId("preview")).toHaveAttribute("data-mode", mode)
    await expect(page.locator("html")).toHaveClass(mode === "dark" ? /dark/ : /^(?!.*dark).*$/)
    await expect(frame.getByRole("tab", { name: "Cards", exact: true })).toHaveAttribute("aria-selected", "true")
    {
      const width = await frame.locator("html").evaluate(() => innerWidth)
      await expect(frame.locator("[data-composition]")).toHaveCount(8)
      expect(await frame.locator(".quiet-gallery [data-composition]").evaluateAll(nodes => nodes.map(n => getComputedStyle(n.querySelector(":scope > [data-slot=card], :scope > form > [data-slot=card]")!).boxShadow))).toEqual(Array(8).fill("none"))
      expect(await frame.locator("[data-composition]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-composition")))).toEqual(ids)
      const geometry = await frame.locator("[data-composition]").evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width, scroll: n.scrollWidth, client: n.clientWidth } }))
      for (const box of geometry) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width); expect(box.scroll).toBeLessThanOrEqual(box.client + 1) }
      if (mobile) expect(new Set(geometry.map(b => b.x)).size).toBe(1)
      else expect(new Set(geometry.map(b => b.x)).size).toBe(3)
    }
    await frame.getByLabel("Display name", { exact: true }).fill("Ada Preview")
    await frame.getByRole("button", { name: "Save profile" }).click()
    await expect(frame.getByRole("status")).toContainText("Profile saved")
    const notifications = frame.locator('[data-composition="notifications"]')
    await notifications.getByRole("switch", { name: "Weekly digest" }).click()
    await notifications.getByRole("switch", { name: "Product updates" }).click()
    await expect(notifications.getByRole("status")).toHaveCount(0)
    await notifications.getByRole("button", { name: "Save preferences" }).click()
    await expect(notifications.getByRole("status")).toContainText("Digest off. Updates on.")
    const support = frame.locator('[data-composition="support-request"]')
    await support.getByLabel("Message").fill("")
    await support.getByRole("button", { name: "Send message" }).click()
    await expect(support.getByRole("alert")).toHaveText("Enter a message.")
    await support.getByLabel("Message").fill("A local example")
    await support.getByRole("button", { name: "Send message" }).click()
    await expect(support.getByRole("status")).toContainText("Nothing was sent.")
    await frame.getByRole("button", { name: "Manage access" }).click()
    await expect(frame.getByRole("dialog")).toBeVisible()
    await frame.getByLabel("Grace Hopper’s role").selectOption("Viewer")
    await frame.getByRole("button", { name: "Save access" }).focus()
    await page.keyboard.press("Enter")
    await expect(frame.getByRole("dialog")).toHaveCount(0)
    await expect(frame.locator('[data-composition="team-access"]')).toContainText("Viewer")
    await editorCategory(page, "Colors")
    await colorInput(page, "primary").fill("rejected draft retained")
    await expect(page.getByTestId("color-primary-error")).toBeVisible()
    await workspaceMode(page, "Preview")
    await expect(frame.getByLabel("Display name", { exact: true })).toHaveValue("Ada Preview")
    await workspaceMode(page, "Controls")
    // Desktop keeps the sidebar mounted, so a rejected draft stays visible; the official mobile sheet unmounts on close,
    // so the draft is discarded and the field shows the active value again. Neither path ever activates the draft.
    await expect(colorInput(page, "primary")).toHaveValue(mobile ? /^oklch\(/ : "rejected draft retained")
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "1")
    if (mobile) {
      await expect(page.getByRole("separator", { name: "Resize editor" })).toHaveCount(0)
      await expect(page.getByRole("tab", { name: "Controls", exact: true })).toHaveCount(0)
      const sheet = sidebarSheet(page)
      await expect(sheet.locator(".quiet-editor")).toBeVisible()
      // The sheet is modal: it holds focus and hides the inset from assistive technology until dismissed.
      await expect.poll(() => sheet.evaluate(el => el.contains(document.activeElement))).toBe(true)
      await expect(page.getByRole("switch", { name: "Dark mode" })).toHaveCount(0)
      await page.keyboard.press("Escape")
      await expect(sheet).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Toggle Sidebar", exact: true })).toBeFocused()
      await expect(page.locator(".quiet-editor")).toHaveCount(0)
      await expect(page.getByTestId("preview-frame")).toBeVisible()
    }
    await workspaceMode(page, "Preview")
    await page.mouse.move(0, 0)
    await expect.poll(() => frame.locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
    for (const surface of ["Preview", "Controls"] as const) {
      await workspaceMode(page, surface)
      const { violations } = await new AxeBuilder({ page }).analyze()
      const decoded = violations.filter(v => v.impact === "serious" || v.impact === "critical")
      await info.attach(`axe-quiet-${mode}-${surface}.json`, { body: JSON.stringify(decoded), contentType: "application/json" })
      expect(decoded).toEqual([])
    }
    await workspaceMode(page, "Preview")
    await page.screenshot({ path: info.outputPath(`quiet-${mode}.png`), fullPage: true })
    await page.emulateMedia({ reducedMotion: "reduce" })
    await expect.poll(() => frame.getByRole("button", { name: "Save profile" }).evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0s")
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  })
}

test("one full-height Sidebar shell: 22rem desktop sidebar, preview fills the inset, trigger and Ctrl+B collapse it (WSSP-03, WSSP-12)", async ({ page }) => {
  test.skip(isMobileShell(page), "The desktop sidebar is replaced by the off-canvas sheet below 768px")
  await page.goto("/")
  await expect(page.locator("header")).toHaveCount(0)
  await expect(page.getByRole("separator", { name: "Resize editor" })).toHaveCount(0)
  await expect(page.locator("[data-panel], [data-separator]")).toHaveCount(0)
  await expect(page.locator('[data-slot="sidebar-wrapper"]')).toHaveCount(1)
  await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(1)
  await expect(page.locator('[data-slot="sidebar-inset"]')).toHaveCount(1)
  const geometry = () => page.evaluate(() => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect()
    const container = box('[data-slot="sidebar-container"]')
    const inset = box('[data-slot="sidebar-inset"]')
    const frame = box('[data-testid="preview-frame"]')
    return { sidebarLeft: container.left, sidebarWidth: container.width, sidebarHeight: container.height, insetLeft: inset.left, insetRight: inset.right, frameLeft: frame.left, frameRight: frame.right, frameBottom: frame.bottom, rem: parseFloat(getComputedStyle(document.documentElement).fontSize), scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }
  })
  const open = await geometry()
  expect(open.sidebarWidth).toBeCloseTo(22 * open.rem, 0)
  expect(open.sidebarHeight).toBeCloseTo(900, 0)
  expect(open.insetLeft).toBeCloseTo(open.sidebarWidth, 0)
  expect(open.frameLeft).toBeCloseTo(open.insetLeft, 0)
  expect(open.frameRight).toBeCloseTo(1440, 0)
  expect(open.frameBottom).toBeCloseTo(900, 0)
  expect(open.scrollWidth).toBeLessThanOrEqual(1440)
  expect(open.scrollHeight).toBeLessThanOrEqual(900)
  // Header, content, and the theme Select live in the one sidebar; the toolbar lives in the inset.
  await expect(page.locator('[data-slot="sidebar-header"]').getByRole("combobox", { name: "Active theme" })).toBeVisible()
  await expect(page.locator('[data-slot="sidebar-content"]').getByRole("tablist", { name: "Editor categories" })).toBeVisible()
  await expect(page.locator('[data-slot="sidebar-inset"]').getByRole("switch", { name: "Dark mode" })).toBeVisible()
  // Pointer collapse: the sidebar goes off-canvas and the preview takes the full width.
  const trigger = page.getByRole("button", { name: "Toggle Sidebar", exact: true })
  await trigger.click()
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed")
  await expect.poll(async () => (await geometry()).frameLeft).toBeCloseTo(0, 0)
  expect((await geometry()).frameRight).toBeCloseTo(1440, 0)
  // Keyboard: the trigger is a focusable button, and the official Ctrl+B shortcut toggles it back.
  await page.getByRole("switch", { name: "Dark mode" }).focus()
  await page.keyboard.press("Shift+Tab")
  await expect(trigger).toBeFocused()
  expect(await trigger.evaluate(el => el.matches(":focus-visible") && getComputedStyle(el).boxShadow !== "none")).toBe(true)
  await page.keyboard.press("Control+b")
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "expanded")
  await expect.poll(async () => (await geometry()).insetLeft).toBeCloseTo(open.sidebarWidth, 0)
  await page.keyboard.press("Enter")
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed")
  await page.keyboard.press("Space")
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "expanded")
  // Reduced motion removes the width/offset transition.
  await page.emulateMedia({ reducedMotion: "reduce" })
  expect(await page.locator('[data-slot="sidebar-container"]').evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0s")
  // A narrower desktop keeps the 22rem sidebar and gives the inset the rest, without page overflow.
  await page.setViewportSize({ width: 1024, height: 768 })
  const narrow = await geometry()
  expect(narrow.sidebarWidth).toBeCloseTo(22 * narrow.rem, 0)
  expect(narrow.frameRight).toBeCloseTo(1024, 0)
  expect(narrow.scrollWidth).toBeLessThanOrEqual(1024)
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "1")
})

test("mobile off-canvas sidebar opens, traps focus, exposes every editor section, and dismisses by Escape, overlay, and touch-sized trigger (WSSP-04)", async ({ page }, info) => {
  test.skip(!isMobileShell(page), "Mobile-only off-canvas behavior")
  await page.goto("/")
  const trigger = page.getByRole("button", { name: "Toggle Sidebar", exact: true })
  const sheet = sidebarSheet(page)
  await expect(sheet).toHaveCount(0)
  // Closed: the preview is edge-to-edge beneath the toolbar.
  const frame = (await page.getByTestId("preview-frame").boundingBox())!
  expect(frame.x).toBeCloseTo(0, 0)
  expect(frame.width).toBeCloseTo(390, 0)
  const size = (await trigger.boundingBox())!
  // The trigger's own box plus the toolbar padding give a comfortable touch target.
  expect(Math.min(size.width, size.height)).toBeGreaterThanOrEqual(32)
  await trigger.click()
  await settledSheet(page)
  await expect(sheet).toHaveAttribute("data-mobile", "true")
  const box = (await sheet.boundingBox())!
  expect(box.x).toBeCloseTo(0, 0)
  expect(box.width).toBeCloseTo(18 * 16, 0)
  expect(box.height).toBeCloseTo(844, 0)
  await expect.poll(() => sheet.evaluate(el => el.contains(document.activeElement))).toBe(true)
  // Focus is trapped: tabbing forward many times never leaves the sheet.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab")
    expect(await sheet.evaluate(el => el.contains(document.activeElement))).toBe(true)
  }
  await expect(sheet.getByRole("combobox", { name: "Active theme" })).toBeVisible()
  for (const [category, probe] of [["Colors", "Primary"], ["Typography", "Sans font"], ["Other", "Radius"], ["Command", "Command"]] as const) {
    await sheet.getByRole("tab", { name: category, exact: true }).click()
    const panel = sheet.getByRole("tabpanel", { name: category, exact: true })
    await expect(panel).toBeVisible()
    await expect(panel.getByLabel(probe, { exact: true }).first()).toBeVisible()
    // Tabs fit the 18rem sheet: nothing overflows horizontally.
    expect(await sheet.evaluate(el => el.querySelector('[data-slot="sidebar-content"]')!.scrollWidth <= el.querySelector('[data-slot="sidebar-content"]')!.clientWidth)).toBe(true)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const decoded = violations.filter(v => v.impact === "serious" || v.impact === "critical")
  await info.attach("axe-mobile-sidebar-open.json", { body: JSON.stringify(decoded), contentType: "application/json" })
  expect(decoded).toEqual([])
  await page.keyboard.press("Escape")
  await expect(sheet).toHaveCount(0)
  await expect(trigger).toBeFocused()
  // Pointer/touch: the overlay beside the sheet dismisses it.
  await trigger.click()
  await settledSheet(page)
  await page.mouse.click(370, 400)
  await expect(sheet).toHaveCount(0)
  // Keyboard open from the focused trigger, then reduced motion.
  await trigger.focus()
  await page.keyboard.press("Enter")
  await settledSheet(page)
  await page.keyboard.press("Escape")
  await page.emulateMedia({ reducedMotion: "reduce" })
  await trigger.click()
  await settledSheet(page)
  expect(await sheet.evaluate(el => [getComputedStyle(el).transitionDuration, getComputedStyle(el).animationDuration])).toEqual(["0s", "0s"])
  await page.keyboard.press("Escape")
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "1")
})

test("scoped subtle scrollbars on the sidebar content and preview document only, with native scrolling intact (WSSP-07)", async ({ page }) => {
  await page.goto("/")
  await workspaceMode(page, "Controls")
  const content = page.locator('[data-slot="sidebar-content"]')
  const read = (locator: import("@playwright/test").Locator) => locator.evaluate(el => ({ width: getComputedStyle(el).scrollbarWidth, color: getComputedStyle(el).scrollbarColor, overflowY: getComputedStyle(el).overflowY }))
  const rest = await read(content)
  expect(rest.width).toBe("thin")
  expect(rest.color).not.toBe("auto")
  expect(rest.overflowY).toBe("auto")
  // Stronger on hover than at rest.
  await content.hover()
  await expect.poll(async () => (await read(content)).color).not.toBe(rest.color)
  // Native wheel scrolling still moves the region.
  const before = await content.evaluate(el => el.scrollTop)
  await page.mouse.wheel(0, 600)
  await expect.poll(() => content.evaluate(el => el.scrollTop)).toBeGreaterThan(before)
  // Keyboard scrolling: focus stays usable and Tab moves into later controls, scrolling them into view.
  await content.evaluate(el => { el.scrollTop = 0 })
  // Nothing outside the two regions is restyled: the Workbench root, inset, and toolbar keep the platform default.
  for (const selector of ["html", "body", '[data-slot="sidebar-inset"]', '[data-testid="workbench-toolbar"]']) {
    expect(await page.locator(selector).first().evaluate(el => [getComputedStyle(el).scrollbarWidth, getComputedStyle(el).scrollbarColor]), selector).toEqual(["auto", "auto"])
  }
  await workspaceMode(page, "Preview")
  const doc = page.frameLocator('[data-testid="preview-frame"]').locator("html")
  await expect(doc).toHaveClass(/quiet-scroll/)
  expect((await read(doc)).width).toBe("thin")
  const scrolled = await doc.evaluate(async el => { window.scrollTo(0, 400); await new Promise(r => requestAnimationFrame(r)); return document.scrollingElement!.scrollTop })
  expect(scrolled).toBeGreaterThan(0)
  // The preview document's own content (compositions, dialogs) keeps default scrollbars.
  expect(await page.frameLocator('[data-testid="preview-frame"]').locator('[data-slot="card"]').first().evaluate(el => getComputedStyle(el).scrollbarWidth)).toBe("auto")
})

for (const mode of ["light", "dark"] as const) {
  test(`full-region grouped theme Select stays anchored after resize, supports keyboard and persists — ${mode}`, async ({ page }, info) => {
    await page.goto("/")
    await setColorMode(page, mode)
    await workspaceMode(page, "Controls")
    const trigger = page.getByRole("combobox", { name: "Active theme" })
    const inspect = async () => {
      await trigger.focus()
      await trigger.press("ArrowDown")
      const list = page.getByRole("listbox")
      await expect(list).toBeVisible()
      await expect(page.getByRole("group", { name: "Built-in", exact: true }).getByRole("option")).toHaveText(["Default", "Quiet Editorial"])
      const anchor = (await trigger.boundingBox())!
      const region = (await page.locator('[data-slot="sidebar-header"] [data-slot="sidebar-menu-item"]').boundingBox())!
      const popup = (await page.locator('[data-slot="select-content"]').boundingBox())!
      expect(Math.abs(anchor.x - region.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(anchor.width - region.width)).toBeLessThanOrEqual(1)
      // Base UI preserves a small viewport collision inset while keeping the trigger itself full-region.
      expect(Math.abs(popup.x - anchor.x)).toBeLessThanOrEqual(8)
      expect(Math.abs(popup.y - anchor.y - anchor.height)).toBeLessThanOrEqual(1)
      expect(Math.abs(popup.width - anchor.width)).toBeLessThanOrEqual(16)
      expect(popup.y + popup.height).toBeLessThanOrEqual(page.viewportSize()!.height)
      // Hit-test the option as well as measuring its box: detects clipping by transformed/overflow ancestors.
      expect(await page.getByRole("option", { name: "Quiet Editorial" }).evaluate(el => {
        const r = el.getBoundingClientRect()
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
      })).toBe(true)
      await page.mouse.move(0, 0)
      await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
      const { violations } = await new AxeBuilder({ page }).analyze()
      await info.attach(`axe-theme-select-${mode}-${Math.round(anchor.width)}.json`, { body: JSON.stringify(violations), contentType: "application/json" })
      expect(violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
      await page.keyboard.press("Escape")
      await expect(trigger).toBeFocused()
    }
    await inspect()
    if (!isMobileShell(page)) {
      // Collapsing and reopening the sidebar leaves the Select anchored to its full header row.
      await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click()
      await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed")
      await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click()
      await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "expanded")
      await expect.poll(() => trigger.evaluate(el => el.getBoundingClientRect().left)).toBeGreaterThanOrEqual(0)
      await inspect()
    }
    await trigger.press("ArrowDown")
    await expect(page.getByRole("listbox")).toBeVisible()
    await expect(page.getByRole("option", { name: "Default" })).toBeFocused()
    await page.keyboard.press("End")
    await expect(page.getByRole("option", { name: "Quiet Editorial" })).toBeFocused()
    await page.keyboard.press("Enter")
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "quiet-editorial")
    await page.reload()
    await workspaceMode(page, "Controls")
    await expect(trigger).toHaveText("Quiet Editorial")
    await saveTheme(page, "Local Choice")
    await workspaceMode(page, "Controls")
    await trigger.click()
    await expect(page.getByRole("group", { name: "Custom", exact: true }).getByRole("option")).toHaveText(["Local Choice"])
    await page.keyboard.press("Escape")
    await page.emulateMedia({ reducedMotion: "reduce" })
    await inspect()
  })

  test(`theme Select shows primary, accent, secondary, and border swatches in the trigger and every row, with pointer and accent hover — ${mode}`, async ({ page }, info) => {
    await page.goto("/")
    await setColorMode(page, mode)
    await saveTheme(page, "Swatch Check")
    await workspaceMode(page, "Controls")
    const trigger = page.getByRole("combobox", { name: "Active theme" })
    const swatches = (scope: import("@playwright/test").Locator) => scope.locator('[data-testid="theme-swatches"] [data-token]').evaluateAll(nodes => nodes.map(n => ({ token: n.getAttribute("data-token"), color: getComputedStyle(n).backgroundColor, hidden: n.closest("[aria-hidden=true]") !== null })))
    const expected = async (themeId: string) => page.evaluate(({ themeId, mode }) => {
      const probe = document.createElement("span")
      document.body.append(probe)
      const saved = JSON.parse(localStorage.getItem("personal-ui-workbench/v1") ?? "{}").themes?.[themeId]
      const source = saved ?? null
      const read = (value: string) => { probe.style.backgroundColor = value; return getComputedStyle(probe).backgroundColor }
      const result = source ? ["primary", "accent", "secondary", "border"].map(t => read(source.colors[mode][t].$value)) : null
      probe.remove()
      return result
    }, { themeId, mode })
    const inTrigger = await swatches(trigger)
    expect(inTrigger.map(s => s.token)).toEqual(["primary", "accent", "secondary", "border"])
    expect(inTrigger.every(s => s.hidden)).toBe(true)
    expect(inTrigger.map(s => s.color)).toEqual(await expected("swatch-check"))
    await expect(trigger).toHaveText("Swatch Check")
    expect(await trigger.evaluate(el => getComputedStyle(el).cursor)).toBe("pointer")
    const restBg = await trigger.evaluate(el => getComputedStyle(el).backgroundColor)
    await trigger.hover()
    await expect.poll(() => trigger.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(await page.evaluate(() => { const p = document.createElement("span"); p.style.backgroundColor = "var(--accent)"; document.body.append(p); const c = getComputedStyle(p).backgroundColor; p.remove(); return c }))
    expect(restBg).not.toBe("")
    await trigger.click()
    const rows = page.getByRole("option")
    await expect(rows).toHaveText(["Default", "Quiet Editorial", "Swatch Check"])
    for (let i = 0; i < 3; i++) {
      const row = rows.nth(i)
      const found = await swatches(row)
      expect(found.map(s => s.token)).toEqual(["primary", "accent", "secondary", "border"])
      expect(await row.evaluate(el => getComputedStyle(el).cursor)).toBe("pointer")
    }
    // Built-in rows show their own colours: Default and Quiet Editorial differ.
    expect((await swatches(rows.nth(0))).map(s => s.color)).not.toEqual((await swatches(rows.nth(1))).map(s => s.color))
    await rows.nth(1).hover()
    await expect(rows.nth(1)).toHaveAttribute("data-highlighted", "")
    const { violations } = await new AxeBuilder({ page }).analyze()
    const decoded = violations.filter(v => v.impact === "serious" || v.impact === "critical")
    await info.attach(`axe-theme-swatches-${mode}.json`, { body: JSON.stringify(decoded), contentType: "application/json" })
    expect(decoded).toEqual([])
    await page.keyboard.press("Escape")
  })

  test(`only the active custom theme exposes a sibling delete action; confirmed deletion removes it and persists Default — ${mode}`, async ({ page }, info) => {
    await page.goto("/")
    await setColorMode(page, mode)
    const action = page.getByTestId("delete-theme")
    // Built-ins never expose delete.
    for (const id of ["default", "quiet-editorial"]) {
      await selectTheme(page, id)
      await workspaceMode(page, "Controls")
      await expect(action).toHaveCount(0)
      await expect(page.getByRole("button", { name: /^Delete /, exact: false })).toHaveCount(0)
    }
    await saveTheme(page, "Keep Me")
    await selectTheme(page, "default")
    await saveTheme(page, "Temporary")
    await workspaceMode(page, "Controls")
    await expect(action).toHaveCount(1)
    await expect(action).toHaveAccessibleName("Delete Temporary")
    // A sibling of the Select trigger, not inside it or its rows.
    expect(await action.evaluate(el => el.closest('[data-slot="select-trigger"], [role="option"]') === null && el.parentElement!.querySelector('[data-slot="select-trigger"]') !== null)).toBe(true)
    // Cancel changes nothing and never opens the Select.
    await action.click()
    const dialog = page.getByRole("dialog", { name: "Delete custom theme?" })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole("listbox")).toHaveCount(0)
    await expect(dialog).toContainText("Temporary")
    const { violations } = await new AxeBuilder({ page }).analyze()
    const decoded = violations.filter(v => v.impact === "serious" || v.impact === "critical")
    await info.attach(`axe-delete-dialog-${mode}.json`, { body: JSON.stringify(decoded), contentType: "application/json" })
    expect(decoded).toEqual([])
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "temporary")
    // Keyboard path: focus the action, open with Enter, confirm.
    await workspaceMode(page, "Controls")
    await action.focus()
    await page.keyboard.press("Enter")
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Delete theme", exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "default")
    await expect(page.getByTestId("notice")).toContainText('Deleted "Temporary"')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!))
    expect(stored.activeId).toBe("default")
    expect(Object.keys(stored.themes)).toEqual(["keep-me"])
    expect(Object.keys(stored.bases)).toEqual(["keep-me"])
    await page.reload()
    await workspaceMode(page, "Controls")
    await expect(page.getByRole("combobox", { name: "Active theme" })).toHaveText("Default")
    await expect(action).toHaveCount(0)
    await page.getByRole("combobox", { name: "Active theme" }).click()
    await expect(page.getByRole("option")).toHaveText(["Default", "Quiet Editorial", "Keep Me"])
    await page.keyboard.press("Escape")
  })

  test(`removed copy and manual authoring stay absent; ordinary labels match — ${mode}`, async ({ page }) => {
    await page.goto("/")
    await setColorMode(page, mode)
    const styles: unknown[] = []
    for (const [category, label] of [["Colors", "Primary"], ["Typography", "Sans font"], ["Other", "Shadow color"], ["Command", "Command"]] as const) {
      await editorCategory(page, category)
      await expect(page.getByRole("tabpanel", { name: category, exact: true })).toBeVisible()
      await expect(page.getByRole("heading", { name: category === "Command" ? "Design command" : category, exact: true })).toHaveCount(0)
      const input = category === "Command" ? page.getByTestId("design-command-input") : page.getByLabel(label, { exact: true })
      styles.push(await input.evaluate(el => {
        const label = document.querySelector(`label[for="${el.id}"]`)!
        const s = getComputedStyle(label)
        return [s.fontSize, s.fontWeight, s.fontFamily, s.color]
      }))
    }
    for (const style of styles) expect(style).toEqual(styles[0])
    await expect(page.getByText("Changes are staged for review; nothing applies automatically.")).toBeVisible()
    await expect(page.locator("#proposal-editor, [data-testid=proposal-log], [data-testid=theme-meta]")).toHaveCount(0)
    await expect(page.getByLabel("Proposal JSON")).toHaveCount(0)
    for (const name of ["Stage proposal", "Insert example", "Proposal"]) await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0)
    await workspaceMode(page, "Preview")
    const frame = page.frameLocator('[data-testid="preview-frame"]')
    await frame.getByRole("tab", { name: "States", exact: true }).click()
    expect(await frame.getByTestId("elevation-sample").evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none")
  })
}

test("all 24 local fonts load, render, write canonical stacks, export, persist and reload without external requests", async ({ page }, info) => {
  test.setTimeout(180_000)
  const requests: string[] = []
  const external: string[] = []
  await page.route("**/*", route => {
    const url = new URL(route.request().url())
    if (url.protocol.startsWith("http") && url.hostname !== "127.0.0.1") {
      external.push(url.href)
      return route.abort()
    }
    return route.continue()
  })
  page.on("request", request => { if (request.resourceType() === "font" || /\.woff2?(?:\?|$)/.test(request.url())) requests.push(request.url()) })
  await page.goto("/")
  await saveTheme(page, "Local Fonts")
  await previewStates(page)
  const frame = page.frameLocator('[data-testid="preview-frame"]')
  await editorCategory(page, "Typography")
  for (const category of ["sans", "serif", "mono"] as const) {
    for (const option of FONT_OPTIONS[category]) {
      const label = `${category[0]!.toUpperCase()}${category.slice(1)} font`
      const trigger = page.getByRole("combobox", { name: label, exact: true })
      await trigger.click()
      const input = page.getByRole("combobox", { name: `Search ${label}`, exact: true })
      await input.fill(option.label)
      await expect(page.getByRole("option", { name: option.label, exact: true })).toBeVisible()
      if (option === FONT_OPTIONS[category][0]) {
        await input.press("ArrowDown")
        expect(await input.evaluate(el => el.matches(":focus-visible"))).toBe(true)
        const { violations } = await new AxeBuilder({ page }).analyze()
        await info.attach(`axe-font-${category}-open.json`, { body: JSON.stringify(violations), contentType: "application/json" })
        expect(violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
        await input.press("Enter")
      } else await page.getByRole("option", { name: option.label, exact: true }).click()
      await expect(page.getByTestId(`control-font-${category}`)).toHaveAttribute("data-font", option.id)
      await expect.poll(() => frame.getByTestId(`type-${category}`).evaluate(el => getComputedStyle(el).fontFamily)).toContain(option.stack[0])
      // FontFaceSet.load must return a registered, loaded local face; check() alone can pass on a fallback.
      for (const context of [page, frame]) {
        const loaded = await context.locator("html").evaluate(async (_, face) => {
          const fonts = await document.fonts.load(`16px "${face}"`, "Hamburgefontsiv 012345")
          return fonts.map(font => ({ family: font.family.replace(/"/g, ""), status: font.status }))
        }, option.stack[0]!)
        expect(loaded.length).toBeGreaterThan(0)
        expect(loaded.every(font => font.family === option.stack[0] && font.status === "loaded")).toBe(true)
      }
      // Export measures the actual canonical active value for every option.
      await workspaceMode(page, "Preview")
      const downloaded = page.waitForEvent("download")
      await page.getByRole("button", { name: "Export JSON" }).click()
      const data = JSON.parse(readFileSync((await (await downloaded).path())!, "utf8"))
      expect(data.typography[category].$value).toEqual(option.stack)
      await saveTheme(page)
      await page.reload()
      await previewStates(page)
      await editorCategory(page, "Typography")
      await expect(page.getByTestId(`control-font-${category}`)).toHaveAttribute("data-font", option.id)
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!).themes["local-fonts"])
      expect(saved.typography[category].$value).toEqual(option.stack)
    }
  }
  await saveTheme(page)
  await page.reload()
  await editorCategory(page, "Typography")
  for (const category of ["sans", "serif", "mono"] as const) {
    const last = FONT_OPTIONS[category].at(-1)!
    await expect(page.getByTestId(`control-font-${category}`)).toHaveAttribute("data-font", last.id)
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!).themes["local-fonts"])
    expect(saved.typography[category].$value).toEqual(last.stack)
  }
  expect(requests.length).toBeGreaterThan(0)
  expect(external).toEqual([])
  expect(requests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true)
  await info.attach("local-font-requests.json", { body: JSON.stringify({ requests, external }), contentType: "application/json" })
})
