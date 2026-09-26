import { colorInput, editorCategory, previewStates, saveTheme, setColorMode, workspaceMode } from "./workbench-navigation"
import AxeBuilder from "@axe-core/playwright"
import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Page, TestInfo } from "@playwright/test"

const EDIT = { light: "oklch(0.4 0.1 150)", dark: "oklch(0.8 0.1 150)" } as const
const OPEN_BUTTON = "Open dialog"

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

async function openWorkbench(page: Page) {
  await page.goto("/")
  await previewStates(page)
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

/** Reads a theme variable as the preview document resolves it. */
const previewVar = (page: Page, name: string) =>
  previewFrame(page).locator("html").evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name)

/** Moves the pointer off any hover target and waits out running CSS transitions, so axe measures settled colors. */
async function settleVisuals(page: Page) {
  await page.mouse.move(0, 0)
  const running = async () => {
    const inPage = await page.evaluate(() => document.getAnimations().length)
    const inFrame = await previewFrame(page).locator("html").evaluate(() => document.getAnimations().length)
    return inPage + inFrame
  }
  await expect.poll(running).toBe(0)
}

async function seriousViolations(page: Page, label: string, testInfo: TestInfo) {
  await settleVisuals(page)
  // axe analyzes the page and its (same-origin) preview iframe.
  const { violations } = await new AxeBuilder({ page }).analyze()
  return seriousOutsideKnownDebt(page, violations, testInfo, label)
}

async function expectNoSeriousViolations(page: Page, label: string, testInfo: TestInfo) {
  const violations = await seriousViolations(page, label, testInfo)
  await testInfo.attach(`axe-${label}.json`, { body: JSON.stringify(violations, null, 2), contentType: "application/json" })
  expect(violations, `${label}: ${JSON.stringify(violations.map((v) => [v.id, v.nodes.map((n) => n.target)]))}`).toEqual([])
}

/** Waits for slide/fade animation so axe measures settled contrast and layout. */
async function settled(frame: FrameLocator, selector: string) {
  const content = frame.locator(selector)
  await expect(content).toBeVisible()
  let previous = ""
  await expect
    .poll(async () => {
      const box = JSON.stringify(await content.boundingBox())
      const stable = box === previous
      previous = box
      return stable
    })
    .toBe(true)
}

test.describe("workbench theme lifecycle", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`preview, edit, Save As, reload, export — ${mode}`, async ({ page }, testInfo) => {
      const frame = previewFrame(page)
      await openWorkbench(page)
      await setColorMode(page, mode)
      await expect(frame.getByTestId("preview")).toHaveAttribute("data-mode", mode)
      await expect(page.locator("html")).toHaveClass(mode === "dark" ? /dark/ : /^(?!.*dark).*$/)

      // Fresh state: the built-in Default; no baseline-diff UI or Fork terminology anywhere.
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "default")
      await workspaceMode(page, "Controls")
      await expect(page.getByTestId("diff-empty")).toHaveCount(0)
      await expect(page.getByText(/baseline|fork/i)).toHaveCount(0)
      const baselinePrimary = await previewVar(page, "--primary")
      expect(baselinePrimary).toMatch(/^oklch\(/)

      // Keyboard: native Button activates with Enter and Space; Input accepts typed text.
      const defaultButton = frame.getByRole("button", { name: "default", exact: true, includeHidden: true })
      await workspaceMode(page, "Preview")
      await defaultButton.focus()
      await expect(defaultButton).toBeFocused()
      await page.keyboard.press("Enter")
      await page.keyboard.press("Space")
      await expect(frame.getByTestId("button-activations")).toHaveText("Default button activations: 2")
      const defaultInput = frame.getByRole("textbox", { name: "Default", exact: true })
      await defaultInput.focus()
      await expect(defaultInput).toBeFocused()
      await page.keyboard.type("Keyboard input")
      await expect(defaultInput).toHaveValue("Keyboard input")

      // The preview follows the real viewport: Drawer in the 390px mobile Preview mode, Dialog in the desktop panel.
      const width = page.viewportSize()!.width
      const slot = width < 1024 ? "drawer-content" : "dialog-content"
      await workspaceMode(page, "Preview")
      await expectNoSeriousViolations(page, `${mode}-${width}-closed`, testInfo)
      const trigger = frame.getByRole("button", { name: OPEN_BUTTON })
      await trigger.focus()
      await page.keyboard.press("Enter")
      await settled(frame, `[data-slot="${slot}"]`)
      await page.keyboard.press("Tab")
      await expect(frame.locator(`[data-slot="${slot}"]:focus, [data-slot="${slot}"] :focus`)).toHaveCount(1)
      await expectNoSeriousViolations(page, `${mode}-${width}-dialog-open`, testInfo)
      await page.keyboard.press("Escape")
      await expect(frame.locator(`[data-slot="${slot}"]`)).toHaveCount(0)
      await expect(trigger).toBeFocused()

      // Valid edit: applied live (no Apply step), previewed, revision bumped.
      await editorCategory(page, "Colors")
      await expect(page.getByRole("button", { name: /^Apply/ })).toHaveCount(0)
      await colorInput(page, "primary").fill(EDIT[mode])
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "2")
      await expect.poll(() => previewVar(page, "--primary")).toBe(EDIT[mode])
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")
      await expect(page.getByTestId("color-primary-error")).toHaveCount(0)

      // Invalid edit: rejected with a stable rule, nothing activates.
      await editorCategory(page, "Colors")
      await colorInput(page, "primary").fill("red")
      await expect(page.getByTestId("color-primary-error")).toContainText("mutation.invalid-value at operations[0].value")
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "2")
      expect(await previewVar(page, "--primary")).toBe(EDIT[mode])
      await expect(colorInput(page, "primary")).toHaveAttribute("aria-invalid", "true")
      await expectNoSeriousViolations(page, `${mode}-edit-error`, testInfo)

      // Save As: invalid name rejected, valid name creates, saves, and selects a custom copy.
      await saveTheme(page, "   ")
      await expect(page.getByTestId("save-as-error")).toBeVisible()
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "default")
      await expectNoSeriousViolations(page, `${mode}-save-as-error`, testInfo)
      await page.getByRole("dialog").getByLabel("Theme name").fill("My Theme")
      await page.getByRole("dialog").getByRole("button", { name: "Save theme", exact: true }).click()
      await expect(page.getByRole("dialog")).toHaveCount(0)
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "my-theme")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, saved")
      await expect(page.getByTestId("notice")).toContainText('Saved "My Theme" as a custom theme')

      // Survive a browser refresh.
      await page.reload()
      await expect(frame.getByTestId("preview")).toHaveAttribute("data-ready", "true")
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "my-theme")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, saved")
      await setColorMode(page, mode)
      await expect.poll(() => previewVar(page, "--primary")).toBe(EDIT[mode])
      await editorCategory(page, "Colors")
      await expect(colorInput(page, "primary")).toHaveValue(EDIT[mode])

      // Portable export.
      const download = page.waitForEvent("download")
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Export JSON" }).click()
      const file = await download
      expect(file.suggestedFilename()).toBe("my-theme.theme.json")
      const exported = JSON.parse(await (await import("node:fs/promises")).readFile((await file.path())!, "utf8"))
      expect(exported).toMatchObject({ id: "my-theme", name: "My Theme", kind: "personal-ui-theme", revision: 1, schemaVersion: "3.0" })
      expect(exported.colors[mode].primary.$value).toBe(EDIT[mode])

      await expectNoSeriousViolations(page, `${mode}-after-reload`, testInfo)
    })
  }
})
