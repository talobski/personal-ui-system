import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const colorModes = ["light", "dark"] as const

async function setColorMode(page: Page, mode: (typeof colorModes)[number]) {
  await page.locator("html").evaluate((element, nextMode) => element.classList.toggle("dark", nextMode === "dark"), mode)
  await page.waitForTimeout(250)
}

async function assertNoSeriousOrCritical(page: Page, testInfo: TestInfo, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")
  await testInfo.attach(`axe-critical-serious-${label}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious).toEqual([])
}

/** Resolves a semantic token to a computed colour in the current mode. */
const token = (page: Page, name: string, property: "color" | "backgroundColor" = "backgroundColor") =>
  page.evaluate(([name, property]) => {
    const probe = document.createElement("span")
    document.body.append(probe)
    probe.style[property as "color"] = `var(--${name})`
    const value = getComputedStyle(probe)[property as "color"]
    probe.remove()
    return value
  }, [name, property] as const)

test("Message and Bubble render a named, aligned thread on semantic tokens (WSCG-06)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await page.goto(story("pilot-message--default"))
    await setColorMode(page, mode)
    const log = page.getByRole("log", { name: "Conversation" })
    await expect(log).toBeVisible()
    const rows = log.locator('[data-slot="message"]')
    await expect(rows).toHaveCount(2)
    await expect(rows.nth(0)).toHaveAttribute("data-align", "start")
    await expect(rows.nth(1)).toHaveAttribute("data-align", "end")
    const [start, end] = await rows.evaluateAll(nodes => nodes.map(node => node.querySelector('[data-slot="bubble"]')!.getBoundingClientRect()))
    expect(end!.right).toBeGreaterThan(start!.right)
    expect(await rows.nth(1).locator('[data-slot="bubble"]').evaluate(el => getComputedStyle(el).backgroundColor)).toBe(await token(page, "primary"))
    expect(await rows.nth(0).locator('[data-slot="bubble"]').first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe(await token(page, "muted"))
    await assertNoSeriousOrCritical(page, testInfo, `message-${mode}`)

    await page.goto(story("pilot-bubble--default"))
    await setColorMode(page, mode)
    const bubbles = page.locator('[data-slot="bubble"]')
    await expect(bubbles).toHaveCount(5)
    const group = await page.locator('[data-slot="bubble-group"]').evaluate(el => el.getBoundingClientRect().width)
    for (const width of await bubbles.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().width))) expect(width).toBeLessThanOrEqual(group + 0.5)
    await assertNoSeriousOrCritical(page, testInfo, `bubble-${mode}`)
  }
})

test("Calendar range shows start, middle and end and moves focus by keyboard (WSCG-09)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await page.goto(story("pilot-calendar--range-story"))
    await setColorMode(page, mode)
    const calendar = page.locator('[data-slot="calendar"]')
    await expect(calendar.getByRole("grid")).toHaveCount(1)
    await expect(calendar.getByText("October 2026")).toBeVisible()
    await expect(calendar.locator('[data-range-start="true"]')).toHaveCount(1)
    await expect(calendar.locator('[data-range-end="true"]')).toHaveCount(1)
    await expect(calendar.locator('[data-range-middle="true"]')).toHaveCount(3)
    expect(await calendar.locator('[data-range-start="true"]').evaluate(el => getComputedStyle(el).backgroundColor)).toBe(await token(page, "primary"))
    expect(await calendar.locator('[data-range-middle="true"]').first().evaluate(el => getComputedStyle(el).backgroundColor)).toBe(await token(page, "accent"))
    const before = await calendar.boundingBox()
    await calendar.locator('[data-range-start="true"]').focus()
    await page.keyboard.press("ArrowRight")
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest("[data-day]") !== null || document.activeElement?.hasAttribute("data-day"))).toBe(true)
    await page.getByRole("button", { name: /next month/i }).click()
    await expect(calendar.getByText("November 2026")).toBeVisible()
    const after = await calendar.boundingBox()
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1)
    await assertNoSeriousOrCritical(page, testInfo, `calendar-${mode}`)
  }
})

test("Table keeps native semantics, header cells and contained overflow (WSCG-07)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await page.goto(story("pilot-table--default"))
    await setColorMode(page, mode)
    const table = page.getByRole("table", { name: "Recent invoices." })
    await expect(table).toBeVisible()
    await expect(table.getByRole("columnheader")).toHaveText(["Invoice", "Status", "Method", "Amount"])
    await expect(table.getByRole("row")).toHaveCount(5)
    expect(await page.locator('[data-slot="table-container"]').evaluate(el => getComputedStyle(el).overflowX)).toBe("auto")
    await assertNoSeriousOrCritical(page, testInfo, `table-${mode}`)
  }
})
