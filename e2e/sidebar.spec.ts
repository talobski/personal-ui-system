import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const story = `/iframe.html?id=pilot-sidebar--default&viewMode=story`
const colorModes = ["light", "dark"] as const

async function setColorMode(page: Page, mode: (typeof colorModes)[number]) {
  await page.locator("html").evaluate((element, nextMode) => element.classList.toggle("dark", nextMode === "dark"), mode)
  expect(await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(mode === "dark")
  await page.waitForTimeout(250)
}

async function assertNoSeriousOrCritical(page: Page, testInfo: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")
  await testInfo.attach(`axe-critical-serious-${label}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious).toEqual([])
}

const resolved = (page: Page, token: string) =>
  page.evaluate((token) => {
    const probe = document.createElement("span")
    probe.style.backgroundColor = `var(--${token})`
    document.body.append(probe)
    const color = getComputedStyle(probe).backgroundColor
    probe.remove()
    return color
  }, token)

test("Sidebar shell: desktop width, semantic tokens, menu actions as siblings, keyboard and pointer collapse (WSSP-02)", async ({ page }, testInfo) => {
  const mobile = page.viewportSize()!.width < 768
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story)
      await setColorMode(page, mode)
      const trigger = page.getByRole("button", { name: "Toggle Sidebar", exact: true })
      await expect(trigger).toBeVisible()
      if (mobile) {
        await expect(page.getByRole("dialog")).toHaveCount(0)
        await trigger.click()
        const sheet = page.getByRole("dialog", { name: "Sidebar" })
        await expect(sheet).toBeVisible()
        await expect(sheet).toHaveAccessibleDescription("Displays the mobile sidebar.")
        expect((await sheet.boundingBox())!.width).toBeCloseTo(288, 0)
        await expect.poll(() => sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true)
        expect(await sheet.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolved(page, "card"))
        await assertNoSeriousOrCritical(page, testInfo, `sidebar-mobile-open-${mode}`)
        await sheet.getByRole("button", { name: "Typography" }).click()
        await expect(sheet.getByRole("button", { name: "Typography" })).toHaveAttribute("data-active", "true")
        await page.keyboard.press("Escape")
        await expect(sheet).toHaveCount(0)
        await expect(trigger).toBeFocused()
        await expect(page.getByTestId("inset-content")).toHaveText("Main content for Typography.")
        return
      }
      const container = page.locator('[data-slot="sidebar-container"]')
      expect((await container.boundingBox())!.width).toBeCloseTo(22 * 16, 0)
      expect(await page.locator('[data-slot="sidebar-inner"]').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolved(page, "card"))
      expect(await container.evaluate((el) => getComputedStyle(el).borderRightColor)).toBe(await resolved(page, "border"))
      // Active item and hover use the accent token.
      const colors = page.getByRole("button", { name: "Colors" })
      await expect(colors).toHaveAttribute("data-active", "true")
      expect(await colors.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolved(page, "accent"))
      const other = page.getByRole("button", { name: "Other" })
      await other.hover()
      await expect.poll(() => other.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await resolved(page, "accent"))
      // Keyboard: tab to a menu button, activate it, and see a visible focus ring.
      await other.focus()
      expect(await other.evaluate((el) => el.matches(":focus-visible") || getComputedStyle(el).boxShadow !== "none")).toBe(true)
      await page.keyboard.press("Enter")
      await expect(other).toHaveAttribute("data-active", "true")
      await expect(page.getByTestId("inset-content")).toHaveText("Main content for Other.")
      // The menu action is a sibling of its row button and does not activate the row.
      const action = page.getByRole("button", { name: "Delete Studio" })
      expect(await action.evaluate((el) => el.parentElement!.querySelector('[data-slot="sidebar-menu-button"]') !== null && el.closest('[data-slot="sidebar-menu-button"]') === null)).toBe(true)
      await action.click()
      await expect(page.getByRole("button", { name: "Studio", exact: true })).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Archive", exact: true })).toBeVisible()
      await assertNoSeriousOrCritical(page, testInfo, `sidebar-desktop-${mode}`)
      // Pointer collapse and keyboard shortcut expand; the inset takes the freed width.
      await trigger.click()
      await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed")
      await expect.poll(async () => (await page.locator('[data-slot="sidebar-inset"]').boundingBox())!.x).toBeCloseTo(0, 0)
      await page.keyboard.press("Control+b")
      await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "expanded")
      await page.emulateMedia({ reducedMotion: "reduce" })
      await trigger.click()
      await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed")
      await page.emulateMedia({ reducedMotion: "no-preference" })
    })
  }
})
