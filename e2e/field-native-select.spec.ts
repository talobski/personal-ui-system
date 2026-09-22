import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-field--${name}&viewMode=story`
const colorModes = ["light", "dark"] as const

async function setColorMode(page: import("@playwright/test").Page, mode: (typeof colorModes)[number]) {
  await page.locator("html").evaluate((element, nextMode) => element.classList.toggle("dark", nextMode === "dark"), mode)
  expect(await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(mode === "dark")
}

async function assertNoSeriousOrCritical(page: import("@playwright/test").Page, testInfo: import("@playwright/test").TestInfo, mode: (typeof colorModes)[number]) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")
  await testInfo.attach(`axe-critical-serious-${mode}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious).toEqual([])
}

test("Field composes a labelled native select with native keyboard selection and visible focus", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("native-select"))
      await setColorMode(page, mode)
      const select = page.getByLabel("Country")
      await expect(select).toHaveAccessibleDescription("Choose the country where you work.")
      await select.focus()
      await expect(select).toBeFocused()
      await select.press("KeyJ")
      await expect(select).toHaveValue("jp")
      await expect(select).toHaveCSS("font-size", page.viewportSize()!.width < 768 ? "16px" : "14px")
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})

test("invalid and disabled Field states retain native associations", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("invalid"))
      await setColorMode(page, mode)
      const invalid = page.getByLabel("Country")
      await expect(invalid).toHaveAttribute("aria-invalid", "true")
      await expect(invalid).toHaveAttribute("aria-describedby", /country-error/)
      await expect(page.getByRole("alert")).toHaveText("Choose a country.")
      await assertNoSeriousOrCritical(page, testInfo, mode)

      await page.goto(story("disabled"))
      await setColorMode(page, mode)
      await expect(page.getByLabel("Country")).toBeDisabled()
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
