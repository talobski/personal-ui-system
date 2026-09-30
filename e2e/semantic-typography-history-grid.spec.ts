import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

import { stageCommand } from "./design-command-fixture"
import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { editorCategory, isMobileShell, saveTheme, selectTheme, workspaceMode } from "./workbench-navigation"

/**
 * semantic-typography-history-grid-v1-001 producer definitions (runs under playwright.workbench.config.ts at 390x844
 * and 1440x900). STHG-06/07 semantic typography in Workbench chrome and preview, STHG-09 to STHG-12 session history,
 * recovery toolbar, and lifecycle, and STHG-13/14 the source-ordered composition grid. Every axe run is decoded:
 * serious/critical findings outside the pre-approved Default muted debt must be empty.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const active = (page: Page) => page.locator("#workbench-active-theme")
const revision = async (page: Page) => Number(await active(page).getAttribute("data-revision"))
const status = (page: Page) => page.locator(".quiet-shell")
const history = (page: Page, name: "Undo" | "Redo" | "Reset") => page.getByTestId("history-controls").getByRole("button", { name, exact: true })

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `sthg-${label}`)
  await info.attach(`axe-sthg-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
  // Decoded explicitly: only critical/serious impact is blocking (impact === "critical" || impact === "serious").
  expect(blocking.filter(v => v.impact === "critical" || v.impact === "serious"), label).toEqual([])
}

async function open(page: Page) {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

/** One committed Geometry-tab radius edit through the numeric draft (focus session ends on blur). */
async function setRadius(page: Page, value: string) {
  await editorCategory(page, "Geometry")
  const field = page.getByRole("textbox", { name: "Radius", exact: true })
  await field.fill(value)
  await field.blur()
  await expect(field).toHaveValue(value)
}

const radiusValue = async (page: Page) => {
  await editorCategory(page, "Geometry")
  return page.getByRole("textbox", { name: "Radius", exact: true }).inputValue()
}

test.describe("STHG-09 to STHG-12 manual history and recovery", () => {
  test("toolbar order, disabled states, undo/redo with monotonic revisions, redo truncation, and keyboard operation", async ({ page }, info) => {
    await open(page)
    await workspaceMode(page, "Preview")
    const toolbar = page.getByTestId("workbench-toolbar")
    const names = await toolbar.getByRole("button").evaluateAll(els => els.map(el => el.getAttribute("aria-label") ?? el.textContent!.trim()))
    const at = (name: string) => names.indexOf(name)
    expect(names.slice(at("Undo"), at("Undo") + 5)).toEqual(["Undo", "Redo", "Reset", "Code", "Save"])
    for (const name of ["Undo", "Redo", "Reset"] as const) await expect(history(page, name)).toBeDisabled()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await toolbar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await axe(page, info, "history-clean")

    const r0 = await revision(page)
    await setRadius(page, "0.5")
    await setRadius(page, "1")
    expect(await revision(page)).toBe(r0 + 2)
    await expect(status(page)).toHaveAttribute("data-theme-status", "built-in, edited")
    await workspaceMode(page, "Preview")
    await expect(history(page, "Undo")).toBeEnabled()
    await expect(history(page, "Reset")).toBeEnabled()
    await expect(history(page, "Redo")).toBeDisabled()

    // Keyboard: Tab from the colour-mode switch (PUI-80: now just before the history group) reaches Undo first (the group follows it), then Enter and Space activate it.
    await page.getByRole("switch", { name: "Dark mode" }).focus()
    await page.keyboard.press("Tab")
    await expect(history(page, "Undo")).toBeFocused()
    expect(await history(page, "Undo").evaluate(el => el.matches(":focus-visible"))).toBe(true)
    expect(await history(page, "Undo").evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none")
    await page.keyboard.press("Enter")
    await expect(active(page)).toHaveAttribute("data-revision", String(r0 + 3))
    expect(await radiusValue(page)).toBe("0.5")
    await workspaceMode(page, "Preview")
    await history(page, "Undo").focus()
    await page.keyboard.press("Space")
    await expect(active(page)).toHaveAttribute("data-revision", String(r0 + 4))
    await expect(status(page)).toHaveAttribute("data-theme-status", "built-in")
    await expect(history(page, "Undo")).toBeDisabled()
    await expect(history(page, "Reset")).toBeDisabled()
    await expect(history(page, "Redo")).toBeEnabled()
    await axe(page, info, "history-redo-available")

    await history(page, "Redo").click()
    await expect(active(page)).toHaveAttribute("data-revision", String(r0 + 5))
    expect(await radiusValue(page)).toBe("0.5")
    // A new committed edit after Undo clears Redo.
    await workspaceMode(page, "Preview")
    await expect(history(page, "Redo")).toBeEnabled()
    await setRadius(page, "2")
    await workspaceMode(page, "Preview")
    await expect(history(page, "Redo")).toBeDisabled()
    await expect(active(page)).toHaveAttribute("data-revision", String(r0 + 6))
    // Invalid drafts create no history and no revision.
    await editorCategory(page, "Geometry")
    await page.getByRole("textbox", { name: "Radius", exact: true }).fill("abc")
    await page.getByRole("textbox", { name: "Radius", exact: true }).blur()
    await expect(active(page)).toHaveAttribute("data-revision", String(r0 + 6))
  })

  test("a slider drag is one checkpoint; typing in one focus session is one checkpoint", async ({ page }) => {
    await open(page)
    await editorCategory(page, "Geometry")
    const slider = page.getByRole("slider", { name: "Radius", exact: true })
    const track = page.getByTestId("control-radius").locator('[data-slot="slider-track"]')
    await track.scrollIntoViewIfNeeded()
    const box = (await track.boundingBox())!
    const thumb = (await slider.boundingBox())!
    const r0 = await revision(page)
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2, { steps: 8 })
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 8 })
    await page.mouse.up()
    await expect.poll(async () => Number(await slider.getAttribute("aria-valuenow"))).toBeGreaterThan(1.8)
    // Sixteen intermediate positions, one revision.
    expect(await revision(page)).toBe(r0 + 1)

    const spacing = page.getByRole("textbox", { name: "Spacing", exact: true })
    await spacing.click()
    for (const draft of ["0.3", "0.35", "0.4"]) await spacing.fill(draft)
    await spacing.blur()
    expect(await revision(page)).toBe(r0 + 2)

    await workspaceMode(page, "Preview")
    await history(page, "Undo").click()
    await editorCategory(page, "Geometry")
    await expect(spacing).toHaveValue("0.25")
    await workspaceMode(page, "Preview")
    await history(page, "Undo").click()
    await editorCategory(page, "Geometry")
    await expect(page.getByRole("textbox", { name: "Radius", exact: true })).toHaveValue("0.7")
    await workspaceMode(page, "Preview")
    await expect(history(page, "Undo")).toBeDisabled()
  })

  test("Reset confirms responsively, targets the built-in baseline, and is undoable", async ({ page }, info) => {
    await open(page)
    await setRadius(page, "1.5")
    await workspaceMode(page, "Preview")
    await history(page, "Reset").click()
    const dialog = page.getByRole("dialog", { name: "Reset Default?" })
    await expect(dialog).toBeVisible()
    // The accepted Responsive Dialog/Drawer pattern: a drawer at 640px and below, a dialog above.
    expect(await dialog.getAttribute("data-slot")).toBe(isMobileShell(page) ? "drawer-content" : "dialog-content")
    await expect(dialog).toContainText("built-in Default")
    await axe(page, info, "reset-confirm")
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(status(page)).toHaveAttribute("data-theme-status", "built-in, edited")

    await history(page, "Reset").click()
    const r = await revision(page)
    await page.getByRole("dialog", { name: "Reset Default?" }).getByRole("button", { name: "Reset theme", exact: true }).click()
    await expect(status(page)).toHaveAttribute("data-theme-status", "built-in")
    await expect(active(page)).toHaveAttribute("data-revision", String(r + 1))
    await expect(history(page, "Reset")).toBeDisabled()
    // PUI-115 replaces the inline notice with a floating toast offering the same Undo; toolbar Undo is unchanged.
    await expect(page.getByTestId("notice")).toHaveCount(0)
    await expect(page.getByTestId("reset-toast")).toContainText("Reset to Default")
    await expect(page.getByTestId("reset-toast").getByRole("button", { name: "Undo", exact: true })).toBeVisible()
    await history(page, "Undo").click()
    await expect(status(page)).toHaveAttribute("data-theme-status", "built-in, edited")
    expect(await radiusValue(page)).toBe("1.5")
    await expect(active(page)).toHaveAttribute("data-revision", String(r + 2))
  })

  test("STHG-11 switching keeps per-theme working state and history; Save As starts clean and restores the built-in; Save re-baselines; reload clears", async ({ page }) => {
    await open(page)
    await setRadius(page, "0.5")
    await selectTheme(page, "quiet-editorial")
    await workspaceMode(page, "Preview")
    await expect(history(page, "Undo")).toBeDisabled()
    await setRadius(page, "1.25")
    await selectTheme(page, "default")
    expect(await radiusValue(page)).toBe("0.5")
    await expect(status(page)).toHaveAttribute("data-theme-status", "built-in, edited")
    await workspaceMode(page, "Preview")
    await expect(history(page, "Undo")).toBeEnabled()
    await selectTheme(page, "quiet-editorial")
    expect(await radiusValue(page)).toBe("1.25")
    await selectTheme(page, "default")

    // Save As: the copy is selected with a clean track; Default is restored to its immutable fixture.
    await saveTheme(page, "History Copy")
    await expect(active(page)).toHaveAttribute("data-theme-id", "history-copy")
    await expect(status(page)).toHaveAttribute("data-theme-status", "custom, saved")
    await workspaceMode(page, "Preview")
    await expect(history(page, "Undo")).toBeDisabled()
    expect(await radiusValue(page)).toBe("0.5")
    await selectTheme(page, "default")
    await expect(status(page)).toHaveAttribute("data-theme-status", "built-in")
    expect(await radiusValue(page)).toBe("0.7")
    await workspaceMode(page, "Preview")
    await expect(history(page, "Undo")).toBeDisabled()

    // Custom Save re-baselines without clearing history; Undo after Save makes it dirty again.
    await selectTheme(page, "history-copy")
    await setRadius(page, "2")
    await expect(status(page)).toHaveAttribute("data-theme-status", "custom, unsaved changes")
    await saveTheme(page)
    await expect(status(page)).toHaveAttribute("data-theme-status", "custom, saved")
    await expect(history(page, "Undo")).toBeEnabled()
    await expect(history(page, "Reset")).toBeDisabled()
    await history(page, "Undo").click()
    await expect(status(page)).toHaveAttribute("data-theme-status", "custom, unsaved changes")
    // Reset of a custom theme returns to its last saved snapshot (2), not the built-in.
    await history(page, "Reset").click()
    await page.getByRole("dialog", { name: "Reset History Copy?" }).getByRole("button", { name: "Reset theme", exact: true }).click()
    expect(await radiusValue(page)).toBe("2")

    // Reload clears all session history.
    await page.reload()
    await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
    await workspaceMode(page, "Preview")
    for (const name of ["Undo", "Redo", "Reset"] as const) await expect(history(page, name)).toBeDisabled()
  })

  test("Design Command: staging locks recovery, Discard creates no history, Apply is one undoable checkpoint", async ({ page }, info) => {
    await open(page)
    const operations = [{ op: "setRadius", value: "1rem" }, { op: "setFontFamily", target: "heading", value: ["Newsreader Variable", "Newsreader", "ui-serif", "Georgia", "serif"] }, { op: "setDensity", value: 1.3 }]
    await stageCommand(page, operations)
    await workspaceMode(page, "Preview")
    await expect(page.getByTestId("proposal-staged")).toBeVisible()
    for (const name of ["Undo", "Redo", "Reset"] as const) await expect(history(page, name)).toBeDisabled()
    await axe(page, info, "history-staged")
    await page.getByRole("button", { name: "Discard proposal" }).click()
    await expect(history(page, "Undo")).toBeDisabled()

    const r = await revision(page)
    await stageCommand(page, operations)
    await workspaceMode(page, "Preview")
    await page.getByRole("button", { name: "Apply proposal" }).click()
    await expect(active(page)).toHaveAttribute("data-revision", String(r + 1))
    await expect(history(page, "Undo")).toBeEnabled()
    await expect.poll(() => previewFrame(page).getByTestId("preview").getAttribute("data-revision")).toBe(String(r + 1))
    await history(page, "Undo").click()
    await expect(active(page)).toHaveAttribute("data-revision", String(r + 2))
    await expect(status(page)).toHaveAttribute("data-theme-status", "built-in")
    await expect(history(page, "Undo")).toBeDisabled()
    await expect(history(page, "Redo")).toBeEnabled()
  })
})

test.describe("STHG-06/07 semantic roles reach Workbench chrome and the preview", () => {
  test("Body restyles Workbench controls and preview text; Heading restyles section headings and card titles; code keeps Mono", async ({ page }, info) => {
    await open(page)
    const frame = previewFrame(page)
    await editorCategory(page, "Typography")
    const choose = async (role: "Heading" | "Body", name: string) => {
      await page.getByRole("combobox", { name: `${role} Font`, exact: true }).click()
      await page.getByRole("combobox", { name: `Search ${role} fonts`, exact: true }).fill(name)
      await page.getByRole("option", { name, exact: true }).click()
    }
    await choose("Body", "Manrope")
    await choose("Heading", "Playfair Display")
    const family = (locator: ReturnType<Page["locator"]>) => locator.evaluate(el => getComputedStyle(el).fontFamily)
    await expect.poll(() => family(page.getByRole("combobox", { name: "Body Font", exact: true }))).toContain("Manrope")
    // NGIP-08 supersedes the section-label Heading opt-in: shared collapsible triggers are Workbench chrome and use Body.
    await expect.poll(() => family(page.getByTestId("section-type-heading").locator("h3 button"))).toContain("Manrope")
    expect(await family(page.getByTestId("section-type-heading").locator("h3 button"))).not.toContain("Playfair Display")
    await workspaceMode(page, "Preview")
    // PUI-80 removed the visible "Dark mode" label; the toolbar's remaining visible chrome text (Export) carries Body.
    await expect.poll(() => family(page.getByTestId("workbench-toolbar").getByRole("button", { name: "Code", exact: true }).locator("span"))).toContain("Manrope")
    const title = frame.locator('[data-composition="plan-usage"] h2')
    await expect.poll(() => family(title)).toContain("Playfair Display")
    // PUI-103 removed Recent activity's subtitle; its activity rows carry the Body role instead.
    await expect.poll(() => family(frame.locator('[data-composition="recent-activity"] li p').first())).toContain("Manrope")
    // Component-owned size survives role adoption: the title keeps its text-lg size.
    expect(await title.evaluate(el => getComputedStyle(el).fontSize)).toBe("18px")
    await expect.poll(() => family(frame.locator('[data-composition="plan-usage"] h2'))).not.toContain("Manrope")
    await axe(page, info, "semantic-roles")
  })
})

// STHG-13/14's flat global grid is superseded by PUI-65. Its order, natural-height, containment, focus-order, and axe
// coverage now runs against the nested gallery regions in workbench-nested-gallery-interaction-polish.spec.ts.
