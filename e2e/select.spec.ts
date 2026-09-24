import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-select--${name}&viewMode=story`
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

test("Select is labelled, opens and selects with the keyboard, groups options, and returns focus", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("default"))
      await setColorMode(page, mode)
      const trigger = page.getByRole("combobox", { name: "Theme" })
      await expect(trigger).toHaveText("Default")
      await page.keyboard.press("Tab")
      await expect(trigger).toBeFocused()
      expect(await trigger.evaluate((el) => el.matches(":focus-visible"))).toBe(true)
      expect(await trigger.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none")
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-closed`)

      await page.keyboard.press("Enter")
      const listbox = page.getByRole("listbox")
      await expect(listbox).toBeVisible()
      // While open, Radix hides everything outside the listbox from the accessibility tree.
      await expect(page.locator("#theme-select")).toHaveAttribute("aria-expanded", "true")
      await expect(page.getByRole("option", { name: "Default" })).toBeFocused()
      await expect(page.getByRole("group", { name: "Built-in" }).getByRole("option")).toHaveText(["Default", "Quiet Editorial"])
      await expect(page.getByRole("group", { name: "Custom" }).getByRole("option")).toHaveText(["Studio", "Archive"])
      await expect(page.getByRole("option", { name: "Default" })).toHaveAttribute("aria-selected", "true")
      await expect(page.getByRole("option", { name: "Archive" })).toHaveAttribute("aria-disabled", "true")
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-open`)

      await page.keyboard.press("ArrowDown")
      await expect(page.getByRole("option", { name: "Quiet Editorial" })).toBeFocused()
      await page.keyboard.press("ArrowDown")
      await page.keyboard.press("ArrowDown")
      // A disabled option may be reached but never selected.
      await expect(page.getByRole("option", { name: "Archive" })).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(listbox).toBeVisible()
      await expect(page.getByTestId("select-value")).toHaveText("Selected: default")
      await page.keyboard.press("ArrowUp")
      await expect(page.getByRole("option", { name: "Studio" })).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(listbox).toBeHidden()
      await expect(trigger).toHaveText("Studio")
      await expect(trigger).toBeFocused()
      await expect(page.getByTestId("select-value")).toHaveText("Selected: studio")

      await page.keyboard.press("Enter")
      await expect(listbox).toBeVisible()
      await page.keyboard.press("Escape")
      await expect(listbox).toBeHidden()
      await expect(trigger).toBeFocused()
      await expect(trigger).toHaveText("Studio")
    })
  }
})

test("Select selects with the pointer and fits a narrow viewport", async ({ page }) => {
  await page.goto(story("default"))
  const trigger = page.getByRole("combobox", { name: "Theme" })
  await trigger.click()
  await page.getByRole("option", { name: "Quiet Editorial" }).click()
  await expect(trigger).toHaveText("Quiet Editorial")
  await expect(page.getByTestId("select-value")).toHaveText("Selected: quiet-editorial")
  await trigger.click()
  await page.getByRole("option", { name: "Archive" }).click({ force: true })
  await expect(trigger).toHaveText("Quiet Editorial")
  const listbox = page.getByRole("listbox")
  const box = (await listbox.boundingBox())!
  const viewport = page.viewportSize()!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test("disabled Select ignores keyboard and pointer input", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("disabled"))
      await setColorMode(page, mode)
      const trigger = page.getByRole("combobox", { name: "Theme" })
      await expect(trigger).toBeDisabled()
      await page.keyboard.press("Tab")
      await expect(trigger).not.toBeFocused()
      await trigger.click({ force: true })
      await expect(page.getByRole("listbox")).toHaveCount(0)
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-disabled`)
    })
  }
})

test("Select stays operable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(story("default"))
  const trigger = page.getByRole("combobox", { name: "Theme" })
  await trigger.focus()
  await page.keyboard.press("ArrowDown")
  await expect(page.getByRole("listbox")).toBeVisible()
  await expect(page.getByRole("option", { name: "Default" })).toBeFocused()
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(trigger).toHaveText("Quiet Editorial")
})
