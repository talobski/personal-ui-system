import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test("public panel separator uses library ARIA and keyboard bounds", async ({ page }, info) => {
  await page.goto("/iframe.html?id=components-resizable-panel--default&viewMode=story")
  const handle = page.getByRole("separator", { name: "Resize editor" })
  await handle.focus(); await expect(handle).toBeFocused()
  await expect(handle).toHaveAttribute("aria-valuenow", /\d+/)
  await page.keyboard.press("End")
  await expect(handle).toHaveAttribute("aria-valuenow", "50")
  await page.keyboard.press("Home")
  await expect(handle).toHaveAttribute("aria-valuenow", "25")
  await page.keyboard.press("ArrowRight")
  expect(Number(await handle.getAttribute("aria-valuenow"))).toBeGreaterThan(25)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const decoded = violations.filter(v => v.impact === "critical" || v.impact === "serious")
  await info.attach("axe-resizable.json", { body: JSON.stringify(decoded), contentType: "application/json" })
  expect(decoded).toEqual([])
})
