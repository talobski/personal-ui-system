import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

import { editorCategory, isMobileShell, previewView, saveTheme, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * Theme code, header, shells and selection v1 (PUI-139 to PUI-141): TCHS-03 header tooltips and disabled semantics,
 * TCHS-04 flat App shell frames, TCHS-05 square native selection in embedded inputs across radius. Producer self-checks
 * only; PUI-138's dialog is covered by theme-action-export-dialog.spec.ts.
 */

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const box = async (el: Locator) => (await el.boundingBox())!
const openTooltip = (page: Page) => page.locator('[data-slot="tooltip-content"][data-state$="open"]')

async function open(page: Page) {
  await page.goto("/")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

/**
 * Rests the pointer in the toolbar's empty middle, then glides along the strip above the 32px controls and drops onto
 * the control, as a real pointer does. Gliding across adjacent triggers would enter Radix's hoverable-content grace
 * area of the one just left, which by design defers the next trigger until the pointer leaves that area.
 */
async function hover(page: Page, control: Locator) {
  const toolbar = await box(page.getByTestId("workbench-toolbar"))
  const strip = toolbar.y + 4
  await page.mouse.move(toolbar.x + toolbar.width / 3, toolbar.y + toolbar.height / 2, { steps: 20 })
  await page.mouse.move(toolbar.x + toolbar.width / 3, strip, { steps: 10 })
  await expect(openTooltip(page)).toHaveCount(0)
  const b = await box(control)
  await page.mouse.move(b.x + b.width / 2, strip, { steps: 30 })
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 })
}

test.describe("TCHS-03 header tooltips (PUI-139)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`icon-only controls show concise tooltips by pointer and keyboard; names and disabled states are their own (${mode})`, async ({ page }) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await saveTheme(page, "Tooltip Probe")
      await workspaceMode(page, "Preview")
      const toolbar = page.getByTestId("workbench-toolbar")
      const controls: [Locator, string, string][] = [
        [toolbar.getByRole("button", { name: "Toggle Sidebar", exact: true }), "Toggle Sidebar", "Toggle sidebar"],
        [page.getByTestId("delete-theme"), "Delete theme", "Delete theme"],
        [page.getByRole("switch", { name: "Toggle dark mode", exact: true }), "Toggle dark mode", "Toggle dark mode"],
        [page.getByRole("button", { name: "Undo", exact: true }), "Undo", "Undo"],
        [page.getByRole("button", { name: "Redo", exact: true }), "Redo", "Redo"],
        [page.getByRole("button", { name: "Reset", exact: true }), "Reset", "Reset theme"],
      ]
      // A fresh custom theme has no history: Undo, Redo and Reset stay natively disabled and out of the tab order.
      for (const [control] of controls.slice(3)) await expect(control).toBeDisabled()
      for (const [control, name, label] of controls) {
        await expect(control).toHaveAccessibleName(name)
        await expect(control).not.toHaveAttribute("title")
        await hover(page, control)
        await expect(openTooltip(page)).toHaveText(label)
      }
      // Visible-text actions are not tooltipped.
      for (const name of ["Code", "Save"]) {
        await hover(page, toolbar.getByRole("button", { name, exact: true }))
        await page.waitForTimeout(200)
        await expect(openTooltip(page)).toHaveCount(0)
      }
      // Keyboard: focus exposes the tooltip, Escape dismisses it, and wrappers add no tab stops.
      await page.mouse.move(0, 0)
      await controls[0]![0].focus()
      await expect(openTooltip(page)).toHaveText("Toggle sidebar")
      await page.keyboard.press("Tab")
      await expect(page.getByTestId("delete-theme")).toBeFocused()
      await expect(openTooltip(page)).toHaveText("Delete theme")
      await page.keyboard.press("Escape")
      await expect(openTooltip(page)).toHaveCount(0)
      await page.keyboard.press("Tab")
      await expect(page.getByRole("switch", { name: "Toggle dark mode" })).toBeFocused()
      await page.keyboard.press("Tab")
      await expect(toolbar.getByRole("button", { name: "Code", exact: true })).toBeFocused()
      expect((await box(toolbar)).height).toBe(64)
      expect(await toolbar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    })
  }
})

test.describe("TCHS-04 App shell framing (PUI-140)", () => {
  test("outer frames are flat and bordered, Inset uses the sidebar surface, spacing and labels grow", async ({ page }) => {
    await open(page)
    await previewView(page, "App shells")
    const frame = previewFrame(page)
    const token = (name: string) => frame.locator("body").evaluate((body, n) => { const p = document.createElement("span"); p.style.color = `var(--${n})`; body.append(p); const c = getComputedStyle(p).color; p.remove(); return c }, name)
    const bg = (el: Locator) => el.evaluate(node => { const p = document.createElement("span"); p.style.color = getComputedStyle(node).backgroundColor; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c })
    const shells = frame.locator("[data-app-shell]")
    await expect(shells).toHaveCount(3)
    for (let i = 0; i < 3; i++) {
      const outer = shells.nth(i).locator('[data-slot="sidebar-wrapper"]')
      expect(await outer.evaluate(el => getComputedStyle(el).boxShadow)).toBe("none")
      expect(await outer.evaluate(el => getComputedStyle(el).borderTopWidth)).toBe("1px")
      expect(await shells.nth(i).locator("h2").evaluate(el => getComputedStyle(el).fontSize)).toBe("16px")
    }
    const inset = frame.locator('[data-app-shell="Inset project"]')
    expect(await bg(inset.locator("[data-shell-body]"))).toBe(await token("sidebar"))
    expect(await bg(inset.locator('[data-slot="sidebar"]'))).toBe(await token("sidebar"))
    // The inset content panel keeps its own restrained elevation.
    expect(await inset.locator("[data-shell-inset]").evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none")
    const tabs = await box(frame.getByRole("tablist", { name: "Preview views" }))
    const first = await box(shells.nth(0)), second = await box(shells.nth(1)), third = await box(shells.nth(2))
    expect(Math.round(first.y - (tabs.y + tabs.height))).toBe(32)
    expect(Math.round(second.y - (first.y + first.height))).toBe(48)
    expect(Math.round(third.y - (second.y + second.height))).toBe(48)
    expect(await frame.locator("html").evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
  })
})

test.describe("TCHS-05 selection geometry (PUI-141)", () => {
  test("embedded Quick find and Team chat inputs keep a square native selection at low, medium and high radius", async ({ page }) => {
    test.skip(isMobileShell(page), "one radius sweep suffices; geometry is width-independent")
    await open(page)
    const frame = previewFrame(page)
    const fields = [frame.getByRole("searchbox", { name: "Search commands" }), frame.locator('[data-slot="chat-composer"] input')]
    const colors: string[] = []
    for (const radius of ["0", "0.5", "2.5"]) {
      await editorCategory(page, "Geometry")
      const input = page.getByRole("textbox", { name: "Radius", exact: true })
      await input.fill(radius)
      await input.blur()
      await workspaceMode(page, "Preview")
      await expect.poll(() => frame.locator("html").evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--radius").trim())).toBe(radius === "0" ? "0rem" : `${radius}rem`)
      for (const field of fields) {
        await field.fill("Selection probe")
        await field.focus()
        await field.press("ControlOrMeta+a")
        const s = await field.evaluate(el => { const sel = getComputedStyle(el, "::selection"); return { radius: getComputedStyle(el).borderTopLeftRadius, clip: getComputedStyle(el).overflow, color: `${sel.backgroundColor} ${sel.color}` } })
        // The input clips its text to its own box, so a square box keeps the highlight square.
        expect(s.radius).toBe("0px")
        colors.push(s.color)
        // The visible row still follows the theme radius.
        const row = field.locator("xpath=..")
        const rowRadius = parseFloat(await row.evaluate(el => getComputedStyle(el).borderTopLeftRadius))
        if (radius === "0") expect(rowRadius).toBe(0)
        else expect(rowRadius).toBeGreaterThan(0)
      }
    }
    // Selection colours are unchanged by radius.
    expect(new Set(colors).size).toBe(1)
  })
})
