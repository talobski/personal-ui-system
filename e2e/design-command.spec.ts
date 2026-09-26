import { stageCommand } from "./design-command-fixture"
import { workspaceMode, editorCategory, previewStates, assertActiveControls } from "./workbench-navigation"
import AxeBuilder from "@axe-core/playwright"
import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

async function openWorkbench(page: Page) {
  await page.goto("/")
  await previewStates(page)
  await editorCategory(page, "Command")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function settleVisuals(page: Page) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
}

async function expectNoSeriousViolations(page: Page, label: string, testInfo: TestInfo) {
  await settleVisuals(page)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = await seriousOutsideKnownDebt(page, violations, testInfo, `design-command-${label}`)
  await testInfo.attach(`axe-design-command-${label}.json`, { body: JSON.stringify(violations, null, 2), contentType: "application/json" })
  expect(serious, JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]))).toEqual([])
}

test("the Design command panel is present with an accessible, keyboard-operable Evaluate control", async ({ page }, testInfo) => {
  await openWorkbench(page)

  await expect(page.getByRole("tabpanel", { name: "Command", exact: true })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Design command" })).toHaveCount(0)

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
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "1")

  await expectNoSeriousViolations(page, "rejected", testInfo)
})

test("Evaluate is disabled while a proposal is staged", async ({ page }) => {
  await openWorkbench(page)
  await editorCategory(page, "Command")
  await stageCommand(page, [{ op: "setRadius", value: "1rem" }])
  await workspaceMode(page, "Preview")
  await expect(page.getByTestId("proposal-staged")).toBeVisible()
  await editorCategory(page, "Command")
  await expect(page.getByTestId("design-command-evaluate")).toBeDisabled()
})

test("locks every mutating/load/save/export control while a Design command evaluation is pending, and renders full typed evidence including probabilities on a staged outcome", async ({
  page,
}) => {
  await openWorkbench(page)

  let releasePendingResponse: (() => void) | undefined
  const pending = new Promise<void>((resolve) => {
    releasePendingResponse = resolve
  })
  // Intercept the browser -> localhost product API call at the network layer, regardless of whether a real
  // backend route exists for it, so the pending/lock and evidence-rendering behavior is provable without any
  // credential or live Jev call.
  await page.route("**/api/design-command/evaluate", async (route) => {
    await pending
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        outcome: {
          kind: "staged",
          operations: [{ op: "setRadius", value: "0.75rem" }],
          evidence: {
            questionCatalogVersion: "design-command-questions/1",
            recipeCatalogVersion: "design-command-recipes/2",
            commandKindSelected: "themeAdjustment",
            commandKindConfidence: 0.92,
            commandKindProbabilities: { themeAdjustment: 0.92, outOfScope: 0.08 },
            categories: [
              { category: "color", selected: "notTargeted", targeted: false, direction: null, confidence: 0.9, probabilities: { warmer: 0.05, cooler: 0.05, notTargeted: 0.9 } },
              { category: "radius", selected: "rounder", targeted: true, direction: "positive", confidence: 0.88, probabilities: { rounder: 0.88, sharper: 0.02, notTargeted: 0.1 } },
              { category: "density", selected: "notTargeted", targeted: false, direction: null, confidence: 0.9, probabilities: { looser: 0.05, denser: 0.05, notTargeted: 0.9 } },
              { category: "typography", selected: "notTargeted", targeted: false, direction: null, confidence: 0.9, probabilities: { editorial: 0.05, neutral: 0.05, notTargeted: 0.9 } },
              { category: "shadow", selected: "notTargeted", targeted: false, direction: null, confidence: 0.9, probabilities: { stronger: 0.05, softer: 0.05, notTargeted: 0.9 } },
              { category: "motion", selected: "notTargeted", targeted: false, direction: null, confidence: 0.9, probabilities: { faster: 0.05, slower: 0.05, notTargeted: 0.9 } },
            ],
            strengthLabel: "moderate",
            strengthScore: 1.1,
            strengthConfidence: 0.85,
            strengthProbabilities: { "0": 0.1, "1": 0.8, "2": 0.1 },
            strengthLegend: { "0": "subtle", "1": "moderate", "2": "strong" },
            needsClarificationValue: 0.05,
            needsClarificationDecided: true,
          },
        },
      }),
    })
  })

  await page.getByTestId("design-command-input").click()
  await page.keyboard.type("make the corners rounder")
  await page.getByTestId("design-command-evaluate").click()
  await expect(page.getByTestId("design-command-pending")).toBeVisible()

  await assertActiveControls(page, true)
  await expect(page.getByTestId("design-command-input")).toBeDisabled()
  await expect(page.getByRole("button", { name: "Stage proposal" })).toHaveCount(0)

  releasePendingResponse?.()

  await expect(page.getByTestId("design-command-pending")).toHaveCount(0)
  await expect(page.getByTestId("design-command-outcome")).toHaveAttribute("data-outcome-kind", "staged")
  await workspaceMode(page, "Preview")
  await expect(page.getByTestId("proposal-staged")).toBeVisible()
  // The theme was mutated exactly once, through the normal proposal lifecycle: nothing staged twice or silently.
  await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("2")

  const evidence = page.getByTestId("design-command-evidence")
  await editorCategory(page, "Command")
  await evidence.locator("summary").click()
  await expect(page.getByTestId("design-command-evidence-command-kind")).toContainText("themeAdjustment 0.92")
  await expect(page.getByTestId("design-command-evidence-radius")).toContainText("rounder 0.88")
  await expect(page.getByTestId("design-command-evidence-strength")).toContainText("moderate 0.80")
})
