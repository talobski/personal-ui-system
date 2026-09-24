import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-collapsible--${name}&viewMode=story`
const colorModes = ["light", "dark"] as const

async function setColorMode(page: Page, mode: (typeof colorModes)[number]) {
  await page.locator("html").evaluate((element, nextMode) => element.classList.toggle("dark", nextMode === "dark"), mode)
  expect(await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(mode === "dark")
  await page.waitForTimeout(150)
}

async function assertNoSeriousOrCritical(page: Page, testInfo: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")
  await testInfo.attach(`axe-critical-serious-${label}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious).toEqual([])
}

test("Collapsible toggles with Enter and Space, exposes state, and moves focus into open content only", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("closed"))
      await setColorMode(page, mode)
      const trigger = page.getByRole("button", { name: "Shadow" })
      const field = page.getByLabel("Blur")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
      await expect(field).toBeHidden()
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-closed`)

      await page.keyboard.press("Tab")
      await expect(trigger).toBeFocused()
      expect(await trigger.evaluate((el) => el.matches(":focus-visible"))).toBe(true)
      // Closed content is not rendered, so it is out of the tab order and the accessibility tree.
      await expect(page.locator("#shadow-blur")).toHaveCount(0)
      await page.keyboard.press("Tab")
      expect(await page.evaluate(() => document.activeElement?.id ?? "")).not.toBe("shadow-blur")
      await trigger.focus()

      await page.keyboard.press("Enter")
      await expect(trigger).toHaveAttribute("aria-expanded", "true")
      const contentId = await trigger.getAttribute("aria-controls")
      expect(contentId).toBeTruthy()
      await expect(page.locator(`[id="${contentId}"]`)).toBeVisible()
      await page.keyboard.press("Tab")
      await expect(field).toBeFocused()
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-open`)

      await trigger.focus()
      await page.keyboard.press("Space")
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
      await expect(field).toBeHidden()
    })
  }
})

test("Collapsible opens with the pointer and keeps its open story state", async ({ page }) => {
  await page.goto(story("open"))
  const trigger = page.getByRole("button", { name: "Shadow" })
  await expect(trigger).toHaveAttribute("aria-expanded", "true")
  await expect(page.getByLabel("Blur")).toBeVisible()
  await trigger.click()
  await expect(trigger).toHaveAttribute("aria-expanded", "false")
  await trigger.click()
  await expect(page.getByLabel("Blur")).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test("disabled Collapsible ignores activation", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("disabled"))
      await setColorMode(page, mode)
      const trigger = page.getByRole("button", { name: "Shadow" })
      await expect(trigger).toBeDisabled()
      await trigger.click({ force: true })
      await expect(trigger).toHaveAttribute("aria-expanded", "false")
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-disabled`)
    })
  }
})

test("Collapsible stays operable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(story("closed"))
  await page.getByRole("button", { name: "Shadow" }).click()
  await expect(page.getByLabel("Blur")).toBeVisible()
})
