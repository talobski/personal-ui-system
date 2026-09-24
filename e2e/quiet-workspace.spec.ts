import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { workspaceMode, editorCategory } from "./workbench-navigation"

const ids = ["productive-week", "account-profile", "team-access", "workspace-settings", "notifications", "support-request", "recent-activity", "room-to-think"]

test("preview width starts responsively and preserves an explicit choice across outer resizes", async ({ page }) => {
  const startsDesktop = page.viewportSize()!.width >= 1024
  await page.goto("/")
  await workspaceMode(page, "Preview")
  const frame = page.getByTestId("preview-frame")
  const initialLabel = startsDesktop ? "Desktop 1024" : "Mobile 390"
  const chosenLabel = startsDesktop ? "Mobile 390" : "Desktop 1024"
  const chosenWidth = startsDesktop ? 390 : 1024
  await expect(page.getByRole("radio", { name: initialLabel, exact: true })).toBeChecked()
  await expect(frame).toHaveCSS("width", startsDesktop ? "1024px" : "390px")
  await page.getByRole("radio", { name: chosenLabel, exact: true }).click()
  for (const width of startsDesktop ? [390, 1600] : [1600, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await workspaceMode(page, "Preview")
    await expect(page.getByRole("radio", { name: chosenLabel, exact: true })).toBeChecked()
    await expect(frame).toHaveCSS("width", `${chosenWidth}px`)
  }
})

for (const mode of ["light", "dark"] as const) {
  test(`quiet workspace layout, cards, mobile preservation and accessibility — ${mode}`, async ({ page }, info) => {
    await page.goto("/")
    const frame = page.frameLocator('[data-testid="preview-frame"]')
    await expect(frame.getByTestId("preview")).toHaveAttribute("data-ready", "true")
    const mobile = page.viewportSize()!.width < 1024
    await workspaceMode(page, "Preview")
    await page.getByRole("radio", { name: mode === "dark" ? "Dark" : "Light", exact: true }).click()
    await expect(frame.getByRole("tab", { name: "Cards", exact: true })).toHaveAttribute("aria-selected", "true")
    for (const width of [390, 1024]) {
      await page.getByRole("radio", { name: `${width === 390 ? "Mobile" : "Desktop"} ${width}` }).click()
      await expect(frame.locator("[data-composition]")).toHaveCount(8)
      expect(await frame.locator("[data-composition]").evaluateAll(nodes => nodes.map(n => n.getAttribute("data-composition")))).toEqual(ids)
      const geometry = await frame.locator("[data-composition]").evaluateAll(nodes => nodes.map(n => { const r = n.getBoundingClientRect(); return { x: r.x, right: r.right, width: r.width, scroll: n.scrollWidth, client: n.clientWidth } }))
      for (const box of geometry) { expect(box.x).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(width); expect(box.scroll).toBeLessThanOrEqual(box.client + 1) }
      if (width === 390) expect(new Set(geometry.map(b => b.x)).size).toBe(1)
      else expect(new Set(geometry.map(b => b.x)).size).toBe(3)
    }
    await page.getByRole("radio", { name: "Mobile 390" }).click()
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
    await page.getByLabel("Color value").fill("rejected draft retained")
    await expect(page.getByTestId("color-value-error")).toBeVisible()
    await workspaceMode(page, "Preview")
    await expect(frame.getByLabel("Display name", { exact: true })).toHaveValue("Ada Preview")
    await workspaceMode(page, "Controls")
    await expect(page.getByLabel("Color value")).toHaveValue("rejected draft retained")
    await expect(page.getByTestId("theme-revision")).toHaveText("1")
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

test("desktop separator pointer, Arrow, Home, End, focus and viewport clamps", async ({ page }) => {
  test.skip(page.viewportSize()!.width < 1024, "Desktop split is deliberately replaced by mobile tabs")
  await page.goto("/")
  const editor = page.locator('#editor-panel')
  const width = () => editor.evaluate(el => el.getBoundingClientRect().width)
  const handle = page.getByRole("separator", { name: "Resize editor" })
  await expect.poll(width).toBeCloseTo(352, 0)
  await handle.focus()
  await expect(handle).toBeFocused()
  expect(await handle.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none")
  await page.keyboard.press("End"); await expect.poll(width).toBeCloseTo(480, 0)
  await page.keyboard.press("Home"); await expect.poll(width).toBeCloseTo(352, 0)
  await page.keyboard.press("ArrowRight"); await expect.poll(width).toBeGreaterThan(352)
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + 100); await page.mouse.down(); await page.mouse.move(page.viewportSize()!.width - 10, box.y + 100, { steps: 10 }); await page.mouse.up()
  await expect.poll(width).toBeCloseTo(480, 0)
  await page.setViewportSize({ width: 1024, height: 900 })
  await expect.poll(width).toBeLessThanOrEqual(384.5)
  await expect.poll(width).toBeGreaterThanOrEqual(351.5)
  await expect(page.getByTestId("theme-revision")).toHaveText("1")
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
