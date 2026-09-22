import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const STORY_URL = "/iframe.html?id=composition-notification-preferences--default&viewMode=story"
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

/** The fixture must stay fluid within the viewport (bounded desktop max width) rather than forcing horizontal scroll. */
async function assertNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => ({
    documentElement: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    body: document.body.scrollWidth > document.body.clientWidth,
  }))
  expect(overflow).toEqual({ documentElement: false, body: false })
}

test("Notification preferences composes Card, labelled Switch rows, and Button", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(STORY_URL)
      await setColorMode(page, mode)

      await expect(page.getByText("Notification preferences")).toBeVisible()

      const email = page.getByRole("switch", { name: "Email notifications" })
      const push = page.getByRole("switch", { name: "Push notifications" })
      const sms = page.getByRole("switch", { name: "SMS alerts" })
      await expect(email).toBeChecked()
      await expect(push).not.toBeChecked()
      await expect(sms).toBeDisabled()

      await email.focus()
      await expect(email).toBeFocused()
      await page.keyboard.press("Space")
      await expect(email).not.toBeChecked()
      await page.keyboard.press("Tab")
      await expect(push).toBeFocused()

      await expect(page.getByRole("button", { name: "Save preferences" })).toBeVisible()

      await assertNoHorizontalOverflow(page)
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
