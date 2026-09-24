import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-combobox--${name}&viewMode=story`
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

test("Combobox is labelled, filters by typing, navigates with arrows, selects, and dismisses", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("default"))
      await setColorMode(page, mode)
      const trigger = page.getByRole("combobox", { name: "Sans font", exact: true })
      await expect(trigger).toHaveText("Inter")
      await page.keyboard.press("Tab")
      await expect(trigger).toBeFocused()
      await expect.poll(() => trigger.evaluate((el) => getComputedStyle(el).boxShadow)).toContain("0px 0px 0px 3px")
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-closed`)

      await trigger.press("Enter")
      const input = page.getByRole("combobox", { name: "Search Sans font", exact: true })
      await input.fill("sans")
      const listbox = page.getByRole("listbox")
      await expect(listbox).toBeVisible()
      await expect(input).toHaveAttribute("aria-expanded", "true")
      await expect(page.getByRole("option")).toHaveText(["Open Sans", "DM Sans", "Work Sans"])
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-open`)
      await page.keyboard.press("ArrowDown")
      await page.keyboard.press("ArrowDown")
      await expect(page.getByRole("option", { name: "DM Sans" })).toHaveAttribute("data-highlighted", "")
      await page.keyboard.press("Enter")
      await expect(listbox).toBeHidden()
      await expect(trigger).toHaveText("DM Sans")
      await expect(trigger).toBeFocused()
      await expect(page.getByTestId("combobox-value")).toHaveText("Selected: DM Sans")

      await trigger.press("Enter")
      const nextInput = page.getByRole("combobox", { name: "Search Sans font", exact: true })
      await nextInput.fill("zzz")
      await expect(page.getByText("No fonts found.")).toBeVisible()
      await expect(page.getByRole("option")).toHaveCount(0)
      await nextInput.press("Escape")
      await expect(page.getByRole("listbox")).toBeHidden()
      await expect(trigger).toBeFocused()
      // Typed text alone never becomes the value.
      await expect(page.getByTestId("combobox-value")).toHaveText("Selected: DM Sans")
    })
  }
})

test("Combobox selects with the pointer and fits a narrow viewport", async ({ page }) => {
  await page.goto(story("default"))
  const trigger = page.getByRole("combobox", { name: "Sans font", exact: true })
  await trigger.click()
  const listbox = page.getByRole("listbox")
  await expect(listbox).toBeVisible()
  await expect(page.getByRole("option")).toHaveCount(8)
  await expect(page.getByRole("option", { name: "Inter" })).toHaveAttribute("aria-selected", "true")
  const box = (await listbox.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  await page.getByRole("option", { name: "Montserrat" }).click()
  await expect(trigger).toHaveText("Montserrat")
  await expect(page.getByTestId("combobox-value")).toHaveText("Selected: Montserrat")
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test("disabled Combobox ignores keyboard and pointer input", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("disabled"))
      await setColorMode(page, mode)
      const trigger = page.getByRole("combobox", { name: "Sans font", exact: true })
      await expect(trigger).toBeDisabled()
      await page.keyboard.press("Tab")
      await expect(trigger).not.toBeFocused()
      await trigger.click({ force: true })
      await expect(page.getByRole("listbox")).toHaveCount(0)
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-disabled`)
    })
  }
})

test("Combobox stays operable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(story("default"))
  const trigger = page.getByRole("combobox", { name: "Sans font", exact: true })
  await trigger.click()
  const input = page.getByRole("combobox", { name: "Search Sans font", exact: true })
  await input.fill("rob")
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(trigger).toHaveText("Roboto")
})
