import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=composition-account-profile--${name}&viewMode=story`
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

test("Account profile composes Card, Field, Input, NativeSelect, Textarea, and Button", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("default"))
      await setColorMode(page, mode)

      await expect(page.getByText("Account profile")).toBeVisible()
      const name = page.getByLabel("Display name")
      await name.focus()
      await expect(name).toBeFocused()
      await page.keyboard.press("Tab")
      await expect(page.getByLabel("Email")).toBeFocused()

      await expect(page.getByLabel("Country")).toHaveValue("ph")
      await expect(page.getByLabel("Bio")).toHaveValue("Mathematician and writer.")
      await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible()

      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})

test("an invalid email is associated with its error message", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("invalid-email"))
      await setColorMode(page, mode)
      const email = page.getByLabel("Email")
      await expect(email).toHaveAttribute("aria-invalid", "true")
      await expect(email).toHaveAttribute("aria-describedby", "profile-email-error")
      await expect(page.getByRole("alert")).toHaveText("Enter a valid email address.")
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
