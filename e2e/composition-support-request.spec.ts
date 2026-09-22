import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const story = (name: string) => `/iframe.html?id=composition-support-request--${name}&viewMode=story`
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

test("Support request composes Card, Field, Input, NativeSelect, Textarea, and Button", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("default"))
      await setColorMode(page, mode)

      await expect(page.getByText("Contact support")).toBeVisible()
      await expect(page.getByLabel("Topic")).toHaveValue("billing")
      const message = page.getByLabel("Message")
      await expect(message).toHaveValue("I was charged twice for last month's invoice.")
      await expect(page.getByRole("button", { name: "Send request" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Save draft" })).toBeVisible()

      await assertNoHorizontalOverflow(page)
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})

test("an invalid message is associated with its error message", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("invalid-message"))
      await setColorMode(page, mode)
      const message = page.getByLabel("Message")
      await expect(message).toHaveAttribute("aria-invalid", "true")
      await expect(message).toHaveAttribute("aria-describedby", "support-message-error")
      await expect(page.getByRole("alert")).toHaveText("Enter a message.")
      await assertNoSeriousOrCritical(page, testInfo, mode)
    })
  }
})
