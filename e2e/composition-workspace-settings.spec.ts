import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const STORY_URL = "/iframe.html?id=composition-workspace-settings--default&viewMode=story"
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

test("Workspace settings composes Tabs, Card, Field controls, Switch, and SingleToggleGroup for a bounded choice", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(STORY_URL)
      await setColorMode(page, mode)

      const generalTab = page.getByRole("tab", { name: "General" })
      const notificationsTab = page.getByRole("tab", { name: "Notifications" })
      const appearanceTab = page.getByRole("tab", { name: "Appearance" })
      await expect(generalTab).toHaveAttribute("aria-selected", "true")
      await expect(page.getByLabel("Workspace name")).toHaveValue("Personal UI System")

      // TabsList is a single non-wrapping row: at the narrowest supported viewport it must still stay within the
      // viewport's width rather than overflowing, since this small, short-labelled tab set is the documented limit.
      const tablistBox = await page.getByRole("tablist").boundingBox()
      expect(tablistBox).not.toBeNull()
      expect(tablistBox!.x + tablistBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width)

      await generalTab.focus()
      await page.keyboard.press("ArrowRight")
      await expect(notificationsTab).toBeFocused()
      await expect(notificationsTab).toHaveAttribute("aria-selected", "true")
      const digest = page.getByRole("switch", { name: "Weekly digest" })
      await expect(digest).toBeChecked()

      await page.keyboard.press("ArrowRight")
      await expect(appearanceTab).toBeFocused()
      await expect(appearanceTab).toHaveAttribute("aria-selected", "true")

      const group = page.getByRole("radiogroup", { name: "Density" })
      await expect(group).toBeVisible()
      const comfortable = page.getByRole("radio", { name: "Comfortable" })
      const compact = page.getByRole("radio", { name: "Compact" })
      await expect(comfortable).toHaveAttribute("data-state", "on")
      await comfortable.focus()
      await page.keyboard.press("ArrowRight")
      await expect(compact).toBeFocused()
      await compact.press(" ")
      await expect(compact).toHaveAttribute("data-state", "on")
      await expect(comfortable).toHaveAttribute("data-state", "off")

      await assertNoHorizontalOverflow(page)
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
