import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-field--${name}&viewMode=story`
const colorModes = ["light", "dark"] as const

async function setColorMode(page: import("@playwright/test").Page, mode: (typeof colorModes)[number]) {
  await page.locator("html").evaluate((element, nextMode) => element.classList.toggle("dark", nextMode === "dark"), mode)
  expect(await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(mode === "dark")
  // Inputs transition their text colour (shadcn `transition-[color,box-shadow]`); audit only the settled mode, never a
  // mid-transition frame that is part-way between the light and dark foregrounds.
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
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

test("vertical Field label-to-control spacing defaults to gap-2 while horizontal, responsive, and group spacing stay unchanged (WSSP-09)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("spacing"))
      await setColorMode(page, mode)
      await expect(page.getByRole("textbox", { name: "Display name" })).toBeVisible()
      const gaps = await page.evaluate(() => {
        const read = (selector: string) => getComputedStyle(document.querySelector(selector)!)
        const spacing = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--space-base")) * parseFloat(getComputedStyle(document.documentElement).fontSize) * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--density"))
        return {
          spacing,
          vertical: parseFloat(read('[data-testid="field-vertical"]').rowGap),
          horizontal: parseFloat(read('[data-testid="field-horizontal"]').columnGap),
          responsive: parseFloat(read('[data-testid="field-responsive"]').rowGap),
          group: parseFloat(read('[data-slot="field-group"]').rowGap),
        }
      })
      expect(gaps.spacing).toBeGreaterThan(0)
      expect(gaps.vertical).toBeCloseTo(gaps.spacing * 2, 1)
      expect(gaps.horizontal).toBeCloseTo(gaps.spacing * 3, 1)
      expect(gaps.responsive).toBeCloseTo(gaps.spacing * 3, 1)
      expect(gaps.group).toBeCloseTo(gaps.spacing * 7, 1)
      // The label sits exactly one gap-2 above its control.
      const label = (await page.getByText("Display name", { exact: true }).boundingBox())!
      const input = (await page.getByLabel("Display name").boundingBox())!
      expect(input.y - (label.y + label.height)).toBeCloseTo(gaps.spacing * 2, 0)
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
