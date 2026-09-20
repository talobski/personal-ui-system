import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Page, TestInfo } from "@playwright/test"

const EDIT = { light: "oklch(0.4 0.1 150)", dark: "oklch(0.8 0.1 150)" } as const
const OPEN_BUTTON = "Open dialog"

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

async function openWorkbench(page: Page) {
  await page.goto("/")
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

async function seriousViolations(page: Page) {
  await settleVisuals(page)
  // axe analyzes the page and its (same-origin) preview iframe.
  const { violations } = await new AxeBuilder({ page }).analyze()
  return violations.filter((v) => v.impact === "critical" || v.impact === "serious")
}

async function expectNoSeriousViolations(page: Page, label: string, testInfo: TestInfo) {
  const violations = await seriousViolations(page)
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
    test(`preview, edit, fork, save, reload, diff, export — ${mode}`, async ({ page }, testInfo) => {
      const frame = previewFrame(page)
      await openWorkbench(page)
      await page.getByRole("button", { name: mode === "light" ? "Light" : "Dark", exact: true }).click()
      await expect(frame.getByTestId("preview")).toHaveAttribute("data-mode", mode)
      await expect(page.locator("html")).toHaveClass(mode === "dark" ? /dark/ : /^(?!.*dark).*$/)

      // Baseline: canonical theme loaded, no differences.
      await expect(page.getByTestId("theme-id")).toHaveText("quiet-editorial")
      await expect(page.getByTestId("diff-empty")).toBeVisible()
      const baselinePrimary = await previewVar(page, "--primary")
      expect(baselinePrimary).toMatch(/^oklch\(/)

      // Keyboard: native Button activates with Enter and Space; Input accepts typed text.
      const defaultButton = frame.getByRole("button", { name: "default", exact: true })
      await defaultButton.focus()
      await expect(defaultButton).toBeFocused()
      await page.keyboard.press("Enter")
      await page.keyboard.press("Space")
      await expect(frame.getByTestId("button-activations")).toHaveText("Default button activations: 2")
      const defaultInput = frame.getByLabel("Default")
      await defaultInput.focus()
      await expect(defaultInput).toBeFocused()
      await page.keyboard.type("Keyboard input")
      await expect(defaultInput).toHaveValue("Keyboard input")

      // Preview widths: Drawer at the mobile width, Dialog at the desktop width.
      for (const [label, width, slot] of [
        ["Mobile 390", 390, "drawer-content"],
        ["Desktop 1024", 1024, "dialog-content"],
      ] as const) {
        await page.getByRole("button", { name: label }).click()
        await expect(page.getByTestId("preview-frame")).toHaveAttribute("style", new RegExp(`width: ${width}px`))
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
      }

      // Valid edit: applied, previewed, revision bumped, shown in the baseline diff.
      await page.getByLabel("Token").selectOption("primary")
      await page.getByLabel("Value (oklch)").fill(EDIT[mode])
      await page.getByRole("button", { name: "Apply edit" }).click()
      await expect(page.getByTestId("theme-revision")).toHaveText("2")
      await expect.poll(() => previewVar(page, "--primary")).toBe(EDIT[mode])
      await expect(page.getByTestId("diff-count")).toHaveText("1")
      await expect(page.getByTestId("diff-list").locator(`[data-path="modes.${mode}.color.primary"]`)).toContainText(EDIT[mode])
      await expect(page.getByTestId("edit-error")).toHaveCount(0)

      // Invalid edit: rejected with a stable rule, nothing activates.
      await page.getByLabel("Value (oklch)").fill("red")
      await page.getByRole("button", { name: "Apply edit" }).click()
      await expect(page.getByTestId("edit-error")).toContainText("mutation.invalid-value at operations[0].value")
      await expect(page.getByTestId("theme-revision")).toHaveText("2")
      expect(await previewVar(page, "--primary")).toBe(EDIT[mode])
      await expect(page.getByTestId("diff-count")).toHaveText("1")

      // Fork: invalid id rejected, valid id/name accepted.
      await page.getByLabel("Fork id").fill("Bad Id")
      await page.getByLabel("Fork name").fill("My Fork")
      await page.getByRole("button", { name: "Fork theme" }).click()
      await expect(page.getByTestId("fork-error")).toContainText("workbench.fork.invalid at id")
      await expect(page.getByTestId("theme-id")).toHaveText("quiet-editorial")
      await page.getByLabel("Fork id").fill("my-fork")
      await page.getByRole("button", { name: "Fork theme" }).click()
      await expect(page.getByTestId("theme-id")).toHaveText("my-fork")
      await expect(page.getByTestId("theme-name")).toHaveText("My Fork")
      await expect(page.getByTestId("theme-status")).toHaveText("unsaved")

      // Save, then survive a browser refresh.
      await page.getByRole("button", { name: "Save theme" }).click()
      await expect(page.getByTestId("theme-status")).toHaveText("saved")
      await page.reload()
      await expect(frame.getByTestId("preview")).toHaveAttribute("data-ready", "true")
      await expect(page.getByTestId("theme-id")).toHaveText("my-fork")
      await expect(page.getByTestId("theme-status")).toHaveText("saved")
      await expect(page.getByTestId("diff-list").locator(`[data-path="modes.${mode}.color.primary"]`)).toContainText(EDIT[mode])
      await page.getByRole("button", { name: mode === "light" ? "Light" : "Dark", exact: true }).click()
      await expect.poll(() => previewVar(page, "--primary")).toBe(EDIT[mode])

      // Portable export.
      const download = page.waitForEvent("download")
      await page.getByRole("button", { name: "Export JSON" }).click()
      const file = await download
      expect(file.suggestedFilename()).toBe("my-fork.theme.json")
      const exported = JSON.parse(await (await import("node:fs/promises")).readFile((await file.path())!, "utf8"))
      expect(exported).toMatchObject({ id: "my-fork", name: "My Fork", kind: "personal-ui-theme", revision: 1 })
      expect(exported.modes[mode].color.primary.$value).toBe(EDIT[mode])

      await expectNoSeriousViolations(page, `${mode}-after-reload`, testInfo)
    })
  }
})
