import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

for (const story of ["default", "horizontal", "both"]) test(`ScrollArea ${story}: bounded native viewport, focus and axe`, async ({ page }, info) => {
  await page.goto(`/iframe.html?id=pilot-scroll-area--${story}&viewMode=story`)
  const viewport = page.getByRole("region", { name: "Activity" })
  await expect(viewport).toBeVisible()
  const before = await viewport.evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }))
  expect(before).toEqual({ width: 286, height: 254 })
  await viewport.focus()
  await expect(viewport).toBeFocused()
  if (story !== "horizontal") {
    await viewport.press("PageDown")
    await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  } else {
    await viewport.press("ArrowRight")
    await expect.poll(() => viewport.evaluate(el => el.scrollLeft)).toBeGreaterThan(0)
  }
  expect(await viewport.evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }))).toEqual(before)
  const result = await new AxeBuilder({ page }).analyze()
  expect(result.violations.filter(v => v.impact === "serious" || v.impact === "critical")).toEqual([])
  await info.attach("axe-scroll-area.json", { body: JSON.stringify(result), contentType: "application/json" })
})
