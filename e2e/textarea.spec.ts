import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-textarea--${name}&viewMode=story`
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

test("Field composes a labelled Textarea with keyboard entry and visible focus", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("default"))
      await setColorMode(page, mode)
      const textarea = page.getByLabel("Message")
      await textarea.focus()
      await expect(textarea).toBeFocused()
      await textarea.press("End")
      await textarea.type(" More detail.")
      await expect(textarea).toHaveValue(/More detail\.$/)
      await expect(textarea).toHaveCSS("font-size", page.viewportSize()!.width < 768 ? "16px" : "14px")
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})

test("invalid and disabled Textarea states retain native associations", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("invalid"))
      await setColorMode(page, mode)
      const invalid = page.getByLabel("Message")
      await expect(invalid).toHaveAttribute("aria-invalid", "true")
      await expect(invalid).toHaveAttribute("aria-describedby", "message-error")
      await expect(page.getByRole("alert")).toHaveText("Enter a message.")
      await assertNoSeriousOrCritical(page, testInfo, mode)

      await page.goto(story("disabled"))
      await setColorMode(page, mode)
      await expect(page.getByLabel("Message")).toBeDisabled()
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
