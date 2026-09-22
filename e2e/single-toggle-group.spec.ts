import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-single-toggle-group--${name}&viewMode=story`
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

test("SingleToggleGroup keeps exactly one option selected and supports keyboard focus", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("default"))
      await setColorMode(page, mode)

      const group = page.getByRole("radiogroup", { name: "Plan" })
      await expect(group).toBeVisible()
      const monthly = page.getByRole("radio", { name: "Monthly" })
      const yearly = page.getByRole("radio", { name: "Yearly" })
      await expect(monthly).toHaveAttribute("data-state", "on")
      await expect(yearly).toHaveAttribute("data-state", "off")

      await monthly.focus()
      await expect(monthly).toBeFocused()
      await page.keyboard.press("ArrowRight")
      await expect(yearly).toBeFocused()
      await yearly.press(" ")
      await expect(yearly).toHaveAttribute("data-state", "on")
      await expect(monthly).toHaveAttribute("data-state", "off")

      // Pressing the already-active option again must not deselect it (exactly one stays selected).
      await yearly.press(" ")
      await expect(yearly).toHaveAttribute("data-state", "on")

      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})

test("disabled SingleToggleGroup options are inert", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("disabled"))
      await setColorMode(page, mode)
      const monthly = page.getByRole("radio", { name: "Monthly" })
      await expect(monthly).toBeDisabled()
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
