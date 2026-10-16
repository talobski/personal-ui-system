import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"

/** Below 768px the official Sidebar is an off-canvas sheet; at and above it the sidebar is always beside the preview. */
export const isMobileShell = (page: Page) => (page.viewportSize()?.width ?? 1440) < 768

/** The mobile sidebar sheet (a modal Base UI dialog named by its screen-reader title). */
export const sidebarSheet = (page: Page) => page.getByRole("dialog", { name: "Sidebar", exact: true })

/** Waits until the mobile sheet is open and has finished sliding in, so geometry and anchored popups are final. */
export async function settledSheet(page: Page) {
  const sheet = sidebarSheet(page)
  await expect(sheet).toBeVisible()
  await expect.poll(() => sheet.evaluate(el => Math.round(el.getBoundingClientRect().left))).toBe(0)
  await expect(sheet).not.toHaveAttribute("data-starting-style")
}

/**
 * "Controls" opens the mobile off-canvas sidebar through its trigger; "Preview" dismisses it with Escape so the preview
 * is usable edge-to-edge. On desktop both surfaces are always visible, so this is a no-op.
 */
export async function workspaceMode(page: Page, mode: "Controls" | "Preview") {
  if (!isMobileShell(page)) return
  const sheet = sidebarSheet(page)
  if (mode === "Controls") {
    if (await sheet.isVisible()) return
    await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click()
    await settledSheet(page)
    return
  }
  // Escape first closes any open popup inside the sheet, then the sheet itself.
  for (let attempt = 0; attempt < 3 && (await sheet.isVisible()); attempt++) {
    await page.keyboard.press("Escape")
    await page.waitForTimeout(50)
  }
  await expect(sheet).toHaveCount(0)
}
export async function editorCategory(page: Page, category: "Colors" | "Typography" | "Geometry" | "Effects" | "Command") {
  await workspaceMode(page, "Controls")
  await page.getByRole("tab", { name: category, exact: true }).click()
}
/** Selects a preview view through the left-aligned Cards / Design system / App shells / States Tabs (PUI-70, PUI-101/102). */
export async function previewView(page: Page, view: "Cards" | "Design system" | "App shells" | "States") {
  await workspaceMode(page, "Preview")
  const tab = page.frameLocator('[data-testid="preview-frame"]').getByRole("tablist", { name: "Preview views" }).getByRole("tab", { name: view, exact: true })
  await tab.click()
  await expect(tab).toHaveAttribute("aria-selected", "true")
}
export const previewStates = (page: Page) => previewView(page, "States")
/** Sets the shell and preview colour mode through the toolbar Switch. */
export async function setColorMode(page: Page, mode: "light" | "dark") {
  await workspaceMode(page, "Preview")
  const toggle = page.getByRole("switch", { name: "Dark mode" })
  if ((await toggle.getAttribute("aria-checked")) !== String(mode === "dark")) await toggle.click()
  await expect(toggle).toHaveAttribute("aria-checked", String(mode === "dark"))
}

/** A colour row's canonical text input (labelled by its token name) in the grouped colour editor. */
/** A colour row's text input. Sidebar rows are named "Sidebar <short label>" (the prefix is screen-reader only). */
export const colorInput = (page: Page, token: string) => {
  const short = token === "sidebar" ? "background" : token.replace(/^sidebar-/, "")
  const label = short.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())
  return page.getByRole("textbox", { name: token.startsWith("sidebar") ? `Sidebar ${label}` : label, exact: true })
}

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

/**
 * PUI-134/PUI-138: Code opens the "Theme code" dialog, which never downloads. Opens it (by default by clicking the
 * toolbar Code action), copies the selected format (JSON unless `format` is chosen) with the code toolbar's Copy, then
 * closes it with Escape. Returns the exact clipboard text and the format's canonical file name (`data-filename`).
 */
export async function copyThemeCode(page: Page, { open, format }: { open?: () => Promise<unknown>; format?: "JSON" | "CSS / Tailwind v4" | "Agent Prompt" } = {}) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"])
  await (open ? open() : page.getByTestId("workbench-toolbar").getByRole("button", { name: "Code", exact: true }).click())
  const dialog = page.getByRole("dialog", { name: "Theme code", exact: true })
  await expect(dialog).toBeVisible()
  if (format) await dialog.getByRole("tab", { name: format, exact: true }).click()
  const preview = dialog.getByTestId("export-preview")
  const filename = (await preview.getAttribute("data-filename"))!
  const shown = await preview.evaluate(el => el.textContent!)
  await dialog.getByRole("button", { name: "Copy", exact: true }).click()
  await expect(dialog.getByTestId("export-copy-status")).toHaveText("Copied to clipboard.")
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe(shown)
  await page.keyboard.press("Escape")
  await expect(dialog).toHaveCount(0)
  return { filename, text }
}

/** Selects a theme through the Active theme select (a built-in id or a saved id). */
export async function selectTheme(page: Page, id: string) {
  await workspaceMode(page, "Controls")
  const name = id === "default" ? "Default" : id === "quiet-editorial" ? "Quiet Editorial" : id === "amber-dusk" ? "Amber Dusk" : id === "pocketmarket" ? "Pocketmarket" : await page.evaluate((id) => JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!).themes[id].name, id)
  await page.getByRole("combobox", { name: "Active theme" }).click()
  await page.getByRole("option", { name, exact: true }).click()
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", id)
}

/** Check every active-state surface in its real navigation context, including the new modal gate. */
export async function assertActiveControls(page: Page, disabled: boolean) {
  const check = async (control: ReturnType<Page["getByLabel"]>) => disabled ? expect(control).toBeDisabled() : expect(control).toBeEnabled()
  await editorCategory(page, "Colors")
  for (const c of [colorInput(page, "primary"), page.getByLabel("Primary picker", { exact: true }), colorInput(page, "chart-5"), colorInput(page, "sidebar"), page.getByRole("switch", { name: "Use sidebar tokens" }), page.getByLabel("Active theme")]) await check(c)
  await editorCategory(page, "Typography")
  for (const c of [page.getByLabel("Heading Font", { exact: true }), page.getByLabel("Body Font", { exact: true }), page.getByLabel("Mono Font", { exact: true }), page.getByRole("textbox", { name: "Heading Weight" }), page.getByRole("slider", { name: "Body Tracking" })]) await check(c)
  // PUI-94: Radius and Spacing live under Geometry; Shadow and Motion stay under Effects. Each panel carries the note.
  await editorCategory(page, "Geometry")
  for (const c of [page.getByRole("textbox", { name: "Radius" }), page.getByRole("slider", { name: "Radius" }), page.getByRole("textbox", { name: "Spacing" })]) await check(c)
  await expect(page.locator('[data-testid="manual-locked-note"]:visible')).toHaveCount(disabled ? 1 : 0)
  await editorCategory(page, "Effects")
  for (const c of [page.getByLabel("Shadow color", { exact: true }), page.getByLabel("Shadow color picker", { exact: true }), page.getByRole("slider", { name: "Blur", exact: true })]) await check(c)
  // Active-versus-staged clarity: the manual panel says why its controls are paused.
  await expect(page.locator('[data-testid="manual-locked-note"]:visible')).toHaveCount(disabled ? 1 : 0)
  await workspaceMode(page, "Preview")
  await check(page.getByRole("button", { name: "Save", exact: true })); await check(page.getByRole("button", { name: "Code", exact: true }))
  // No Fork workflow remains anywhere in the Workbench.
  await expect(page.getByRole("button", { name: /fork/i })).toHaveCount(0)
  // The mode Switch is presentation-only and stays usable while locked.
  await expect(page.getByRole("switch", { name: "Dark mode" })).toBeEnabled()
  await editorCategory(page, "Command")
}

/** Offscreen category tabs belong only to their bounded horizontal viewport; editor controls must still fit. */
export async function expectEditorContainment(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  const editor = page.locator(".quiet-editor")
  const navigation = page.getByRole("region", { name: "Editor category navigation", exact: true })
  await expect(navigation).toBeVisible()
  const bounds = await editor.evaluate(el => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, client: el.clientWidth, scroll: el.scrollWidth }
  })
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client)
  const owner = await navigation.evaluate(el => {
    const r = el.getBoundingClientRect(), root = el.closest('[data-slot="scroll-area"]')!
    const b = root.getBoundingClientRect()
    return { left: r.left, right: r.right, rootLeft: b.left, rootRight: b.right, overflow: getComputedStyle(el).overflowX }
  })
  expect(owner.left).toBeGreaterThanOrEqual(bounds.left - 1)
  expect(owner.right).toBeLessThanOrEqual(bounds.right + 1)
  expect(owner.rootLeft).toBeGreaterThanOrEqual(bounds.left - 1)
  expect(owner.rootRight).toBeLessThanOrEqual(bounds.right + 1)
  expect(owner.overflow).toBe("scroll")
  const escaping = await editor.evaluate(el => {
    const box = el.getBoundingClientRect()
    return Array.from(el.querySelectorAll("input, [role=slider], button, label")).filter(child => {
      // Only tab triggers in this exact horizontal owner may extend beyond the editor.
      if (child.matches('[role="tab"]') && child.closest('[data-slot="scroll-area-viewport"][aria-label="Editor category navigation"]')) return false
      const r = child.getBoundingClientRect()
      return r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1)
    }).map(child => child.outerHTML.slice(0, 80))
  })
  expect(escaping).toEqual([])
  if (isMobileShell(page)) {
    const sheet = sidebarSheet(page)
    expect(await sheet.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    const b = (await sheet.boundingBox())!
    expect(b.x).toBeGreaterThanOrEqual(-1)
    expect(b.x + b.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
  }
}
