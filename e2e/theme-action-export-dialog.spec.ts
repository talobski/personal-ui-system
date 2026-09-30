import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { editorCategory, isMobileShell, saveTheme, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * Theme action Export dialog v1 (PUI-134, PUI-135, PUI-136): TAED-01 deliberate Export, TAED-02 exact export identity,
 * TAED-03 Delete placement, TAED-04/05 routine success toasts on the shared semantic surface. PUI-138/PUI-139 (TCHS-01
 * to TCHS-03) adapt it: Export is now Code and its Theme code dialog only previews and copies (no Download); Delete
 * uses the siblings' resting foreground. Producer self-checks only.
 */

const STORAGE_KEY = "personal-ui-workbench/v1"
const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const box = async (el: Locator) => (await el.boundingBox())!
const exportDialog = (page: Page) => page.getByRole("dialog", { name: "Theme code", exact: true })
const exportButton = (page: Page) => page.getByTestId("workbench-toolbar").getByRole("button", { name: "Code", exact: true })

async function open(page: Page) {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

/** A semantic token resolved to a computed colour in the Workbench document. */
const resolved = (page: Page, name: string) => page.evaluate((value) => {
  const probe = document.createElement("span")
  probe.style.color = `var(--${value})`
  document.body.append(probe)
  const color = getComputedStyle(probe).color
  probe.remove()
  return color
}, name)

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `taed-${label}`)
  await info.attach(`axe-taed-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
  expect(blocking.filter(v => v.impact === "critical" || v.impact === "serious"), label).toEqual([])
}

const previewText = (page: Page) => exportDialog(page).getByTestId("export-preview").evaluate(el => el.textContent!)

/** The selected format's canonical file name, still carried by the preview (formerly the download name). */
const previewFilename = (page: Page) => exportDialog(page).getByTestId("export-preview").getAttribute("data-filename")

async function copySelected(page: Page) {
  await exportDialog(page).getByRole("button", { name: "Copy", exact: true }).click()
  await expect(exportDialog(page).getByTestId("export-copy-status")).toHaveText("Copied to clipboard.")
  return page.evaluate(() => navigator.clipboard.readText())
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"])
})

test.describe("TAED-01/02 deliberate Export and exact export identity (PUI-134)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`Code opens the Theme code dialog, which never downloads; preview and Copy match per format (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await saveTheme(page, "Export Probe")
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "export-probe")
      const downloads: string[] = []
      page.on("download", d => downloads.push(d.suggestedFilename()))
      await workspaceMode(page, "Preview")
      await exportButton(page).click()
      const dialog = exportDialog(page)
      await expect(dialog).toBeVisible()
      await page.waitForTimeout(300)
      expect(downloads).toEqual([])
      await expect(dialog.getByText("Copy your theme as JSON or Tailwind CSS.", { exact: true })).toBeVisible()
      // PUI-138: no Download action anywhere in the dialog; Copy sits in the code toolbar above the viewport.
      await expect(dialog.getByRole("button", { name: /download/i })).toHaveCount(0)
      const toolbarCopy = dialog.getByTestId("export-code-toolbar").getByRole("button", { name: "Copy", exact: true })
      await expect(toolbarCopy.locator('svg[aria-hidden="true"]')).toHaveCount(1)
      expect((await box(toolbarCopy)).y + (await box(toolbarCopy)).height).toBeLessThanOrEqual((await box(dialog.getByTestId("export-preview-scroll"))).y)
      // No routine feedback for opening Code.
      await expect(page.getByTestId("success-toast")).toHaveCount(0)

      // JSON (default): canonical Theme v3, identical to the stored custom theme, and the same bytes everywhere.
      await expect(dialog.getByRole("tab", { name: "JSON", exact: true })).toHaveAttribute("aria-selected", "true")
      const json = await previewText(page)
      const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).themes["export-probe"], STORAGE_KEY)
      expect(JSON.parse(json)).toEqual(stored)
      expect(JSON.parse(json)).toMatchObject({ id: "export-probe", schemaVersion: "3.0" })
      expect(await copySelected(page)).toBe(json)
      expect(await previewFilename(page)).toBe("export-probe.theme.json")

      // CSS / Tailwind v4 by keyboard: arrows move between the format tabs and update the one previewed value.
      await dialog.getByRole("tab", { name: "JSON", exact: true }).focus()
      await page.keyboard.press("ArrowRight")
      await expect(dialog.getByRole("tab", { name: "CSS / Tailwind v4", exact: true })).toHaveAttribute("aria-selected", "true")
      await expect(dialog.getByTestId("export-preview")).toHaveAttribute("data-format", "css")
      await expect(dialog.getByTestId("export-copy-status")).toHaveText("")
      const css = await previewText(page)
      expect(css).toContain('renderShadcnTailwindCss for theme "export-probe"')
      expect(css).toContain(`--primary: ${stored.colors.light.primary.$value};`)
      expect(css).toContain(`.dark {\n  --background: ${stored.colors.dark.background.$value};`)
      expect(css).toContain("@theme inline {")
      expect(await copySelected(page)).toBe(css)
      expect(await previewFilename(page)).toBe("export-probe.theme.css")
      expect(downloads).toEqual([])

      // Preview: monospaced, whitespace-preserving, and scrolled locally by the shared shadcn ScrollArea, keyboard included.
      const preview = dialog.getByTestId("export-preview")
      expect(await preview.evaluate(el => getComputedStyle(el).whiteSpace)).toBe("pre")
      expect(await preview.evaluate(el => getComputedStyle(el).fontFamily)).toMatch(/mono/i)
      await expect(dialog.getByTestId("export-preview-scroll")).toHaveAttribute("data-slot", "scroll-area")
      const scroller = dialog.getByRole("region", { name: "CSS / Tailwind v4 code", exact: true })
      await expect(scroller).toHaveAttribute("data-slot", "scroll-area-viewport")
      expect(await scroller.evaluate(el => el.scrollHeight > el.clientHeight && el.scrollWidth > el.clientWidth)).toBe(true)
      await toolbarCopy.focus()
      await page.keyboard.press("Tab")
      await expect(scroller).toBeFocused()
      await page.keyboard.press("PageDown")
      await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
      const d = await box(dialog), viewport = page.viewportSize()!
      expect(d.x).toBeGreaterThanOrEqual(0)
      expect(d.y).toBeGreaterThanOrEqual(0)
      expect(d.x + d.width).toBeLessThanOrEqual(viewport.width)
      expect(d.y + d.height).toBeLessThanOrEqual(viewport.height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await axe(page, info, `export-dialog-css-${mode}`)

      // Focus trap: Tab cycles inside the dialog; Escape closes it and returns focus to Code.
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press("Tab")
        expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true)
      }
      await page.keyboard.press("Escape")
      await expect(dialog).toHaveCount(0)
      await expect(exportButton(page)).toBeFocused()
      // Reopening starts at JSON; the Close button closes it too.
      await exportButton(page).click()
      await expect(dialog.getByRole("tab", { name: "JSON", exact: true })).toHaveAttribute("aria-selected", "true")
      await dialog.getByRole("button", { name: "Close", exact: true }).click()
      await expect(dialog).toHaveCount(0)
      expect(downloads).toEqual([])

      // Import compatibility: the copied JSON, stored back as a custom theme, loads and renders.
      await page.evaluate(([key, theme]) => localStorage.setItem(key as string, JSON.stringify({ themes: { "export-import": theme }, activeId: "export-import", bases: { "export-import": "default" } })), [STORAGE_KEY, { ...JSON.parse(json), id: "export-import", name: "Export Import" }])
      await open(page)
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "export-import")
    })
  }

  test("built-in CSS reflects light/dark values and the Tactile UI Effects block", async ({ page }) => {
    await open(page)
    await editorCategory(page, "Effects")
    await page.getByRole("combobox", { name: "Effect", exact: true }).click()
    await page.getByRole("option", { name: /Tactile/ }).click()
    await workspaceMode(page, "Preview")
    await exportButton(page).click()
    await exportDialog(page).getByRole("tab", { name: "CSS / Tailwind v4", exact: true }).click()
    const css = await previewText(page)
    expect(css).toContain('for theme "default"')
    expect(css).toContain(":root {")
    expect(css).toContain(".dark {")
    expect(css).toContain("/* UI effects: tactile")
    expect(await previewFilename(page)).toBe("default.theme.css")
    expect(await copySelected(page)).toBe(css)
  })
})

test.describe("TAED-03 Delete placement (PUI-135)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`custom Delete sits before dark mode behind a divider; built-ins have none; header height is unchanged (${mode})`, async ({ page }, info) => {
      await open(page)
      await setColorMode(page, mode)
      const toolbar = page.getByTestId("workbench-toolbar")
      const action = page.getByTestId("delete-theme")
      await workspaceMode(page, "Preview")
      await expect(action).toHaveCount(0)
      await expect(toolbar.getByRole("separator")).toHaveCount(2)
      await saveTheme(page, "Placement")
      await workspaceMode(page, "Preview")
      await expect(action).toHaveCount(1)
      await expect(page.locator('[data-slot="sidebar-header"]').getByTestId("delete-theme")).toHaveCount(0)
      await expect(action).toHaveAccessibleName("Delete theme")
      await expect(action).not.toHaveAttribute("title")
      expect(await toolbar.locator("button, [role=separator]").evaluateAll(els => els.map(el => el.getAttribute("role") === "separator" ? "|" : el.getAttribute("aria-label") ?? el.textContent!.trim()))).toEqual(["Toggle Sidebar", "Delete theme", "|", "Toggle dark mode", "|", "Undo", "Redo", "Reset", "|", "Code", "Save"])
      expect((await box(toolbar)).height).toBe(64)
      const a = await box(action), sep = await box(toolbar.getByRole("separator").first()), sw = await box(page.getByRole("switch", { name: "Toggle dark mode" }))
      expect(a.x + a.width).toBeLessThanOrEqual(sep.x)
      expect(sep.x + sep.width).toBeLessThanOrEqual(sw.x)
      expect(await toolbar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      // PUI-139: the siblings' resting foreground and 14px glyph in the same 32px target; destructive on hover and focus.
      const reset = page.getByRole("button", { name: "Reset", exact: true })
      expect(await action.evaluate(el => getComputedStyle(el).color)).toBe(await reset.evaluate(el => getComputedStyle(el).color))
      expect(await action.evaluate(el => getComputedStyle(el).color)).toBe(await resolved(page, "foreground"))
      expect((await box(action.locator("svg"))).width).toBe((await box(reset.locator("svg"))).width)
      expect(await box(action)).toMatchObject({ width: (await box(reset)).width, height: (await box(reset)).height })
      await action.hover()
      await expect.poll(() => action.evaluate(el => getComputedStyle(el).color)).toBe(await resolved(page, "destructive"))
      await page.mouse.move(0, 0)
      await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).focus()
      await page.keyboard.press("Tab")
      await expect(action).toBeFocused()
      await expect.poll(() => action.evaluate(el => getComputedStyle(el).color)).toBe(await resolved(page, "destructive"))
      await page.keyboard.press("Tab")
      await expect(page.getByRole("switch", { name: "Toggle dark mode" })).toBeFocused()
      // Confirmation stays keyboard-operable.
      await action.focus()
      await page.keyboard.press("Enter")
      const confirm = page.getByRole("dialog", { name: "Delete custom theme?" })
      await expect(confirm).toBeVisible()
      await axe(page, info, `delete-confirm-${mode}`)
      await confirm.getByRole("button", { name: "Delete theme", exact: true }).click()
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "default")
      await expect(action).toHaveCount(0)
      await expect(page.getByTestId("success-toast")).toContainText("Theme deleted")
    })
  }
})

test.describe("TAED-04/05 routine success toasts on the shared popover surface (PUI-136)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`Save As and Save show transient toasts, not inline notices; the surface uses popover tokens (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await saveTheme(page, "Toast Probe")
      const toast = page.getByTestId("success-toast")
      await expect(toast).toHaveCount(1)
      await expect(toast.getByRole("heading", { name: "Theme saved as custom theme", exact: true })).toBeVisible()
      await expect(page.getByTestId("notice")).toHaveCount(0)
      await expect(page.getByText(/is unchanged\./)).toHaveCount(0)
      expect(await toast.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(await resolved(page, "popover"))
      expect(await toast.evaluate(el => getComputedStyle(el).color)).toBe(await resolved(page, "popover-foreground"))
      expect(await toast.evaluate(el => getComputedStyle(el).borderTopColor)).toBe(await resolved(page, "border"))
      expect(await toast.evaluate(el => getComputedStyle(el).borderTopWidth)).toBe("1px")
      await axe(page, info, `save-as-toast-${mode}`)
      await toast.getByRole("button", { name: "Dismiss", exact: true }).click()
      await expect(toast).toHaveCount(0)

      // Existing custom Save: an edit, then Save, shows "Theme saved" and no persistent notice.
      await editorCategory(page, "Geometry")
      const radius = page.getByRole("textbox", { name: "Radius", exact: true })
      await radius.fill("0.75")
      await radius.blur()
      await saveTheme(page)
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, saved")
      await expect(toast.getByRole("heading", { name: "Theme saved", exact: true })).toBeVisible()
      await expect(page.getByTestId("notice")).toHaveCount(0)
      // Transient: it closes on its own.
      await expect(toast).toHaveCount(0, { timeout: 10_000 })
      // Reset keeps its own toast, copy and Undo on the same surface.
      await editorCategory(page, "Geometry")
      await radius.fill("0.5")
      await radius.blur()
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Reset", exact: true }).click()
      await page.getByRole("dialog", { name: /^Reset / }).getByRole("button", { name: "Reset theme", exact: true }).click()
      const reset = page.getByTestId("reset-toast")
      await expect(reset.getByRole("heading", { name: "Reset to last saved" })).toBeVisible()
      await expect(reset.getByRole("button", { name: "Undo", exact: true })).toBeVisible()
      await expect(reset.getByRole("button", { name: "Dismiss", exact: true })).toBeVisible()
      expect(await reset.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(await resolved(page, "popover"))
      expect(await reset.evaluate(el => getComputedStyle(el).borderTopColor)).toBe(await resolved(page, "border"))
      if (isMobileShell(page)) expect((await box(reset)).width).toBeLessThanOrEqual(page.viewportSize()!.width - 32)
    })
  }
})
