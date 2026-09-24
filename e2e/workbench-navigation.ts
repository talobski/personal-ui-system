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
/** Sets the shell and preview colour mode through the toolbar Switch. */
export async function setColorMode(page: Page, mode: "light" | "dark") {
  await workspaceMode(page, "Preview")
  const toggle = page.getByRole("switch", { name: "Dark mode" })
  if ((await toggle.getAttribute("aria-checked")) !== String(mode === "dark")) await toggle.click()
  await expect(toggle).toHaveAttribute("aria-checked", String(mode === "dark"))
}

/** A colour row's canonical text input (labelled by its token name) in the grouped colour editor. */
export const colorInput = (page: Page, token: string) => page.getByRole("textbox", { name: token, exact: true })

/** Save from the toolbar; for a built-in this opens Save As, which is completed with `name` when given. */
export async function saveTheme(page: Page, name?: string) {
  await workspaceMode(page, "Preview")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  if (name === undefined) return
  const dialog = page.getByRole("dialog", { name: "Save as a custom theme" })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel("Theme name").fill(name)
  await dialog.getByRole("button", { name: "Save theme", exact: true }).click()
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
  for (const c of [colorInput(page, "primary"), page.getByLabel("primary picker", { exact: true }), colorInput(page, "chart-5"), page.getByLabel("Active theme")]) await check(c)
  await editorCategory(page, "Typography")
  for (const c of [page.getByLabel("Sans font stack"), page.getByRole("textbox", { name: "Letter spacing" }), page.getByRole("slider", { name: "Letter spacing" })]) await check(c)
  await editorCategory(page, "Other")
  for (const c of [page.getByRole("textbox", { name: "Radius" }), page.getByRole("slider", { name: "Radius" }), page.getByLabel("Shadow color"), page.getByRole("slider", { name: "Shadow blur" })]) await check(c)
  // Active-versus-staged clarity: the manual panel says why its controls are paused.
  await expect(page.locator('[data-testid="manual-locked-note"]:visible')).toHaveCount(disabled ? 1 : 0)
  await workspaceMode(page, "Preview")
  await check(page.getByRole("button", { name: "Save", exact: true })); await check(page.getByRole("button", { name: "Export JSON" }))
  // No Fork workflow remains anywhere in the Workbench.
  await expect(page.getByRole("button", { name: /fork/i })).toHaveCount(0)
  // The mode Switch is presentation-only and stays usable while locked.
  await expect(page.getByRole("switch", { name: "Dark mode" })).toBeEnabled()
  await editorCategory(page, "Command")
}
