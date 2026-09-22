import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

async function openWorkbench(page: Page) {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function settleVisuals(page: Page) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
}

async function expectNoSeriousViolations(page: Page, label: string, testInfo: TestInfo) {
  await settleVisuals(page)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((v) => v.impact === "critical" || v.impact === "serious")
  await testInfo.attach(`axe-design-command-${label}.json`, { body: JSON.stringify(violations, null, 2), contentType: "application/json" })
  expect(serious, JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]))).toEqual([])
}

test("the Design command panel is present with an accessible, keyboard-operable Evaluate control", async ({ page }, testInfo) => {
  await openWorkbench(page)

  const heading = page.getByRole("heading", { name: "Design command" })
  await expect(heading).toBeVisible()

  const input = page.getByTestId("design-command-input")
  const evaluate = page.getByTestId("design-command-evaluate")
  await expect(evaluate).toBeDisabled() // empty command text

  await input.click()
  await page.keyboard.type("make it denser and warmer")
  await expect(evaluate).toBeEnabled()

  await expectNoSeriousViolations(page, "idle", testInfo)

  // Keyboard-only activation: Tab from the textarea reaches Evaluate, Enter/Space activates it.
  await input.focus()
  await page.keyboard.press("Tab")
  await expect(evaluate).toBeFocused()
  await page.keyboard.press("Enter")

  // No admissible product credential exists in this test environment (no TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY is
  // set), so the one Jev request this click would trigger fails closed before or at the localhost product API.
  // Whether that boundary is the real dev middleware (missing-credential) or, under `vite preview`'s static
  // server, an HTTP-level client error, the panel must render a stable rejected outcome and stage nothing.
  const outcome = page.getByTestId("design-command-outcome")
  await expect(outcome).toBeVisible()
  await expect(outcome).toHaveAttribute("data-outcome-kind", "rejected")
  await expect(page.getByTestId("design-command-rejected")).toBeVisible()

  // Fail-closed: no proposal was staged and the active theme did not change.
  await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
  await expect(page.getByTestId("theme-revision")).toHaveText("1")

  await expectNoSeriousViolations(page, "rejected", testInfo)
})

test("Evaluate is disabled while a proposal is staged", async ({ page }) => {
  await openWorkbench(page)
  await page.getByRole("button", { name: "Insert example" }).click()
  await page.getByRole("button", { name: "Stage proposal" }).click()
  await expect(page.getByTestId("proposal-staged")).toBeVisible()
  await expect(page.getByTestId("design-command-evaluate")).toBeDisabled()
})
