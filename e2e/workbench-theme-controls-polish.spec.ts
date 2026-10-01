import AxeBuilder from "@axe-core/playwright"
import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { expect, test } from "@playwright/test"
import type { Locator } from "@playwright/test"
import { getValidatedTheme } from "../packages/core/src/context/themes"
import { copyThemeCode, editorCategory, setColorMode, workspaceMode } from "./workbench-navigation"

const defaultTheme = getValidatedTheme("default")!

// Lead-owned execution, in both projects of playwright.workbench.config.ts. No viewport skips.
const box = async (el: Locator) => {
  const bounds = await el.boundingBox()
  expect(bounds).not.toBeNull()
  return bounds!
}
const close = (actual: number, expected: number) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1)

for (const mode of ["light", "dark"] as const) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`WTCP-04–08/11 geometry, interaction, axe: ${mode}, ${reducedMotion}`, async ({ page }, info) => {
      test.setTimeout(60_000)
      await page.emulateMedia({ reducedMotion })
      await page.goto("/workbench")
      await setColorMode(page, mode)
      const toolbar = page.getByTestId("workbench-toolbar")
      // WRCP-07/08 supersede the 16px vertical padding: the toolbar is a fixed 64px flex row with 16px horizontal inset.
      expect(await toolbar.evaluate(el => [getComputedStyle(el).paddingTop, getComputedStyle(el).paddingRight, getComputedStyle(el).paddingBottom, getComputedStyle(el).paddingLeft])).toEqual(["0px", "16px", "0px", "16px"])
      const toggle = page.getByRole("button", { name: "Toggle Sidebar" })
      close((await box(toggle)).x - (await box(toolbar)).x, 16)
      for (const name of ["Code", "Save"]) {
        const action = toolbar.getByRole("button", { name, exact: true })
        await expect(action).toHaveAttribute("data-variant", "ghost")
        await expect(action.locator("svg[aria-hidden=true]")).toHaveCount(1)
        await page.keyboard.press("Tab")
        await action.focus()
        await expect(action).toBeFocused()
        await expect.poll(() => action.evaluate(el => getComputedStyle(el).boxShadow)).toContain("3px")
      }
      const exportBox = await box(toolbar.getByRole("button", { name: "Code", exact: true }))
      const saveBox = await box(toolbar.getByRole("button", { name: "Save", exact: true }))
      expect(exportBox.x).toBeLessThan(saveBox.x)
      close(saveBox.x + saveBox.width, (await box(toolbar)).x + (await box(toolbar)).width - 16)
      expect((await copyThemeCode(page, { open: () => toolbar.getByRole("button", { name: "Code", exact: true }).press("Enter") })).filename).toMatch(/\.json$/)
      await toolbar.getByRole("button", { name: "Save", exact: true }).press("Enter")
      await expect(page.getByRole("dialog", { name: "Save as a custom theme" })).toBeVisible()
      await page.keyboard.press("Escape")

      const preview = page.frameLocator('[data-testid="preview-frame"]')
      await expect(preview.getByTestId("preview")).toHaveAttribute("data-ready", "true")
      expect(await preview.getByTestId("preview").evaluate(el => getComputedStyle(el).paddingLeft)).toBe("16px")
      await editorCategory(page, "Effects")
      const header = page.locator('[data-slot="sidebar-header"]')
      // WSPF-04 supersedes the borderless header: exactly one semantic 1px bottom border.
      expect(await header.evaluate(el => getComputedStyle(el).borderBottomWidth)).toBe("1px")
      const themeSelect = page.getByRole("combobox", { name: "Active theme" })
      const headerBox = await box(header)
      // WRCP-08: header px-2 plus selector px-2 resolve the selector content to the same 16px inner edge.
      close((await box(themeSelect)).x - headerBox.x, 8)
      close((await box(themeSelect.getByTestId("theme-swatches"))).x - headerBox.x, 16)
      // PUI-94's fifth tab can scroll the contained category row to reveal Effects in the mobile sheet; the inset is
      // measured from the row's start.
      await page.getByRole("region", { name: "Editor category navigation", exact: true }).evaluate(el => { el.scrollLeft = 0 })
      const tabs = await box(page.getByRole("tablist", { name: "Editor categories" }))
      close(tabs.x - headerBox.x, 16)

      const checkSwatches = async (row: Locator) => {
        const swatches = row.locator("[data-token]")
        expect(await swatches.evaluateAll(els => els.map(el => el.getAttribute("data-token")))).toEqual(["primary", "accent", "secondary", "border"])
        expect(await row.evaluate(el => getComputedStyle(el).gap)).toBe("2px")
        let previousRight: number | undefined
        for (const swatch of await swatches.all()) {
          await expect(swatch).toHaveClass(/h-2\.5 w-2\.5 rounded-sm/)
          await expect(swatch).toHaveClass(/ring-border/)
          const geometry = await box(swatch)
          close(geometry.width, 10); close(geometry.height, 10)
          if (previousRight !== undefined) close(geometry.x - previousRight, 2)
          previousRight = geometry.x + geometry.width
          const token = await swatch.getAttribute("data-token") as keyof typeof defaultTheme.colors.light
          if (await row.getAttribute("data-theme-id") === "default") {
            expect(await swatch.evaluate(el => (el as HTMLElement).style.backgroundColor)).toBe(defaultTheme.colors[mode][token].$value)
          }
          expect(await swatch.evaluate(el => getComputedStyle(el).boxShadow)).not.toBe("none")
        }
      }
      await checkSwatches(themeSelect.getByTestId("theme-swatches"))
      await themeSelect.press("ArrowDown")
      await expect(page.getByRole("option", { name: "Default", exact: true })).toBeVisible()
      for (const option of await page.getByRole("option").all()) await checkSwatches(option.getByTestId("theme-swatches"))
      await page.keyboard.press("Escape")

      for (const category of ["Geometry", "Effects", "Typography", "Colors"] as const) {
        await editorCategory(page, category)
        const panel = page.getByRole("tabpanel", { name: category, exact: true })
        for (const row of await panel.locator('[data-testid$="-row"]').all()) {
          const bounds = await box(row)
          close(bounds.x, tabs.x)
          const children = await row.locator(":scope > *").evaluateAll(els => els.map(el => {
            const r = el.getBoundingClientRect(), s = getComputedStyle(el)
            return { x: r.x, right: r.right, y: r.y + r.height / 2, width: r.width, grow: s.flexGrow, shrink: s.flexShrink }
          }))
          expect(await row.evaluate(el => getComputedStyle(el).display)).toBe("grid")
          // WSTP-12: one shared fixed 5rem (80px) label column; font rows are label + control, numeric rows add the value.
          const fontRow = (await row.getAttribute("data-testid"))!.startsWith("font-")
          expect(children).toHaveLength(fontRow ? 2 : 3)
          for (const index of fontRow ? [0] : [0, 2]) {
            expect(children[index]!.grow).toBe("0"); expect(children[index]!.shrink).toBe("1")
          }
          expect(children[1]!.width).toBeGreaterThan(24)
          close(children[0]!.width, 80)
          if (!fontRow) {
            close(children[2]!.width, 86)
            close((await box(row.getByRole("textbox"))).width, 56); close((await box(row.locator("[data-testid$=-unit]"))).width, 24)
          }
          for (let i = 0; i < children.length; i++) {
            close(children[i]!.y, bounds.y + bounds.height / 2)
            expect(children[i]!.right).toBeLessThanOrEqual(bounds.x + bounds.width + 1)
            if (i > 0) expect(children[i]!.x).toBeGreaterThanOrEqual(children[i - 1]!.right)
          }
        }
        const sections = panel.locator('[data-testid^="section-"]')
        for (const section of await sections.all()) {
          const trigger = section.getByRole("button").first()
          expect((await box(trigger)).width).toBeLessThan((await box(section)).width)
          expect(await section.evaluate(el => getComputedStyle(el).borderTopWidth)).toBe("0px")
          const styles = await trigger.evaluate(el => { const s = getComputedStyle(el); return { border: s.borderWidth, shadow: s.boxShadow, transform: s.textTransform, spacing: s.letterSpacing, bodySpacing: getComputedStyle(document.body).letterSpacing, radius: s.borderRadius } })
          expect(styles.border).toBe("0px"); expect(styles.shadow).toBe("none")
          // NGIP-08 supersedes the local tracking-wide chip: the trigger resolves Body tracking.
          expect(styles.transform).toBe("uppercase"); expect(styles.spacing).toBe(styles.bodySpacing)
          expect(parseFloat(styles.radius)).toBeGreaterThan(0)
          // PUI-120 uses flat Secondary surfaces, preserving compact geometry and focus.
          await expect(trigger).toHaveClass(/(?:^| )bg-secondary(?: |$)/)
          await expect(trigger).toHaveClass(/(?:^| )text-secondary-foreground(?: |$)/)
          await expect(trigger).toHaveAttribute("data-variant", "secondary")
          expect(await section.evaluate(el => getComputedStyle(el).rowGap)).toBe("8px")
          expect(await section.evaluate(el => getComputedStyle(el.parentElement!).rowGap)).toBe("24px")
          await page.keyboard.press("Tab")
          await trigger.focus(); await expect(trigger).toBeFocused()
          await expect.poll(() => trigger.evaluate(el => getComputedStyle(el).boxShadow)).toContain("3px")
          await trigger.press("Enter"); await expect(trigger).toHaveAttribute("aria-expanded", "false")
          await trigger.press("Space"); await expect(trigger).toHaveAttribute("aria-expanded", "true")
          await trigger.click(); await expect(trigger).toHaveAttribute("aria-expanded", "false")
          await trigger.click(); await expect(trigger).toHaveAttribute("aria-expanded", "true")
          if (reducedMotion === "reduce") expect(await trigger.locator("svg").evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0s")
        }
        await page.mouse.move(0, 0)
        await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
        const axe = await new AxeBuilder({ page }).analyze()
        await info.attach(`axe-${category}-${mode}-${reducedMotion}.json`, { body: JSON.stringify(axe), contentType: "application/json" })
        expect(await seriousOutsideKnownDebt(page, axe.violations, info, `${category}-${mode}-${reducedMotion}`)).toEqual([])
        expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      }
      await editorCategory(page, "Geometry")
      const spacing = page.getByRole("slider", { name: "Spacing", exact: true })
      await spacing.focus(); await spacing.press("ArrowRight")
      await expect(page.getByRole("textbox", { name: "Spacing", exact: true })).toHaveValue("0.255")
      const track = await box(page.getByTestId("spacing-row").locator('[data-slot="slider"]'))
      await page.mouse.click(track.x + track.width * 0.7, track.y + track.height / 2)
      expect(Number(await spacing.getAttribute("aria-valuenow"))).toBeGreaterThan(0.3)
      await info.attach(`editor-${mode}-${reducedMotion}.png`, { body: await page.screenshot(), contentType: "image/png" })
      await workspaceMode(page, "Preview")
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    })
  }
}

test("WTCP-09 concise default/custom/catalog states retain accessible exact stacks and persistence (Theme v3 roles)", async ({ page }) => {
  const stackOf = (theme: typeof defaultTheme, target: "heading" | "body" | "mono") => (target === "mono" ? theme.typography.mono : theme.typography[target].font).$value
  await page.goto("/workbench")
  await editorCategory(page, "Typography")
  // NGIP-09: both built-ins use their sans Body stack for Heading, so the Default Heading copy is sans-serif.
  for (const [target, copy] of [["body", "Sans-serif font..."], ["heading", "Sans-serif font..."], ["mono", "Monospace font..."]] as const) {
    const field = page.getByTestId(`control-font-${target}`)
    await expect(field.getByRole("combobox")).toHaveText(copy)
    await expect(field.getByRole("combobox")).toHaveAccessibleDescription(stackOf(defaultTheme, target).join(", "))
    expect(await field.innerText()).not.toContain("Current stack:")
  }
  const custom = structuredClone(defaultTheme)
  custom.id = "custom-fonts"; custom.name = "Custom Fonts"
  custom.typography.heading.font.$value = ["Personal heading", ...custom.typography.heading.font.$value]
  custom.typography.body.font.$value = ["Personal body", ...custom.typography.body.font.$value]
  custom.typography.mono.$value = ["Personal mono", ...custom.typography.mono.$value]
  await page.evaluate(theme => localStorage.setItem("personal-ui-workbench/v1", JSON.stringify({ themes: { [theme.id]: theme }, activeId: theme.id, bases: { [theme.id]: "default" } })), custom)
  await page.reload(); await editorCategory(page, "Typography")
  for (const [target, copy] of [["body", "sans-serif"], ["heading", "sans-serif"], ["mono", "monospace"]] as const) {
    const trigger = page.getByTestId(`control-font-${target}`).getByRole("combobox")
    await expect(trigger).toHaveText(`Custom ${copy} stack`)
    await expect(trigger).toHaveAccessibleDescription(stackOf(custom, target).join(", "))
  }
  const body = page.getByTestId("control-font-body").getByRole("combobox")
  await body.click(); await page.getByRole("option", { name: "Lato", exact: true }).click()
  await expect(body).toHaveText("Lato")
  await workspaceMode(page, "Preview")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await page.reload(); await editorCategory(page, "Typography")
  await expect(page.getByTestId("control-font-body").getByRole("combobox")).toHaveText("Lato")
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!).themes["custom-fonts"])
  expect(saved.typography.heading.font.$value).toEqual(custom.typography.heading.font.$value)
  expect(saved.typography.mono.$value).toEqual(custom.typography.mono.$value)
})
