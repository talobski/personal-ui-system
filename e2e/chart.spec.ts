import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const chartStory = "/iframe.html?id=pilot-chart--default&viewMode=story"
const weekStory = "/iframe.html?id=composition-productive-week--default&viewMode=story"
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

test("Chart renders themed series with a text summary and a keyboard-reachable accessibility layer", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(chartStory)
      await setColorMode(page, mode)
      const chart = page.locator('[data-slot="chart"]')
      await expect(chart.locator(".recharts-bar-rectangle")).toHaveCount(8)
      await expect(page.locator("figcaption")).toContainText("Focus and meeting hours")
      const fills = await chart.locator(".recharts-bar-rectangle path").evaluateAll((paths) => paths.map((p) => p.getAttribute("fill")))
      expect(new Set(fills)).toEqual(new Set(["var(--color-focus)", "var(--color-meetings)"]))
      // ChartConfig maps each series to a theme chart token: the resolved series colour is the token's colour.
      const resolved = await chart.evaluate((el) => {
        const probe = (value: string) => {
          const node = document.createElement("span")
          node.style.color = value
          el.appendChild(node)
          const color = getComputedStyle(node).color
          node.remove()
          return color
        }
        return [probe("var(--color-focus)"), probe("var(--chart-1)"), probe("var(--color-meetings)"), probe("var(--chart-2)")]
      })
      expect(resolved[0]).toBe(resolved[1])
      expect(resolved[2]).toBe(resolved[3])
      expect(resolved[0]).not.toBe(resolved[2])
      await expect(chart.getByText("Focus hours")).toBeVisible()

      const surface = chart.locator(".recharts-wrapper [tabindex='0'], svg.recharts-surface[tabindex='0']").first()
      await page.keyboard.press("Tab")
      await expect(surface).toBeFocused()
      await page.keyboard.press("ArrowRight")
      await expect(chart.locator(".recharts-tooltip-wrapper")).toContainText("Focus hours")
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-focused`)
    })
  }
})

test("Weekly steps (the repurposed Productive Week) keeps its data and summary on the Chart resource with theme chart tokens (PUI-89)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(weekStory)
      await setColorMode(page, mode)
      const figure = page.getByTestId("productive-week-chart")
      await expect(figure.locator("figcaption")).toHaveText("Daily steps Monday through Sunday: 7,820, 9,140, 8,310, 10,260, 9,480, 6,150, 7,340. Average 8,357.")
      await expect(page.getByText("8,357", { exact: true })).toHaveClass(/(?:^| )type-heading(?: |$)/)
      await expect(page.getByText("Average steps this week", { exact: true })).toBeVisible()
      await expect(page.getByText("+12.4% vs last week")).toBeVisible()
      await expect(page.getByText(/tasks completed|A productive week/)).toHaveCount(0)
      await expect(figure.locator('[data-slot="chart"]')).toHaveCount(1)
      const bars = figure.locator(".recharts-bar-rectangle path")
      await expect(bars).toHaveCount(7)
      expect(await bars.evaluateAll((paths) => paths.map((p) => p.getAttribute("fill")))).toEqual(["var(--chart-3)", "var(--chart-3)", "var(--chart-3)", "var(--chart-2)", "var(--chart-3)", "var(--chart-3)", "var(--chart-3)"])
      const heights = await bars.evaluateAll((paths) => paths.map((p) => Math.round(p.getBoundingClientRect().height)))
      // Heights follow the data: Thursday is tallest, Saturday shortest.
      expect(heights[3]).toBe(Math.max(...heights))
      expect(heights[5]).toBe(Math.min(...heights))
      // PUI-103: no weekday label row; the hidden day scale still names each bar's day in the keyboard tooltip.
      await expect(figure.locator(".recharts-xAxis, .recharts-cartesian-axis-tick-value")).toHaveCount(0)
      await page.keyboard.press("Tab")
      await page.keyboard.press("ArrowRight")
      await expect(figure.locator(".recharts-tooltip-wrapper")).toContainText("Steps")
      await expect(figure.locator(".recharts-tooltip-wrapper")).toContainText(/(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day/)
      await assertNoSeriousOrCritical(page, testInfo, `${mode}-weekly-steps`)
    })
  }
})

test("Chart fills a narrow viewport without overflow and renders with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto(chartStory)
  const chart = page.locator('[data-slot="chart"]')
  await expect(chart.locator(".recharts-bar-rectangle")).toHaveCount(8)
  const box = (await chart.boundingBox())!
  expect(box.width).toBeGreaterThan(200)
  expect(box.height).toBeGreaterThan(100)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
