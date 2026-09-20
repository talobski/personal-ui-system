import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const STORY_URL = "/iframe.html?id=pilot-responsive-dialog--default&viewMode=story"

async function openPattern(page: Page) {
  await page.goto(STORY_URL)
  await page.getByRole("button", { name: "Edit profile" }).click()
}

/** Waits for slide/fade animation to finish so axe measures settled contrast and layout. */
async function settled(page: Page, selector: string) {
  const content = page.locator(selector)
  await expect(content).toBeVisible()
  let previous = ""
  await expect
    .poll(async () => {
      const box = JSON.stringify(await content.boundingBox())
      const stable = box === previous
      previous = box
      return stable
    })
    .toBe(true)
}

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.filter((v) => v.impact === "critical" || v.impact === "serious")
}

test("renders the declared replacement for the project viewport", async ({ page }, testInfo) => {
  const width = page.viewportSize()!.width
  const expectDrawer = width <= 640
  const present = expectDrawer ? '[data-slot="drawer-content"]' : '[data-slot="dialog-content"]'
  const absent = expectDrawer ? '[data-slot="dialog-content"]' : '[data-slot="drawer-content"]'

  await openPattern(page)
  await settled(page, present)
  await expect(page.locator(absent)).toHaveCount(0)

  const modal = page.getByRole("dialog", { name: "Edit profile" })
  await expect(modal).toBeVisible()
  await expect(modal).toHaveAccessibleDescription("Change how your name appears to others.")

  const violations = await seriousViolations(page)
  await testInfo.attach("axe-critical-serious.json", { body: JSON.stringify(violations, null, 2), contentType: "application/json" })
  expect(violations, JSON.stringify(violations.map((v) => [v.id, v.nodes.map((n) => n.target)]))).toEqual([])

  // Keyboard: Escape dismisses and focus returns to the trigger.
  await page.keyboard.press("Escape")
  await expect(page.locator(present)).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Edit profile" })).toBeFocused()
})

test("switches hard at 640px", async ({ page }) => {
  for (const [width, slot] of [[640, "drawer-content"], [641, "dialog-content"]] as const) {
    await page.setViewportSize({ width, height: 844 })
    await openPattern(page)
    await settled(page, `[data-slot="${slot}"]`)
    await page.keyboard.press("Escape")
    await expect(page.locator(`[data-slot="${slot}"]`)).toHaveCount(0)
  }
})
