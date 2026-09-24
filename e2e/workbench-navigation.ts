import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"

export async function workspaceMode(page: Page, mode: "Controls" | "Preview") {
  if ((page.viewportSize()?.width ?? 1440) < 1024) await page.getByRole("tab", { name: mode, exact: true }).click()
}
export async function editorCategory(page: Page, category: "Colors" | "Typography" | "Other" | "Command") {
  await workspaceMode(page, "Controls")
  await page.getByRole("tab", { name: category, exact: true }).click()
}
export async function previewStates(page: Page) {
  await workspaceMode(page, "Preview")
  await page.frameLocator('[data-testid="preview-frame"]').getByRole("tab", { name: "States", exact: true }).click()
}
export async function openFork(page: Page) {
  if (await page.getByRole("dialog").isVisible()) return
  await workspaceMode(page, "Controls")
  await page.getByRole("button", { name: "Fork theme", exact: true }).click()
}

export async function showBaseline(page: Page) {
  await workspaceMode(page, "Controls")
  const details = page.locator("#baseline-details")
  if (await details.count() && !await details.evaluate(el => (el as HTMLDetailsElement).open)) await details.locator("summary").click()
}

/** Selects a theme through the Active theme select (a built-in id or a saved id). */
export async function selectTheme(page: Page, id: string) {
  await workspaceMode(page, "Controls")
  await page.getByLabel("Active theme").selectOption(id)
  await expect(page.getByTestId("theme-id")).toHaveText(id)
}

/** Check every active-state surface in its real navigation context, including the new modal gate. */
export async function assertActiveControls(page: Page, disabled: boolean) {
  const check = async (control: ReturnType<Page["getByLabel"]>) => disabled ? expect(control).toBeDisabled() : expect(control).toBeEnabled()
  await editorCategory(page, "Colors")
  for (const c of [page.getByLabel("Token"), page.getByLabel("Color value"), page.getByLabel("Active theme")]) await check(c)
  await editorCategory(page, "Typography")
  for (const c of [page.getByLabel("Sans font stack"), page.getByRole("textbox", { name: "Letter spacing" }), page.getByRole("slider", { name: "Letter spacing" })]) await check(c)
  await editorCategory(page, "Other")
  for (const c of [page.getByRole("textbox", { name: "Radius" }), page.getByRole("slider", { name: "Radius" }), page.getByLabel("Shadow color"), page.getByRole("slider", { name: "Shadow blur" })]) await check(c)
  // Active-versus-staged clarity: the manual panel says why its controls are paused.
  await expect(page.locator('[data-testid="manual-locked-note"]:visible')).toHaveCount(disabled ? 1 : 0)
  await check(page.getByRole("button", { name: "Fork theme", exact: true }))
  if (!disabled) {
    await openFork(page)
    await check(page.getByLabel("Fork id")); await check(page.getByLabel("Fork name"))
    await page.keyboard.press("Escape")
  }
  await workspaceMode(page, "Preview")
  await check(page.getByRole("button", { name: "Save theme" })); await check(page.getByRole("button", { name: "Export JSON" }))
  await editorCategory(page, "Command")
}
