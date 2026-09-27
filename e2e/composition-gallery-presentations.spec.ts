import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

/**
 * workbench-cards-gallery-curation-v1-001 (CGCR-04): each interactive survivor keeps its fuller standalone story, while
 * its thin `Gallery` story (the `stable` presentation the Workbench gallery uses) responds without changing the card's
 * height. Runs against the static Storybook build at 390x844 and 1440x900.
 */

const story = (component: string, name: string) => `/iframe.html?id=composition-${component}--${name}&viewMode=story`
const cardHeight = (page: Page) => page.locator('[data-slot="card"]').first().evaluate(el => el.getBoundingClientRect().height)

type Case = { component: string; act: (page: Page) => Promise<void>; full: (page: Page) => Promise<void> }

const CASES: Case[] = [
  {
    component: "plan-usage",
    act: page => page.getByRole("button", { name: "Upgrade" }).click(),
    full: page => expect(page.getByRole("status")).toBeVisible(),
  },
  {
    component: "quick-find",
    act: async page => { await page.getByRole("searchbox", { name: "Search commands" }).fill("zzz") },
    full: page => expect(page.getByText("No matches for “zzz”.")).toBeVisible(),
  },
  {
    component: "upcoming-schedule",
    act: async page => {
      await page.getByRole("button", { name: /^Saturday, October 19/ }).click()
      const add = page.getByRole("button", { name: "Add focus block" })
      if (await add.count()) await add.click()
    },
    full: page => expect(page.getByText("Focus block", { exact: true })).toBeVisible(),
  },
  {
    component: "launch-board",
    act: async page => {
      const move = page.getByRole("button", { name: "Move “Audit dark-mode contrast” to Done" })
      if (await move.count()) await move.click()
    },
    full: page => expect(page.getByRole("progressbar", { name: "Launch progress" })).toHaveAttribute("aria-valuenow", "4"),
  },
  {
    component: "support-request",
    act: async page => {
      await page.getByLabel("Message").fill("")
      await page.getByRole("button", { name: /^Send/ }).click()
    },
    full: page => expect(page.getByRole("alert")).toBeVisible(),
  },
]

for (const { component, act, full } of CASES) {
  test(`${component}: the standalone story keeps its full behaviour; the Gallery story keeps its height`, async ({ page }, info) => {
    await page.goto(story(component, component === "support-request" ? "quiet-workspace" : "default"))
    await expect(page.locator('[data-slot="card"]').first()).toBeVisible()
    await act(page)
    await full(page)

    await page.goto(story(component, "gallery"))
    await expect(page.locator('[data-slot="card"]').first()).toBeVisible()
    const before = await cardHeight(page)
    await act(page)
    expect(Math.abs((await cardHeight(page)) - before), component).toBeLessThanOrEqual(0.5)
    for (const mode of ["light", "dark"] as const) {
      await page.locator("html").evaluate((el, dark) => el.classList.toggle("dark", dark), mode === "dark")
      await page.waitForTimeout(150)
      const { violations } = await new AxeBuilder({ page }).analyze()
      const serious = violations.filter(v => v.impact === "critical" || v.impact === "serious")
      await info.attach(`axe-${component}-gallery-${mode}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
      expect(serious, mode).toEqual([])
    }
  })
}
