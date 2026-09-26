import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"
import { editorCategory } from "./workbench-navigation"

/** Offline response fixture: exercises the real client and proposal gate without a provider or credential. */
export async function prepareCommand(page: Page, operations: readonly unknown[]) {
  await page.route("**/api/design-command/evaluate", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ outcome: { kind: "staged", operations, evidence: {
      questionCatalogVersion: "design-command-questions/1", recipeCatalogVersion: "design-command-recipes/2",
      commandKindSelected: "themeAdjustment", commandKindConfidence: 0.92,
      commandKindProbabilities: { themeAdjustment: 0.92, outOfScope: 0.08 }, categories: [],
      strengthLabel: "moderate", strengthScore: 1, strengthConfidence: 0.9,
      strengthProbabilities: { "0": 0.05, "1": 0.9, "2": 0.05 },
      strengthLegend: { "0": "subtle", "1": "moderate", "2": "strong" },
      needsClarificationValue: 0.05, needsClarificationDecided: true,
    } } }),
  }), { times: 1 })
  await editorCategory(page, "Command")
  await page.getByRole("textbox", { name: "Command", exact: true }).fill("Make the theme calmer and rounder")
}

export async function stageCommand(page: Page, operations: readonly unknown[], key?: "Enter" | "Space") {
  await prepareCommand(page, operations)
  const evaluate = page.getByRole("button", { name: "Evaluate", exact: true })
  if (key) {
    await page.getByRole("textbox", { name: "Command", exact: true }).focus()
    await page.keyboard.press("Tab")
    await expect(evaluate).toBeFocused()
    await page.keyboard.press(key)
  } else await evaluate.click()
  await expect(page.getByTestId("design-command-outcome")).toBeVisible()
}
