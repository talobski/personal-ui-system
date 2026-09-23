import { workspaceMode, editorCategory, previewStates, openFork, assertActiveControls, showBaseline } from "./workbench-navigation"
import AxeBuilder from "@axe-core/playwright"
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
      await workspaceMode(page, "Preview")
      await page.getByRole("radio", { name: mode === "light" ? "Light" : "Dark", exact: true }).click()
      await expect(frame.getByTestId("preview")).toHaveAttribute("data-mode", mode)
      await expect(page.locator("html")).toHaveClass(mode === "dark" ? /dark/ : /^(?!.*dark).*$/)

      // Baseline: canonical theme loaded, no differences.
      await expect(page.getByTestId("theme-id")).toHaveText("quiet-editorial")
      await workspaceMode(page, "Controls")
      await expect(page.getByTestId("diff-empty")).toBeVisible()
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

      // Preview widths: Drawer at the mobile width, Dialog at the desktop width.
      for (const [label, width, slot] of [
        ["Mobile 390", 390, "drawer-content"],
        ["Desktop 1024", 1024, "dialog-content"],
      ] as const) {
        await workspaceMode(page, "Preview")
        await page.getByRole("radio", { name: label }).click()
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
      await editorCategory(page, "Colors")
      await page.getByLabel("Token").selectOption("primary")
      await editorCategory(page, "Colors")
      await page.getByLabel("Value (oklch)").fill(EDIT[mode])
      await page.getByRole("button", { name: "Apply edit" }).click()
      await expect(page.getByTestId("theme-revision")).toHaveText("2")
      await expect.poll(() => previewVar(page, "--primary")).toBe(EDIT[mode])
      await expect(page.getByTestId("diff-count")).toHaveText("1")
      await expect(page.getByTestId("diff-list").locator(`[data-path="modes.${mode}.color.primary"]`)).toContainText(EDIT[mode])
      await expect(page.getByTestId("edit-error")).toHaveCount(0)

      // Invalid edit: rejected with a stable rule, nothing activates.
      await editorCategory(page, "Colors")
      await page.getByLabel("Value (oklch)").fill("red")
      await page.getByRole("button", { name: "Apply edit" }).click()
      await expect(page.getByTestId("edit-error")).toContainText("mutation.invalid-value at operations[0].value")
      await expect(page.getByTestId("theme-revision")).toHaveText("2")
      expect(await previewVar(page, "--primary")).toBe(EDIT[mode])
      await expect(page.getByTestId("diff-count")).toHaveText("1")
      await expect(page.getByLabel("Value (oklch)")).toHaveAttribute("aria-invalid", "true")
      await expectNoSeriousViolations(page, `${mode}-edit-error`, testInfo)

      // Fork: invalid id rejected, valid id/name accepted.
      await openFork(page)
      await page.getByLabel("Fork id").fill("Bad Id")
      await page.getByLabel("Fork name").fill("My Fork")
      await page.getByRole("dialog").getByRole("button", { name: "Fork theme", exact: true }).click()
      await expect(page.getByTestId("fork-error")).toContainText("workbench.fork.invalid at id")
      await expect(page.getByTestId("theme-id")).toHaveText("quiet-editorial")
      await expect(page.getByLabel("Fork id")).toHaveAttribute("aria-invalid", "true")
      await expectNoSeriousViolations(page, `${mode}-fork-error`, testInfo)
      await openFork(page)
      await page.getByLabel("Fork id").fill("my-fork")
      await page.getByRole("dialog").getByRole("button", { name: "Fork theme", exact: true }).click()
      await expect(page.getByTestId("theme-id")).toHaveText("my-fork")
      await expect(page.getByTestId("theme-name")).toHaveText("My Fork")
      await expect(page.getByTestId("theme-status")).toHaveText("unsaved")

      // Save, then survive a browser refresh.
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Save theme" }).click()
      await expect(page.getByTestId("theme-status")).toHaveText("saved")
      await page.reload()
      await expect(frame.getByTestId("preview")).toHaveAttribute("data-ready", "true")
      await expect(page.getByTestId("theme-id")).toHaveText("my-fork")
      await expect(page.getByTestId("theme-status")).toHaveText("saved")
      await expect(page.getByTestId("diff-list").locator(`[data-path="modes.${mode}.color.primary"]`)).toContainText(EDIT[mode])
      await workspaceMode(page, "Preview")
      await page.getByRole("radio", { name: mode === "light" ? "Light" : "Dark", exact: true }).click()
      await expect.poll(() => previewVar(page, "--primary")).toBe(EDIT[mode])

      // Portable export.
      const download = page.waitForEvent("download")
      await workspaceMode(page, "Preview")
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

/** One representative edit per non-color category, as the Edit theme settings panel exposes them. */
const SETTING_EDITS = [
  { option: "Radius (md)", value: "1rem", invalid: "1rem; } body { display: none", diffPath: "radius.md", previewVar: "--radius" },
  { option: "Spacing density", value: "1.25", invalid: "9", diffPath: "space.density", previewVar: "--density" },
  { option: "Sans font family", value: "Source Serif", invalid: 'x"; } a{', diffPath: "typography.sans" },
  { option: "Shadow blur (md)", value: "12px", invalid: "-3px", diffPath: "shadow.md" },
  { option: "Base motion duration", value: "320ms", invalid: "fast", diffPath: "motion.durationBase", previewVar: "--motion-duration-base" },
] as const

test.describe("workbench non-color settings", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`edit one token per new category, block invalid values, survive reload — ${mode}`, async ({ page }, testInfo) => {
      await openWorkbench(page)
      await workspaceMode(page, "Preview")
      await page.getByRole("radio", { name: mode === "light" ? "Light" : "Dark", exact: true }).click()
      await workspaceMode(page, "Controls")
      await expect(page.getByTestId("diff-empty")).toBeVisible()

      const apply = page.getByRole("button", { name: "Apply setting" })
      let revision = 1
      for (const [index, edit] of SETTING_EDITS.entries()) {
        await editorCategory(page, edit.option === "Sans font family" ? "Typography" : "Other")
        await page.getByLabel("Setting", { exact: true }).selectOption({ label: edit.option })

        // Invalid value: blocked with a visible, stable-rule error; nothing activates.
        await page.getByLabel("Setting value").fill(edit.invalid)
        await apply.click()
        await expect(page.getByTestId("setting-error")).toBeVisible()
        await expect(page.getByTestId("setting-error")).toContainText("mutation.invalid-value at operations[0].value")
        await expect(page.getByLabel("Setting value")).toHaveAttribute("aria-invalid", "true")
        await expect(page.getByTestId("theme-revision")).toHaveText(String(revision))
        await expect(page.getByTestId("diff-count")).toHaveText(String(index))
        if (index === 0) await expectNoSeriousViolations(page, `${mode}-setting-error`, testInfo)

        // Valid value: applied through the mutation boundary, revision bumped, path listed in the diff.
        // The last edit uses the keyboard alone (focus, type, Tab to the button, Enter).
        await page.getByLabel("Setting value").fill(edit.value)
        if (index === SETTING_EDITS.length - 1) {
          await page.getByLabel("Setting value").focus()
          await page.keyboard.press("Tab")
          await expect(apply).toBeFocused()
          await page.keyboard.press("Enter")
        } else {
          await apply.click()
        }
        revision += 1
        await expect(page.getByTestId("theme-revision")).toHaveText(String(revision))
        await expect(page.getByTestId("setting-error")).toHaveCount(0)
        await expect(page.getByTestId("diff-count")).toHaveText(String(index + 1))
        await showBaseline(page)
        await expect(page.getByTestId("diff-list").locator(`[data-path="${edit.diffPath}"]`)).toBeVisible()
        if ("previewVar" in edit) await expect.poll(() => previewVar(page, edit.previewVar)).toBe(edit.value)
      }
      await expectNoSeriousViolations(page, `${mode}-settings-edited`, testInfo)

      // Fork, save, and survive a browser refresh with every edit intact.
      await openFork(page)
      await page.getByLabel("Fork id").fill("settings-fork")
      await page.getByLabel("Fork name").fill("Settings Fork")
      await page.getByRole("dialog").getByRole("button", { name: "Fork theme", exact: true }).click()
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Save theme" }).click()
      await expect(page.getByTestId("theme-status")).toHaveText("saved")
      await page.reload()
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
      await expect(page.getByTestId("theme-id")).toHaveText("settings-fork")
      await expect(page.getByTestId("theme-status")).toHaveText("saved")
      await expect(page.getByTestId("diff-count")).toHaveText(String(SETTING_EDITS.length))
      for (const edit of SETTING_EDITS) {
        await showBaseline(page)
        await expect(page.getByTestId("diff-list").locator(`[data-path="${edit.diffPath}"]`)).toBeVisible()
        await editorCategory(page, edit.option === "Sans font family" ? "Typography" : "Other")
        await page.getByLabel("Setting", { exact: true }).selectOption({ label: edit.option })
        await expect(page.getByLabel("Setting value")).toHaveValue(edit.value)
      }
      await expect.poll(() => previewVar(page, "--motion-duration-base")).toBe("320ms")
      await expectNoSeriousViolations(page, `${mode}-settings-after-reload`, testInfo)
    })
  }
})

/** Computed style of a preview element, as the iframe document resolves it (never a variable's mere presence). */
const previewStyle = (page: Page, testId: string | null, prop: keyof CSSStyleDeclaration) =>
  (testId === null ? previewFrame(page).locator("body") : previewFrame(page).getByTestId(testId)).evaluate(
    (el, p) => String(getComputedStyle(el)[p]),
    prop,
  )

test.describe("preview feedback: all six categories change computed styles live", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`edits change resolved styles in the iframe without a reload — ${mode}`, async ({ page }) => {
      await openWorkbench(page)
      await workspaceMode(page, "Preview")
      await page.getByRole("radio", { name: mode === "light" ? "Light" : "Dark", exact: true }).click()
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-mode", mode)

      // A marker on the iframe window proves the document is never reloaded or replaced.
      await previewFrame(page).locator("html").evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true))
      const button = previewFrame(page).getByRole("button", { name: "default", exact: true, includeHidden: true })

      const before = {
        color: await button.evaluate((el) => getComputedStyle(el).backgroundColor),
        radius: await previewStyle(page, "elevation-sample", "borderRadius"),
        density: await previewStyle(page, "elevation-sample", "paddingLeft"),
        font: await previewStyle(page, null, "fontFamily"),
        shadow: await previewStyle(page, "elevation-sample", "boxShadow"),
        motion: await button.evaluate((el) => getComputedStyle(el).transitionDuration),
      }
      expect(before.radius).toBe("8px")
      expect(before.density).toBe("12px")
      expect(before.motion).toBe("0.2s")

      // Colour, through the token editor.
      await editorCategory(page, "Colors")
      await page.getByLabel("Token").selectOption("primary")
      await editorCategory(page, "Colors")
      await page.getByLabel("Value (oklch)").fill(EDIT[mode])
      await page.getByRole("button", { name: "Apply edit" }).click()
      await expect(page.getByTestId("theme-revision")).toHaveText("2")
      await expect.poll(() => button.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before.color)

      // The other five, through the settings panel.
      const setting = async (option: string, value: string) => {
        await editorCategory(page, option === "Sans font family" ? "Typography" : "Other")
        await page.getByLabel("Setting", { exact: true }).selectOption({ label: option })
        await page.getByLabel("Setting value").fill(value)
        await page.getByRole("button", { name: "Apply setting" }).click()
        await expect(page.getByTestId("setting-error")).toHaveCount(0)
      }
      await setting("Radius (md)", "1rem")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("16px")
      await expect.poll(() => button.evaluate((el) => getComputedStyle(el).borderRadius)).toBe("16px")

      await setting("Spacing density", "1.25")
      await expect.poll(() => previewStyle(page, "elevation-sample", "paddingLeft")).toBe("15px")

      await setting("Sans font family", "Source Serif")
      await expect.poll(() => previewStyle(page, null, "fontFamily")).toContain("Source Serif")
      expect(await previewStyle(page, null, "fontFamily")).not.toBe(before.font)

      await setting("Shadow blur (md)", "12px")
      await expect.poll(() => previewStyle(page, "elevation-sample", "boxShadow")).not.toBe(before.shadow)
      expect(await previewStyle(page, "elevation-sample", "boxShadow")).toContain("12px")

      await setting("Base motion duration", "320ms")
      await expect.poll(() => button.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0.32s")

      expect(await previewFrame(page).locator("html").evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
    })
  }
})
