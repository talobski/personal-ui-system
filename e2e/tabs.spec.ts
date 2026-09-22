import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-tabs--${name}&viewMode=story`
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

test("Tabs exposes tab/list/panel semantics and switches panels with arrow keys", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("default"))
      await setColorMode(page, mode)

      const tablist = page.getByRole("tablist")
      await expect(tablist).toBeVisible()
      const profileTab = page.getByRole("tab", { name: "Profile" })
      const billingTab = page.getByRole("tab", { name: "Billing" })
      await expect(profileTab).toHaveAttribute("aria-selected", "true")
      await expect(page.getByRole("tabpanel")).toHaveText("Profile settings panel.")

      await profileTab.focus()
      await expect(profileTab).toBeFocused()
      await page.keyboard.press("ArrowRight")
      await expect(billingTab).toBeFocused()
      await expect(billingTab).toHaveAttribute("aria-selected", "true")
      await expect(page.getByRole("tabpanel")).toHaveText("Billing settings panel.")

      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})

test("a disabled tab is skipped by keyboard navigation and cannot become active", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("disabled-tab"))
      await setColorMode(page, mode)

      const profileTab = page.getByRole("tab", { name: "Profile" })
      const billingTab = page.getByRole("tab", { name: "Billing" })
      const securityTab = page.getByRole("tab", { name: "Security" })
      await expect(billingTab).toBeDisabled()

      await profileTab.focus()
      await page.keyboard.press("ArrowRight")
      await expect(securityTab).toBeFocused()
      await expect(billingTab).not.toHaveAttribute("aria-selected", "true")

      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
