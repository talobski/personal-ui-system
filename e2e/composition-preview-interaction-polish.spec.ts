import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

/**
 * workbench-preview-interaction-polish-v1-001 Storybook definitions (Lead-executed under playwright.config.ts). The
 * stories render each composition alone in one document, so shell isolation here is same-document isolation: no iframe
 * boundary helps. WPIP-03 Chat, WPIP-04 Weather, WPIP-07 App shells, WPIP-08 Bitcoin ranges.
 */

const story = (id: string) => `/iframe.html?id=composition-${id}--default&viewMode=story`
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
  await testInfo.attach(`axe-critical-serious-wpip-${label}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious).toEqual([])
}

const states = (page: Page) => page.locator("[data-app-shell]").evaluateAll((nodes) => nodes.map((el) => el.getAttribute("data-shell-state")))

test("App shells collapse independently in one document; the shortcut moves only the focused shell (WPIP-07)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("app-shells"))
      await setColorMode(page, mode)
      await expect(page.locator("[data-app-shell]")).toHaveCount(3)
      expect(await states(page)).toEqual(["expanded", "expanded", "expanded"])
      await page.getByRole("button", { name: "Toggle Inset project sidebar", exact: true }).click()
      expect(await states(page)).toEqual(["expanded", "collapsed", "expanded"])
      const rail = page.locator('[data-shell-variant="inset"] [data-slot="sidebar"]')
      await expect.poll(async () => Math.round((await rail.boundingBox())!.width)).toBe(48)
      expect(await rail.evaluate((el) => getComputedStyle(el).position)).toBe("static")
      // Focus inside Classic: the shortcut toggles Classic only, and never reaches the document-wide listeners.
      await page.getByRole("navigation", { name: "Classic workspace navigation" }).getByRole("button", { name: "Inbox" }).focus()
      await page.keyboard.press("ControlOrMeta+b")
      expect(await states(page)).toEqual(["collapsed", "collapsed", "expanded"])
      // Focus outside every shell: the shortcut moves nothing.
      await page.locator("body").evaluate((body) => { const probe = document.createElement("button"); probe.id = "outside-probe"; probe.textContent = "outside"; body.prepend(probe) })
      await page.locator("#outside-probe").focus()
      await page.keyboard.press("ControlOrMeta+b")
      await page.waitForTimeout(250)
      expect(await states(page)).toEqual(["collapsed", "collapsed", "expanded"])
      await page.locator("#outside-probe").evaluate((el) => el.remove())
      const overflow = await page.locator("[data-app-shell]").evaluateAll((nodes) => nodes.filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.getAttribute("data-app-shell")))
      expect(overflow).toEqual([])
      await assertNoSeriousOrCritical(page, testInfo, `app-shells-${mode}`)
    })
  }
})

test("Bitcoin ranges swap static series and endpoint figures without a request (WPIP-08)", async ({ page }, testInfo) => {
  const external: string[] = []
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1") && !request.url().startsWith("data:")) external.push(request.url()) })
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("bitcoin-price"))
      await setColorMode(page, mode)
      const group = page.getByRole("radiogroup", { name: "Bitcoin range" })
      const dots = page.locator(".recharts-line-dots .recharts-dot")
      await expect(group.getByRole("radio", { name: "1Y" })).toBeChecked()
      await expect(dots).toHaveCount(13)
      await group.getByRole("radio", { name: "3Y" }).click()
      await expect(page.getByTestId("btc-change")).toHaveText("+433.99% over three years")
      await expect(dots).toHaveCount(13)
      await group.getByRole("radio", { name: "5Y" }).click()
      await expect(page.getByTestId("btc-change")).toHaveText("+205.67% over five years")
      await expect(dots).toHaveCount(21)
      await expect(page.getByTestId("btc-price")).toHaveText("$88,642.88")
      await expect(page.getByText(/Source|FRED|Coinbase/)).toHaveCount(0)
      await assertNoSeriousOrCritical(page, testInfo, `bitcoin-${mode}`)
    })
  }
  expect(external).toEqual([])
})

test("Chat shows aligned initials and an enabled send; Weather shows highs only (WPIP-03, WPIP-04)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("team-chat"))
      await setColorMode(page, mode)
      await expect(page.locator('[data-slot="message-avatar"]')).toHaveText(["M", "Y", "M", "Y"])
      await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeEnabled()
      await expect(page.getByRole("textbox", { name: "Message Maya Chen" })).toHaveAttribute("placeholder", "Type your message...")
      await assertNoSeriousOrCritical(page, testInfo, `chat-${mode}`)
      await page.goto(story("local-weather"))
      await setColorMode(page, mode)
      const days = page.getByRole("list", { name: "Five-day forecast" }).getByRole("listitem")
      await expect(days).toHaveCount(5)
      for (const day of await days.all()) await expect(day.locator("span:not(.sr-only)")).toHaveCount(2)
      await assertNoSeriousOrCritical(page, testInfo, `weather-${mode}`)
    })
  }
})
