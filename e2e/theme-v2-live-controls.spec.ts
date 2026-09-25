import { stageCommand } from "./design-command-fixture"
import AxeBuilder from "@axe-core/playwright"
import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

import { colorInput, editorCategory, previewStates, saveTheme, selectTheme, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * TSV2 Workbench evidence (runs under playwright.workbench.config.ts at 390x844 and 1440x900): Default fresh state and
 * selection persistence, live canonical manual controls with computed-style effects, inert invalid drafts,
 * keyboard/pointer slider operation, staged-proposal clarity, reduced motion, containment, and decoded axe results.
 */

const STORAGE_KEY = "personal-ui-workbench/v1"
const MODES = ["light", "dark"] as const
type Mode = (typeof MODES)[number]

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const revision = (page: Page) => page.locator("#workbench-active-theme")
const revisionNumber = async (page: Page) => Number(await revision(page).getAttribute("data-revision"))

async function openWorkbench(page: Page, mode: Mode = "light") {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await previewStates(page)
  await setColorMode(page, mode)
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-mode", mode)
}

/** A computed style inside the preview iframe (never a variable's mere presence). */
const previewStyle = (page: Page, testId: string | null, prop: keyof CSSStyleDeclaration) =>
  (testId === null ? previewFrame(page).locator("body") : previewFrame(page).getByTestId(testId)).evaluate((el, p) => String(getComputedStyle(el)[p]), prop)
const previewVar = (page: Page, name: string) => previewFrame(page).locator("html").evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name)
const buttonMotion = (page: Page) =>
  previewFrame(page).getByRole("button", { name: "default", exact: true, includeHidden: true }).evaluate((el) => getComputedStyle(el).transitionDuration)

async function expectNoSeriousViolations(page: Page, label: string, testInfo: TestInfo) {
  await page.mouse.move(0, 0)
  await expect
    .poll(async () => (await page.evaluate(() => document.getAnimations().length)) + (await previewFrame(page).locator("html").evaluate(() => document.getAnimations().length)))
    .toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((v) => v.impact === "critical" || v.impact === "serious")
  await testInfo.attach(`axe-tsv2-${label}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious, `${label}: ${JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]))}`).toEqual([])
}

const numberField = (page: Page, name: string) => page.getByRole("textbox", { name, exact: true })
const slider = (page: Page, name: string) => page.getByRole("slider", { name, exact: true })

/** Types into a numeric field (one change event) and expects exactly one new revision. */
async function setNumber(page: Page, name: string, value: string) {
  const before = await revisionNumber(page)
  await numberField(page, name).fill(value)
  await expect(revision(page)).toHaveAttribute("data-revision", String(before + 1))
  await expect(page.locator('[role="alert"], [data-slot="field-error"]').filter({ visible: true })).toHaveCount(0)
}

async function expectContained(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width)
  const editor = page.locator(".quiet-editor")
  const overflow = await editor.evaluate((el) => {
    const box = el.getBoundingClientRect()
    const escaping = Array.from(el.querySelectorAll("input, [role=slider], button, label")).filter((child) => {
      const r = child.getBoundingClientRect()
      return r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1)
    })
    return escaping.map((child) => child.outerHTML.slice(0, 80))
  })
  expect(overflow).toEqual([])
}

test.describe("TSV2-04 fresh state, built-in selection, persistence", () => {
  test("fresh state is Default; a valid selection survives reload; invalid state falls back to Default", async ({ page }) => {
    await openWorkbench(page)
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "default")
    await workspaceMode(page, "Controls")
    await expect(page.getByRole("combobox", { name: "Active theme" })).toHaveText("Default")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
    await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-theme-id", "default")
    // Default's canonical values reach the preview: radius base 0.7rem, md 0.575rem, spacing base 0.25rem.
    expect(await previewVar(page, "--radius")).toBe("0.7rem")
    await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("9.2px")
    await expect.poll(() => previewStyle(page, "elevation-sample", "paddingLeft")).toBe("12px")
    expect(await previewStyle(page, null, "fontFamily")).toMatch(/^ui-sans-serif, system-ui, -apple-system/)
    await workspaceMode(page, "Controls")
    // Compact selector (WTEP-09): built-ins are grouped as built-in; no custom group until one is saved.
    await page.getByRole("combobox", { name: "Active theme" }).click()
    await expect(page.getByRole("group", { name: "Built-in", exact: true }).getByRole("option")).toHaveText(["Default", "Quiet Editorial"])
    await expect(page.getByRole("group", { name: "Custom", exact: true })).toHaveCount(0)
    await page.keyboard.press("Escape")

    // Quiet Editorial stays selectable and the selection persists without saving any theme data.
    await selectTheme(page, "quiet-editorial")
    await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-theme-id", "quiet-editorial")
    await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("8px")
    const stored = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))!)
    expect(stored).toMatchObject({ activeId: "quiet-editorial", themes: {} })
    await page.reload()
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "quiet-editorial")
    await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-theme-id", "quiet-editorial")

    // A removed/unknown persisted selection falls back to Default.
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ themes: {}, activeId: "removed-theme", bases: {} })), STORAGE_KEY)
    await page.reload()
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "default")
    // Corrupt storage falls back too.
    await page.evaluate((key) => localStorage.setItem(key, "{not json"), STORAGE_KEY)
    await page.reload()
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "default")
  })

  test("a stored v1 theme migrates on load, stays selected, and exports as v2 (TSV2-12)", async ({ page }) => {
    const v1 = JSON.parse(readFileSync(new URL("../packages/core/src/theme/fixtures/valid.json", import.meta.url), "utf8"))
    await page.goto("/")
    await page.evaluate(
      ([key, theme]) => localStorage.setItem(key as string, JSON.stringify({ themes: { "legacy-fork": theme }, activeId: "legacy-fork" })),
      [STORAGE_KEY, { ...v1, id: "legacy-fork", name: "Legacy Fork" }]
    )
    await page.reload()
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "legacy-fork")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, saved")
    await workspaceMode(page, "Controls")
    await expect(page.getByRole("combobox", { name: "Active theme" })).toHaveText("Legacy Fork")
    await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-theme-id", "legacy-fork")
    const download = page.waitForEvent("download")
    await workspaceMode(page, "Preview")
    await page.getByRole("button", { name: "Export JSON" }).click()
    const exported = JSON.parse(readFileSync((await (await download).path())!, "utf8"))
    expect(exported).toMatchObject({ id: "legacy-fork", schemaVersion: "2.0", $schema: "https://personal-ui.local/schema/theme-2.json" })
    expect(exported.colors.dark.border.$value).toBe("oklch(1 0 0 / 0.1)")
  })

  test("built-ins are immutable: Save opens Save As, which saves and selects one custom copy that reloads (WTEP-08)", async ({ page }, testInfo) => {
    await openWorkbench(page)
    await editorCategory(page, "Other")
    await setNumber(page, "Radius", "0.5")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")

    // Cancelling Save As saves nothing and returns focus to Save.
    await saveTheme(page)
    const dialog = page.getByRole("dialog", { name: "Save as a custom theme" })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel("Theme name")).toHaveValue("Default Custom")
    await expectNoSeriousViolations(page, "save-as-open", testInfo)
    await page.keyboard.press("Escape")
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Save", exact: true })).toBeFocused()
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull()

    // An invalid name is rejected in place; nothing is saved.
    await saveTheme(page, "Bad-Name!")
    await expect(dialog.getByTestId("save-as-error")).toContainText("letters, digits, and spaces")
    await expect(dialog.getByLabel("Theme name")).toHaveAttribute("aria-invalid", "true")
    await expectNoSeriousViolations(page, "save-as-error", testInfo)
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull()

    // A valid name (submitted with Enter) creates, saves, and selects exactly one custom theme.
    await dialog.getByLabel("Theme name").fill("Rounder")
    await dialog.getByLabel("Theme name").press("Enter")
    await expect(dialog).toHaveCount(0)
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "rounder")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, saved")
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "1")
    await workspaceMode(page, "Controls")
    await page.getByRole("combobox", { name: "Active theme" }).click()
    await expect(page.getByRole("group", { name: "Custom", exact: true }).getByRole("option")).toHaveText(["Rounder"])
    await page.keyboard.press("Escape")
    const stored = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))!)
    expect(Object.keys(stored.themes)).toEqual(["rounder"])
    expect(stored).toMatchObject({ activeId: "rounder", themes: { rounder: { id: "rounder", name: "Rounder", revision: 1, radius: { base: { $value: "0.5rem" } } } } })

    // The built-in itself never changed.
    await selectTheme(page, "default")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
    await editorCategory(page, "Other")
    await expect(numberField(page, "Radius")).toHaveValue("0.7")
    await selectTheme(page, "rounder")

    // Saving an existing custom theme updates it in place, without Save As.
    await editorCategory(page, "Other")
    await setNumber(page, "Radius", "0.75")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, unsaved changes")
    await saveTheme(page)
    await expect(page.getByRole("dialog")).toHaveCount(0)
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, saved")
    const updated = JSON.parse((await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))!)
    expect(Object.keys(updated.themes)).toEqual(["rounder"])
    expect(updated.themes.rounder).toMatchObject({ revision: 2, radius: { base: { $value: "0.75rem" } } })

    await page.reload()
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "rounder")
    await editorCategory(page, "Other")
    await expect(numberField(page, "Radius")).toHaveValue("0.75")
    await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("10px")
  })
})

for (const mode of MODES) {
  test.describe(`TSV2-10/11 live manual controls — ${mode}`, () => {
    test("typography: sans/serif/mono stacks and tracking change computed styles immediately; invalid drafts are inert", async ({ page }, testInfo) => {
      await openWorkbench(page, mode)
      await previewFrame(page).locator("html").evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true))
      await editorCategory(page, "Typography")
      await expect(page.getByRole("button", { name: /^Apply/ })).toHaveCount(0)
      await expectNoSeriousViolations(page, `${mode}-typography`, testInfo)
      await expectContained(page)

      for (const [label, testId, name] of [
        ["Sans font", "type-sans", "Lato"],
        ["Serif font", "type-serif", "Lora"],
        ["Mono font", "type-mono", "Geist Mono"],
      ] as const) {
        const before = await revisionNumber(page)
        await page.getByRole("combobox", { name: label, exact: true }).click()
        await page.getByRole("combobox", { name: `Search ${label}`, exact: true }).fill(name)
        await page.getByRole("option", { name, exact: true }).click()
        await expect(revision(page)).toHaveAttribute("data-revision", String(before + 1))
        await expect.poll(() => previewStyle(page, testId, "fontFamily")).toContain(name)
      }
      // Search text is never a mutation. No match, Escape, and the selected canonical stack remains intact.
      const before = await revisionNumber(page)
      const sans = page.getByRole("combobox", { name: "Sans font", exact: true })
      await sans.click()
      const sansSearch = page.getByRole("combobox", { name: "Search Sans font", exact: true })
      await sansSearch.fill("not-a-local-font")
      await expect(page.getByText("No fonts found.", { exact: true })).toBeVisible()
      await expect(revision(page)).toHaveAttribute("data-revision", String(before))
      await expect.poll(() => previewStyle(page, "type-sans", "fontFamily")).toContain("Lato")
      await sansSearch.press("Escape")
      await expectNoSeriousViolations(page, `${mode}-typography-search`, testInfo)

      // Tracking: numeric field, visible unit, keyboard slider.
      await expect(page.getByTestId("tracking-unit")).toHaveText("em")
      await setNumber(page, "Letter spacing", "0.05")
      await expect.poll(() => previewStyle(page, null, "letterSpacing")).toBe("0.8px")
      const tracking = slider(page, "Letter spacing")
      await expect(tracking).toHaveAttribute("aria-valuetext", "0.05 em")
      await tracking.focus()
      const beforeKey = await revisionNumber(page)
      await page.keyboard.press("ArrowLeft")
      await expect(revision(page)).toHaveAttribute("data-revision", String(beforeKey + 1))
      await expect(numberField(page, "Letter spacing")).toHaveValue("0.045")
      await expect.poll(() => previewStyle(page, null, "letterSpacing")).toBe("0.72px")
      for (const draft of ["0.3", "abc", "-"]) {
        const at = await revisionNumber(page)
        await numberField(page, "Letter spacing").fill(draft)
        await expect(page.getByTestId("tracking-error")).toContainText("Not applied")
        await expect(revision(page)).toHaveAttribute("data-revision", String(at))
        expect(await previewStyle(page, null, "letterSpacing")).toBe("0.72px")
      }
      await expectNoSeriousViolations(page, `${mode}-tracking-invalid`, testInfo)
      expect(await previewFrame(page).locator("html").evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
    })

    test("other: radius, spacing, shadow profile, and motion change computed styles immediately; no manual Density control (WSSP-10)", async ({ page }, testInfo) => {
      await openWorkbench(page, mode)
      await previewFrame(page).locator("html").evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true))
      await editorCategory(page, "Other")
      await expect(page.getByRole("button", { name: /^Apply/ })).toHaveCount(0)
      for (const [name, unit] of [["radius", "rem"], ["spacing", "rem"], ["shadowBlur", "px"], ["motion", "ms"]] as const) {
        await expect(page.getByTestId(`${name}-unit`)).toHaveText(unit)
      }
      await expectNoSeriousViolations(page, `${mode}-other`, testInfo)
      await expectContained(page)

      await setNumber(page, "Radius", "0.5")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("6px")
      expect(await previewVar(page, "--radius")).toBe("0.5rem")

      await setNumber(page, "Spacing", "0.3")
      await expect.poll(() => previewStyle(page, "elevation-sample", "paddingLeft")).toBe("14.4px")
      // Density stays canonical and programmatic (proposals and design commands) but has no manual control.
      await expect(page.getByTestId("control-density")).toHaveCount(0)
      await expect(page.getByRole("textbox", { name: "Density" })).toHaveCount(0)
      await expect(page.getByRole("slider", { name: "Density" })).toHaveCount(0)
      await expect(page.locator(".quiet-editor").getByText("Density", { exact: true })).toHaveCount(0)

      // Tailwind prefixes four transparent ring/inset layers to every box-shadow; compare only the theme's layers.
      const shadow = async () => (await previewStyle(page, "elevation-sample", "boxShadow")).replaceAll("rgba(0, 0, 0, 0) 0px 0px 0px 0px, ", "")
      expect(await shadow()).toBe("oklch(0 0 0 / 0.1) 0px 1px 3px 0px, oklch(0 0 0 / 0.1) 0px 2px 4px -1px")
      await setNumber(page, "Shadow blur", "10")
      await expect.poll(shadow).toBe("oklch(0 0 0 / 0.1) 0px 1px 10px 0px, oklch(0 0 0 / 0.1) 0px 2px 4px -1px")
      await setNumber(page, "Shadow spread", "2")
      await setNumber(page, "Shadow offset X", "4")
      await setNumber(page, "Shadow offset Y", "5")
      await setNumber(page, "Shadow opacity", "0.3")
      await expect.poll(shadow).toBe("oklch(0 0 0 / 0.3) 4px 5px 10px 2px, oklch(0 0 0 / 0.3) 4px 2px 4px 1px")
      const beforeColor = await revisionNumber(page)
      await page.getByLabel("Shadow color").fill("#ff0000")
      await expect(revision(page)).toHaveAttribute("data-revision", String(beforeColor + 1))
      await expect(page.getByTestId("shadow-color-canonical")).toContainText("oklch(0.627955 0.257683 29.23388)")
      // The stored value is exact (checked above); the browser re-serializes hue to its own precision.
      await expect.poll(shadow).toMatch(/^oklch\(0\.627955 0\.257683 29\.23\d* \/ 0\.3\) 4px 5px 10px 2px, /)
      await page.getByLabel("Shadow color").fill("rgba(0, 0, 0, 0.5)")
      await expect(page.getByTestId("shadow-color-error")).toContainText("mutation.invalid-value at operations[0].value.color")
      await expect(revision(page)).toHaveAttribute("data-revision", String(beforeColor + 1))
      await page.getByLabel("Shadow color").fill("hsl(0 0% 0%)")
      await expect.poll(shadow).toContain("oklch(0 0 0 / 0.3) 4px 5px 10px 2px")

      await setNumber(page, "Base motion duration", "320")
      await expect.poll(() => buttonMotion(page)).toBe("0.32s")

      // Invalid numeric draft: local only, visible, section forced open, preview unchanged.
      const at = await revisionNumber(page)
      await numberField(page, "Radius").fill("9")
      await expect(page.getByTestId("radius-error")).toContainText("Enter a number from 0 rem to 2.5 rem. Not applied.")
      await expect(numberField(page, "Radius")).toHaveAttribute("aria-invalid", "true")
      await expect(revision(page)).toHaveAttribute("data-revision", String(at))
      expect(await previewStyle(page, "elevation-sample", "borderRadius")).toBe("6px")
      await expect(slider(page, "Radius")).toHaveAttribute("aria-valuenow", "0.5")
      await page.getByRole("button", { name: "Radius", exact: true }).click()
      await expect(page.getByRole("button", { name: "Radius", exact: true })).toHaveAttribute("aria-expanded", "true")
      await expectNoSeriousViolations(page, `${mode}-radius-invalid`, testInfo)
      await numberField(page, "Radius").fill("0.75")
      await expect(page.getByTestId("radius-error")).toHaveCount(0)
      await expect(revision(page)).toHaveAttribute("data-revision", String(at + 1))
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("10px")

      // A collapsed section hides its controls; expanding restores them.
      await page.getByRole("button", { name: "Motion", exact: true }).click()
      await expect(numberField(page, "Base motion duration")).toHaveCount(0)
      await page.getByRole("button", { name: "Motion", exact: true }).click()
      await expect(numberField(page, "Base motion duration")).toHaveValue("320")

      // Every change landed in the canonical active theme (no baseline-diff panel remains).
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")
      await expect(page.getByTestId("diff-count")).toHaveCount(0)
      expect(await previewFrame(page).locator("html").evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
    })

    test("grouped colour rows: every token once; picker and text enter through setColor, store canonical OKLCH, and theme the chrome (WTEP-03/05/06)", async ({ page }, testInfo) => {
      await openWorkbench(page, mode)
      await editorCategory(page, "Colors")
      // Approved groups, using the existing section/header pattern, each listing its tokens once.
      const groups = { base: ["background", "foreground"], card: ["card", "card-foreground"], popover: ["popover", "popover-foreground"], primary: ["primary", "primary-foreground"], secondary: ["secondary", "secondary-foreground"], muted: ["muted", "muted-foreground"], accent: ["accent", "accent-foreground"], destructive: ["destructive", "destructive-foreground"], border: ["border", "input", "ring"], charts: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] }
      await expect(page.getByRole("tabpanel", { name: "Colors", exact: true }).getByRole("heading", { level: 3 })).toHaveText(["Primary", "Secondary", "Accent", "Base", "Card", "Popover", "Muted", "Destructive", "Border, Input & Ring", "Charts"])
      for (const title of ["Primary", "Secondary", "Accent", "Base", "Card", "Popover", "Muted", "Destructive", "Border, Input & Ring", "Charts"]) {
        await expect(page.getByRole("heading", { level: 3, name: title, exact: true })).toBeVisible()
        await expect(page.getByRole("button", { name: title, exact: true })).toHaveAttribute("aria-expanded", "true")
      }
      await expect(page.locator('.quiet-editor [data-testid^="control-color-"]')).toHaveCount(24)
      for (const [group, tokens] of Object.entries(groups)) {
        const rows = await page.getByTestId(`section-colors-${group}`).locator('[data-testid^="control-color-"]').evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")!.slice("control-color-".length)))
        expect(rows).toEqual(tokens)
        for (const token of tokens) {
          await expect(colorInput(page, token)).toHaveCount(1)
          await expect(page.getByLabel(`${token.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase())} picker`, { exact: true })).toHaveCount(1)
        }
      }
      await expect(page.getByLabel("Token", { exact: true })).toHaveCount(0)
      await expectNoSeriousViolations(page, `${mode}-color-groups`, testInfo)
      await expectContained(page)

      // Text input: every accepted format applies live, is stored as canonical OKLCH, and reaches preview and chrome.
      const chromeVar = (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name)
      const primary = colorInput(page, "primary")
      for (const [input, canonical] of [
        ["#336699", "oklch(0.499314 0.098664 250.433057)"],
        ["rgb(51 102 153)", "oklch(0.499314 0.098664 250.433057)"],
        ["hsl(0 100% 50%)", "oklch(0.627955 0.257683 29.23388)"],
        ["rgba(0, 0, 0, 0.5)", "oklch(0 0 0 / 0.5)"],
        ["oklch(0.4 0.1 150)", "oklch(0.4 0.1 150)"],
      ] as const) {
        await primary.fill(input)
        await expect.poll(() => previewVar(page, "--primary")).toBe(canonical)
        await expect.poll(() => chromeVar("--primary")).toBe(canonical)
      }
      // Leaving the field shows the canonical spelling.
      await primary.fill("#336699")
      await colorInput(page, "primary-foreground").focus()
      await expect(primary).toHaveValue("oklch(0.499314 0.098664 250.433057)")
      await expect(page.getByLabel("Primary picker", { exact: true })).toHaveValue("#336699")

      // Invalid draft: visible, rule-coded, never active; the section cannot collapse over it. The active value is a
      // contrast-safe primary for this mode, so the axe check below measures the product, not a low-contrast edit.
      const safe = mode === "light" ? "oklch(0.4 0.1 150)" : "oklch(0.8 0.1 150)"
      await primary.fill(safe)
      await expect.poll(() => previewVar(page, "--primary")).toBe(safe)
      const at = await revisionNumber(page)
      await primary.fill("oklch(0.7 0.4 150)")
      await expect(page.getByTestId("color-primary-error")).toContainText("mutation.invalid-value at operations[0].value")
      await expect(primary).toHaveAttribute("aria-invalid", "true")
      await expect(revision(page)).toHaveAttribute("data-revision", String(at))
      expect(await previewVar(page, "--primary")).toBe(safe)
      await expect(page.getByTestId("section-colors-primary")).toHaveAttribute("data-has-error", "true")
      await page.getByRole("button", { name: "Primary", exact: true }).click()
      await expect(primary).toHaveValue("oklch(0.7 0.4 150)")
      await expectNoSeriousViolations(page, `${mode}-color-invalid`, testInfo)

      // Native picker: the sRGB pick normalizes through setColor to canonical OKLCH, clears the draft, one revision.
      await page.getByLabel("Primary picker", { exact: true }).fill("#ff0000")
      await expect(revision(page)).toHaveAttribute("data-revision", String(at + 1))
      await expect(page.getByTestId("color-primary-error")).toHaveCount(0)
      await expect(primary).toHaveValue("oklch(0.627955 0.257683 29.23388)")
      await expect.poll(() => previewVar(page, "--primary")).toBe("oklch(0.627955 0.257683 29.23388)")
      await expect.poll(() => chromeVar("--primary")).toBe("oklch(0.627955 0.257683 29.23388)")
      // The chrome receives the active primary token; Save remains the approved theme-neutral ghost action.
      await workspaceMode(page, "Preview")
      expect(await chromeVar("--primary")).toBe("oklch(0.627955 0.257683 29.23388)")
      await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveAttribute("data-variant", "ghost")
      // A translucent token keeps its alpha when picked.
      await editorCategory(page, "Colors")
      await colorInput(page, "border").fill("oklch(0.5 0 0 / 0.4)")
      await page.getByLabel("Border picker", { exact: true }).fill("#336699")
      await expect(colorInput(page, "border")).toHaveValue("oklch(0.499314 0.098664 250.433057 / 0.4)")

      // Export carries the canonical OKLCH values, never picker hex.
      await setColorMode(page, mode)
      const download = page.waitForEvent("download")
      await page.getByRole("button", { name: "Export JSON" }).click()
      const exported = JSON.parse(readFileSync((await (await download).path())!, "utf8"))
      expect(exported.colors[mode].primary.$value).toBe("oklch(0.627955 0.257683 29.23388)")
      expect(exported.colors[mode].border.$value).toBe("oklch(0.499314 0.098664 250.433057 / 0.4)")
    })
  })
}

test("sliders respond to keyboard (Tab, Home, End, Page keys) with visible focus, and to pointer click and drag", async ({ page }, testInfo) => {
  await openWorkbench(page)
  await editorCategory(page, "Other")
  const radius = slider(page, "Radius")
  // WTCP-06 row order is label / slider / input / unit: forward Tab enters the thumb before the input.
  await page.getByTestId("section-radius").getByRole("button", { name: "Radius", exact: true }).focus()
  await page.keyboard.press("Tab")
  await expect(radius).toBeFocused()
  await page.keyboard.press("Tab")
  await expect(numberField(page, "Radius")).toBeFocused()
  await page.keyboard.press("Shift+Tab")
  await expect(radius).toBeFocused()
  expect(await radius.evaluate((el) => el.matches(":focus-visible"))).toBe(true)
  expect(await radius.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none")
  await expectNoSeriousViolations(page, "slider-focused", testInfo)
  await page.keyboard.press("Home")
  await expect(radius).toHaveAttribute("aria-valuenow", "0")
  await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("0px")
  await page.keyboard.press("End")
  await expect(radius).toHaveAttribute("aria-valuenow", "2.5")
  await expect(numberField(page, "Radius")).toHaveValue("2.5")
  await page.keyboard.press("PageDown")
  await expect.poll(async () => Number(await radius.getAttribute("aria-valuenow"))).toBeLessThan(2.5)
  await page.keyboard.press("Home")

  const track = page.getByTestId("control-radius").locator('[data-slot="slider-track"]')
  const box = (await track.boundingBox())!
  const start = await revisionNumber(page)
  await page.mouse.click(box.x + box.width * 0.2, box.y + box.height / 2)
  await expect.poll(async () => Number(await radius.getAttribute("aria-valuenow"))).toBeGreaterThan(0.3)
  await expect.poll(async () => Number(await radius.getAttribute("aria-valuenow"))).toBeLessThan(0.7)
  expect(await revisionNumber(page)).toBeGreaterThan(start)
  const clicked = Number(await radius.getAttribute("aria-valuenow"))
  await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe(`${Math.max(0, clicked - 0.125) * 16}px`)

  const thumb = (await radius.boundingBox())!
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 6 })
  await page.mouse.up()
  await expect.poll(async () => Number(await radius.getAttribute("aria-valuenow"))).toBeGreaterThan(1.8)
  const dragged = Number(await radius.getAttribute("aria-valuenow"))
  await expect(numberField(page, "Radius")).toHaveValue(String(dragged))
  await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe(`${Number(((dragged - 0.125) * 16).toFixed(4))}px`)
})

test.describe("TSV2-13 staged proposals stay authoritative alongside manual editing", () => {
  for (const mode of MODES) {
    test(`manual controls pause while a proposal is staged; Discard and Apply resume them — ${mode}`, async ({ page }, testInfo) => {
      await openWorkbench(page, mode)
      await editorCategory(page, "Other")
      await setNumber(page, "Spacing", "0.3")
      await expect(revision(page)).toHaveAttribute("data-revision", "2")
      const stage = async (id: string, base: number) => {
        await editorCategory(page, "Command")
        await stageCommand(page, [{ op: "setRadiusBase", value: "0.5rem" }])
        await workspaceMode(page, "Preview")
        await expect(page.getByTestId("proposal-staged")).toBeVisible()
      }

      await stage("tsv2-1", 2)
      // The preview shows the candidate; the active theme and its controls do not move.
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("6px")
      await expect(revision(page)).toHaveAttribute("data-revision", "2")
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("3")
      await editorCategory(page, "Other")
      await expect(page.locator('[data-testid="manual-locked-note"]:visible')).toContainText("staged proposal")
      await expect(numberField(page, "Radius")).toBeDisabled()
      await expect(numberField(page, "Radius")).toHaveValue("0.7")
      await expect(slider(page, "Radius")).toHaveAttribute("data-disabled", "")
      await expect(page.getByLabel("Shadow color")).toBeDisabled()
      await editorCategory(page, "Typography")
      await expect(page.getByLabel("Sans font")).toBeDisabled()
      await editorCategory(page, "Colors")
      await expect(colorInput(page, "primary")).toBeDisabled()
      await expect(page.getByLabel("Primary picker", { exact: true })).toBeDisabled()
      // WTEP-04: the candidate is confined to the preview; the Workbench chrome stays on the active theme.
      expect(await previewVar(page, "--radius")).toBe("0.5rem")
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--radius").trim())).toBe("0.7rem")
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "2")
      await expect(page.getByTestId("staged-status")).toContainText("not yet active")
      await expectNoSeriousViolations(page, `${mode}-manual-locked`, testInfo)

      // Discard: nothing applied, controls resume, a manual edit is direct again.
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Discard proposal" }).click()
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("9.2px")
      await editorCategory(page, "Other")
      await expect(page.locator('[data-testid="manual-locked-note"]:visible')).toHaveCount(0)
      await setNumber(page, "Base motion duration", "275")
      await expect(revision(page)).toHaveAttribute("data-revision", "3")

      // Apply: exactly one revision, the applied value shows in the manual controls, which resume.
      await stage("tsv2-2", 3)
      await page.getByRole("button", { name: "Apply proposal" }).click()
      await expect(revision(page)).toHaveAttribute("data-revision", "4")
      await editorCategory(page, "Other")
      await expect(numberField(page, "Radius")).toBeEnabled()
      await expect(numberField(page, "Radius")).toHaveValue("0.5")
      await setNumber(page, "Radius", "0.6")
      await expect(revision(page)).toHaveAttribute("data-revision", "5")
      await expect(page.getByTestId("proposal-result")).toContainText("Applied design-command-2")
    })
  }
})

test("reduced motion: controls stay operable and preview transitions collapse to 0s", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await openWorkbench(page, "dark")
  await expect.poll(() => buttonMotion(page)).toBe("0s")
  await editorCategory(page, "Other")
  await setNumber(page, "Base motion duration", "400")
  await expect.poll(() => buttonMotion(page)).toBe("0s")
  await slider(page, "Radius").focus()
  await page.keyboard.press("ArrowRight")
  await expect(numberField(page, "Radius")).toHaveValue("0.725")
  await expectContained(page)
  await expectNoSeriousViolations(page, "reduced-motion", testInfo)
})
