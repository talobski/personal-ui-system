import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=pilot-slider--${name}&viewMode=story`
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

test("Slider is named on its thumb, steps with the keyboard, keeps visible focus, and exposes value text", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("default"))
      await setColorMode(page, mode)
      const thumb = page.getByRole("slider", { name: "Spacing base" })
      await expect(thumb).toHaveAttribute("aria-valuenow", "0.3")
      await expect(thumb).toHaveAttribute("aria-valuemin", "0.1")
      await expect(thumb).toHaveAttribute("aria-valuemax", "0.5")
      await expect(thumb).toHaveAttribute("aria-valuetext", "0.3 rem")
      await expect(page.getByTestId("slider-value")).toHaveText("0.3 rem")

      await page.keyboard.press("Tab")
      await expect(thumb).toBeFocused()
      expect(await thumb.evaluate((el) => el.matches(":focus-visible"))).toBe(true)
      expect(await thumb.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none")
      await page.keyboard.press("ArrowRight")
      await expect(thumb).toHaveAttribute("aria-valuenow", "0.305")
      await expect(page.getByTestId("slider-value")).toHaveText("0.305 rem")
      await page.keyboard.press("ArrowLeft")
      await page.keyboard.press("ArrowLeft")
      await expect(thumb).toHaveAttribute("aria-valuenow", "0.295")
      await page.keyboard.press("End")
      await expect(thumb).toHaveAttribute("aria-valuenow", "0.5")
      await page.keyboard.press("Home")
      await expect(thumb).toHaveAttribute("aria-valuenow", "0.1")
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-focused`)
    })
  }
})

test("Slider responds to pointer click and drag on the track", async ({ page }) => {
  await page.goto(story("default"))
  const track = page.locator('[data-slot="slider-track"]')
  const thumb = page.getByRole("slider", { name: "Spacing base" })
  const box = (await track.boundingBox())!
  expect(box.width).toBeGreaterThan(0)
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2)
  await expect.poll(async () => Number(await thumb.getAttribute("aria-valuenow"))).toBeCloseTo(0.4, 1)

  const thumbBox = (await thumb.boundingBox())!
  await page.mouse.move(thumbBox.x + thumbBox.width / 2, thumbBox.y + thumbBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 2, box.y + box.height / 2, { steps: 8 })
  await page.mouse.up()
  await expect.poll(async () => Number(await thumb.getAttribute("aria-valuenow"))).toBeLessThan(0.15)
  await expect(page.getByTestId("slider-value")).toHaveText(`${await thumb.getAttribute("aria-valuenow")} rem`)
})

test("Slider fits a 390px viewport without horizontal overflow and keeps a usable thumb", async ({ page }) => {
  await page.goto(story("default"))
  const thumb = page.getByRole("slider", { name: "Spacing base" })
  const thumbBox = (await thumb.boundingBox())!
  expect(thumbBox.width).toBeGreaterThanOrEqual(16)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test("disabled Slider ignores keyboard and pointer input and leaves the tab order", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("disabled"))
      await setColorMode(page, mode)
      const thumb = page.getByRole("slider", { name: "Spacing base" })
      await expect(thumb).toHaveAttribute("data-disabled", "")
      await expect(thumb).not.toHaveAttribute("tabindex", /.*/)
      await page.keyboard.press("Tab")
      await expect(thumb).not.toBeFocused()
      const box = (await page.locator('[data-slot="slider-track"]').boundingBox())!
      await page.mouse.click(box.x + box.width * 0.9, box.y + box.height / 2)
      await expect(thumb).toHaveAttribute("aria-valuenow", "0.3")
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-disabled`)
    })
  }
})

test("Slider stays operable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(story("default"))
  const thumb = page.getByRole("slider", { name: "Spacing base" })
  await thumb.focus()
  await page.keyboard.press("PageUp")
  await expect.poll(async () => Number(await thumb.getAttribute("aria-valuenow"))).toBeGreaterThan(0.3)
})
