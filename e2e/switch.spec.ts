import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-switch--${name}&viewMode=story`
const colorModes = ["light", "dark"] as const

async function setColorMode(page: import("@playwright/test").Page, mode: (typeof colorModes)[number]) {
  await page.locator("html").evaluate((element, nextMode) => element.classList.toggle("dark", nextMode === "dark"), mode)
  expect(await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(mode === "dark")
  // Form-control "used" text/placeholder color settles asynchronously after a class-driven CSS custom property
  // change (verified empirically: a couple of rAFs is not enough, a short real wait is); settle before measuring contrast.
  await page.waitForTimeout(150)
}

async function assertNoSeriousOrCritical(page: import("@playwright/test").Page, testInfo: import("@playwright/test").TestInfo, mode: (typeof colorModes)[number]) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")
  await testInfo.attach(`axe-critical-serious-${mode}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious).toEqual([])
}

test("Switch has an accessible name and toggles with the keyboard, keeping visible focus", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("checked"))
      await setColorMode(page, mode)

      const toggle = page.getByRole("switch", { name: "Email notifications" })
      await expect(toggle).toBeChecked()
      await toggle.focus()
      await expect(toggle).toBeFocused()
      await page.keyboard.press("Space")
      await expect(toggle).not.toBeChecked()

      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})

test("unchecked and disabled Switch states are correct", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("unchecked"))
      await setColorMode(page, mode)
      await expect(page.getByRole("switch", { name: "Email notifications" })).not.toBeChecked()
      await assertNoSeriousOrCritical(page, testInfo, mode)

      await page.goto(story("disabled"))
      await setColorMode(page, mode)
      await expect(page.getByRole("switch", { name: "Email notifications" })).toBeDisabled()
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})

test("optional thumbContent keeps Switch semantics and swaps a decorative glyph inside the thumb (CGS-11)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("thumb-icon"))
      await setColorMode(page, mode)
      const toggle = page.getByRole("switch", { name: "Toggle dark mode", exact: true })
      const thumb = toggle.locator('[data-slot="switch-thumb"]')
      await expect(toggle).not.toBeChecked()
      await expect(thumb.locator('[data-icon="sun"]')).toHaveCount(1)
      await expect(thumb.locator("svg")).toHaveAttribute("aria-hidden", "true")
      await toggle.focus()
      await expect.poll(() => toggle.evaluate(el => el.matches(":focus-visible"))).toBe(true)
      await page.keyboard.press("Space")
      await expect(toggle).toBeChecked()
      await expect(thumb.locator('[data-icon="moon"]')).toHaveCount(1)
      await expect(thumb.locator('[data-icon="sun"]')).toHaveCount(0)
      // The glyph is centred within the thumb's box.
      await page.waitForTimeout(250)
      const [t, i] = [(await thumb.boundingBox())!, (await thumb.locator("svg").boundingBox())!]
      expect(Math.abs(t.x + t.width / 2 - (i.x + i.width / 2))).toBeLessThanOrEqual(1)
      expect(Math.abs(t.y + t.height / 2 - (i.y + i.height / 2))).toBeLessThanOrEqual(1)
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
