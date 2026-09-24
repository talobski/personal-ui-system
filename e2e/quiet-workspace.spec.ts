import { readFileSync } from "node:fs"
import { FONT_OPTIONS } from "../packages/ui/src/lib/fonts"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { colorInput, editorCategory, setColorMode, workspaceMode, saveTheme, previewStates } from "./workbench-navigation"

const ids = ["productive-week", "account-profile", "team-access", "workspace-settings", "notifications", "support-request", "recent-activity", "room-to-think"]

/** The preview iframe's box versus the panel content box it should fill (WTEP-02). */
async function previewFill(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const frame = document.querySelector('[data-testid="preview-frame"]')!.getBoundingClientRect()
    const body = document.querySelector(".quiet-preview-body")!
    const panel = body.getBoundingClientRect()
    const toolbar = document.querySelector(".quiet-toolbar")!.getBoundingClientRect()
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
  const desktop = page.viewportSize()!.width >= 1024
  // 1440x900: everything right of the 352px editor and 1px divider, with no viewport inset; 390x844: the full mode.
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
    const mobile = page.viewportSize()!.width < 1024
    await setColorMode(page, mode)
    await expect(frame.getByTestId("preview")).toHaveAttribute("data-mode", mode)
    await expect(page.locator("html")).toHaveClass(mode === "dark" ? /dark/ : /^(?!.*dark).*$/)
    await expect(frame.getByRole("tab", { name: "Cards", exact: true })).toHaveAttribute("aria-selected", "true")
    {
      const width = await frame.locator("html").evaluate(() => innerWidth)
      await expect(frame.locator("[data-composition]")).toHaveCount(8)
      expect(await frame.locator(".quiet-gallery [data-composition] > [data-slot=card]").evaluateAll(nodes => nodes.map(n => getComputedStyle(n).boxShadow))).toEqual(Array(8).fill("none"))
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
    await expect(colorInput(page, "primary")).toHaveValue("rejected draft retained")
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "1")
    if (mobile) {
      await expect(page.getByRole("separator", { name: "Resize editor" })).toHaveCount(0)
      await expect(page.locator(".quiet-editor")).toBeVisible()
      await expect(page.locator(".quiet-preview")).toBeHidden()
      const tab = page.getByRole("tab", { name: "Controls", exact: true })
      await tab.focus(); await page.keyboard.press("ArrowRight")
      await expect(page.getByRole("tab", { name: "Preview", exact: true })).toHaveAttribute("aria-selected", "true")
      await expect(page.locator(".quiet-editor")).toBeHidden()
      await expect(page.locator(".quiet-preview")).toBeVisible()
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

test("desktop separator is a subtle divider with hover, focus, pointer, Arrow, Home, End and viewport clamps (WTEP-10)", async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, "Desktop split is deliberately replaced by mobile tabs")
  await page.goto("/")
  const editor = page.locator('#editor-panel')
  const width = () => editor.evaluate(el => el.getBoundingClientRect().width)
  const handle = page.getByRole("separator", { name: "Resize editor" })
  await expect.poll(width).toBeCloseTo(352, 0)
  await expect(handle).toHaveAttribute("aria-orientation", "vertical")
  await expect(handle).toHaveAttribute("aria-controls", "editor-panel")
  await expect(handle).toHaveAttribute("aria-valuenow", /\d/)
  // Subtle: a one-pixel border-coloured line with no visible grip, over the library's larger hit target.
  const look = () => handle.evaluate(el => ({ width: el.getBoundingClientRect().width, bg: getComputedStyle(el).backgroundColor, grip: Array.from(el.children).filter(c => getComputedStyle(c).display !== "none").length, border: getComputedStyle(document.documentElement).getPropertyValue("--border").trim() }))
  const rest = await look()
  expect(rest.width).toBe(1)
  expect(rest.grip).toBe(0)
  expect(rest.bg).toBe(rest.border)
  // Hover feedback just beside the line (inside the invisible target) and a resize cursor.
  const hit = (await handle.boundingBox())!
  await page.mouse.move(hit.x + hit.width / 2 + 4, hit.y + 200)
  await expect.poll(async () => (await look()).bg).not.toBe(rest.bg)
  expect(await page.evaluate(() => getComputedStyle(document.body).cursor)).toMatch(/resize/)
  await page.mouse.move(0, 0)
  await expect.poll(async () => (await look()).bg).toBe(rest.bg)
  // Keyboard focus is clearly visible.
  await page.getByRole("tab", { name: "Colors", exact: true }).focus()
  await page.keyboard.press("Shift+Tab")
  await handle.focus()
  await expect(handle).toBeFocused()
  expect(await handle.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none")
  expect((await look()).bg).not.toBe(rest.bg)
  await page.keyboard.press("End"); await expect.poll(width).toBeCloseTo(480, 0)
  await page.keyboard.press("Home"); await expect.poll(width).toBeCloseTo(352, 0)
  await page.keyboard.press("ArrowRight"); await expect.poll(width).toBeGreaterThan(352)
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 100); await page.mouse.down(); await page.mouse.move(page.viewportSize()!.width - 10, box.y + 100, { steps: 10 }); await page.mouse.up()
  await expect.poll(width).toBeCloseTo(480, 0)
  await page.setViewportSize({ width: 1024, height: 900 })
  await expect.poll(width).toBeLessThanOrEqual(384.5)
  await expect.poll(width).toBeGreaterThanOrEqual(351.5)
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "1")
  await page.setViewportSize({ width: 320, height: 844 })
  await workspaceMode(page, "Controls")
  await expect(page.getByLabel("Editor category")).toBeVisible()
  await page.getByLabel("Editor category").selectOption("other")
  const radius = page.getByRole("textbox", { name: "Radius" })
  await expect(radius).toBeVisible()
  expect(await radius.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16)
  await expect(page.getByRole("slider", { name: "Radius" })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
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
      const region = (await page.locator(".quiet-theme").boundingBox())!
      const popup = (await page.locator('[data-slot="select-content"]').boundingBox())!
      expect(Math.abs(anchor.x - region.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(anchor.width - region.width)).toBeLessThanOrEqual(1)
      expect(Math.abs(popup.x - anchor.x)).toBeLessThanOrEqual(1)
      expect(Math.abs(popup.y - anchor.y - anchor.height)).toBeLessThanOrEqual(1)
      expect(Math.abs(popup.width - anchor.width)).toBeLessThanOrEqual(1)
      expect(popup.y + popup.height).toBeLessThanOrEqual(page.viewportSize()!.height)
      // Hit-test the option as well as measuring its box: detects clipping by transformed/overflow ancestors.
      expect(await page.getByRole("option", { name: "Quiet Editorial" }).evaluate(el => {
        const r = el.getBoundingClientRect()
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
      })).toBe(true)
      const { violations } = await new AxeBuilder({ page }).analyze()
      await info.attach(`axe-theme-select-${mode}-${Math.round(anchor.width)}.json`, { body: JSON.stringify(violations), contentType: "application/json" })
      expect(violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
      await page.keyboard.press("Escape")
      await expect(trigger).toBeFocused()
    }
    await inspect()
    if (page.viewportSize()!.width >= 1024) {
      const handle = page.getByRole("separator", { name: "Resize editor" })
      await handle.focus()
      await handle.press("End")
      await expect.poll(() => page.locator("#editor-panel").evaluate(el => el.getBoundingClientRect().width)).toBeCloseTo(480, 0)
      await inspect()
    }
    await trigger.press("ArrowDown")
    await page.keyboard.press("End")
    await page.keyboard.press("Enter")
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "quiet-editorial")
    await page.reload()
    await expect(trigger).toHaveText("Quiet Editorial")
    await saveTheme(page, "Local Choice")
    await workspaceMode(page, "Controls")
    await trigger.click()
    await expect(page.getByRole("group", { name: "Custom", exact: true }).getByRole("option")).toHaveText(["Local Choice"])
    await page.keyboard.press("Escape")
    await page.emulateMedia({ reducedMotion: "reduce" })
    await inspect()
  })

  test(`removed copy and manual authoring stay absent; ordinary labels match — ${mode}`, async ({ page }) => {
    await page.goto("/")
    await setColorMode(page, mode)
    const styles: unknown[] = []
    for (const [category, label] of [["Colors", "Primary"], ["Typography", "Sans font"], ["Other", "Shadow color"], ["Command", "Command"]] as const) {
      await editorCategory(page, category)
      await expect(page.getByRole("tabpanel", { name: category, exact: true })).toBeVisible()
      await expect(page.getByRole("heading", { name: category === "Command" ? "Design command" : category, exact: true })).toHaveCount(0)
      const input = page.getByLabel(label, { exact: true })
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
      const input = page.getByRole("combobox", { name: `${category[0]!.toUpperCase()}${category.slice(1)} font`, exact: true })
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
