import AxeBuilder from "@axe-core/playwright"
import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"
import { editorCategory, isMobileShell, setColorMode, sidebarSheet, workspaceMode } from "./workbench-navigation"

// Runs in both projects of playwright.workbench.config.ts (390x844 and 1440x900). No viewport skips.
const box = async (el: Locator) => {
  const bounds = await el.boundingBox()
  expect(bounds).not.toBeNull()
  return bounds!
}
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const style = (el: Locator, property: string) => el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)
const revision = (page: Page) => page.locator("#workbench-active-theme")
const TRANSPARENT_THUMB = "rgba(0, 0, 0, 0)"

/** The sidebar surface: the desktop sidebar container, or the mobile off-canvas sheet. */
const sidebarSurface = (page: Page) => (isMobileShell(page) ? sidebarSheet(page) : page.locator('[data-slot="sidebar-container"]'))

async function settle(page: Page) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === "running").length)).toBe(0)
}

async function axe(page: Page, name: string, info: import("@playwright/test").TestInfo) {
  await settle(page)
  const result = await new AxeBuilder({ page }).analyze()
  await info.attach(`axe-${name}.json`, { body: JSON.stringify(result), contentType: "application/json" })
  expect(await seriousOutsideKnownDebt(page, result.violations, info, name), name).toEqual([])
}

for (const mode of ["light", "dark"] as const) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`WRCP-02/05–12 rendering, geometry, triggers, scrollbars, tabs, controls, axe: ${mode}, ${reducedMotion}`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await page.emulateMedia({ reducedMotion })
      await page.goto("/")
      await setColorMode(page, mode)
      await expect(preview(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")

      // WRCP-02: Tailwind antialiasing on both document roots (type tokens and authored type are frozen by the phase verifier).
      for (const root of [page.locator("html"), preview(page).locator("html")]) {
        await expect(root).toHaveClass(/(?:^| )antialiased(?: |$)/)
        expect(await style(root, "-webkit-font-smoothing")).toBe("antialiased")
      }

      // WRCP-07/08 toolbar: a deterministic 64px flex row with a 16px horizontal inset, contents contained.
      const toolbar = page.getByTestId("workbench-toolbar")
      const toolbarBox = await box(toolbar)
      expect(toolbarBox.height).toBe(64)
      expect(await toolbar.evaluate(el => [getComputedStyle(el).display, getComputedStyle(el).alignItems, getComputedStyle(el).paddingLeft, getComputedStyle(el).paddingRight])).toEqual(["flex", "center", "16px", "16px"])
      close((await box(page.getByRole("button", { name: "Toggle Sidebar" }))).x - toolbarBox.x, 16)
      const save = await box(toolbar.getByRole("button", { name: "Save", exact: true }))
      close(save.x + save.width, toolbarBox.x + toolbarBox.width - 16)
      for (const child of await toolbar.locator(":scope > *").all()) {
        const b = await box(child)
        close(b.y + b.height / 2, toolbarBox.y + toolbarBox.height / 2)
        expect(b.x).toBeGreaterThanOrEqual(toolbarBox.x)
        expect(b.x + b.width).toBeLessThanOrEqual(toolbarBox.x + toolbarBox.width + 1)
      }

      // WCN-10/11 replace preview tabs with compact Select and enlarge sidebar type.
      const previewTabs = preview(page).getByRole("combobox", { name: "Preview views" })
      const previewTabSizes = [await style(previewTabs, "font-size")]
      expect((await box(previewTabs)).height).toBe(32)

      await editorCategory(page, "Colors")
      const surface = sidebarSurface(page)
      const surfaceBox = await box(surface)
      const header = page.locator('[data-slot="sidebar-header"]')
      const headerBox = await box(header)
      expect(headerBox.height).toBe(64)
      expect(await header.evaluate(el => [getComputedStyle(el).display, getComputedStyle(el).alignItems, getComputedStyle(el).paddingLeft, getComputedStyle(el).paddingRight])).toEqual(["flex", "center", "8px", "8px"])
      const themeSelect = page.getByRole("combobox", { name: "Active theme" })
      close((await box(themeSelect)).y + (await box(themeSelect)).height / 2, headerBox.y + headerBox.height / 2)
      expect(await style(themeSelect, "padding-left")).toBe("8px")
      // Selector content, tabs, and editor rows share one 16px inner edge.
      const tablist = page.getByRole("tablist", { name: "Editor categories" })
      close((await box(themeSelect.getByTestId("theme-swatches"))).x - surfaceBox.x, 16)
      close((await box(tablist)).x - surfaceBox.x, 16)
      close((await box(page.getByTestId("control-color-primary"))).x - surfaceBox.x, 16)
      if (!isMobileShell(page)) {
        // Desktop: the sidebar header and preview toolbar bottom edges meet within one device pixel.
        const dpr = await page.evaluate(() => devicePixelRatio)
        close(headerBox.y + headerBox.height, toolbarBox.y + toolbarBox.height, 1 / dpr)
      }

      // WCN-10/11 sidebar Tabs and preview Select use text-sm; sidebar keyboard states remain intact.
      const sidebarTabSizes = await tablist.getByRole("tab").evaluateAll(els => els.map(el => getComputedStyle(el).fontSize))
      expect(new Set([...sidebarTabSizes, ...previewTabSizes])).toEqual(new Set(["14px"]))
      expect((await box(tablist)).height).toBe(36)
      await expect(tablist.getByRole("tab", { name: "Colors", exact: true })).toHaveAttribute("aria-selected", "true")
      await tablist.getByRole("tab", { name: "Colors", exact: true }).focus()
      await page.keyboard.press("ArrowRight")
      await expect(tablist.getByRole("tab", { name: "Typography", exact: true })).toBeFocused()
      await expect(tablist.getByRole("tab", { name: "Typography", exact: true })).toHaveAttribute("aria-selected", "true")

      // WCN supersedes WRCP-06: the Radix viewport owns scrolling; the overlay thumb strengthens without reserving width.
      const content = page.getByRole("region", { name: "Theme editor", exact: true })
      await editorCategory(page, "Colors")
      const thumb = page.getByTestId("editor-scroll").locator('[data-slot="scroll-area-thumb"]')
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2)
      await expect(thumb).toBeAttached()
      // WSTP-10: the shared thumb is a faint semantic neutral at rest and strengthens on region hover/focus.
      const restThumb = await style(thumb, "background-color")
      expect(restThumb).not.toBe(TRANSPARENT_THUMB)
      const rest = await box(content)
      expect(await style(content, "scrollbar-width")).toBe("none")
      expect(await style(content, "overflow-y")).toBe("scroll")
      await content.hover()
      await expect.poll(() => style(thumb, "background-color")).not.toBe(restThumb)
      expect(await box(content)).toEqual(rest)
      await content.focus()
      await page.mouse.move(headerBox.x + headerBox.width / 2, headerBox.y + headerBox.height / 2)
      await expect.poll(() => style(thumb, "background-color")).not.toBe(restThumb)
      const before = await content.evaluate(el => el.scrollTop)
      await content.hover()
      await page.mouse.wheel(0, 400)
      await expect.poll(() => content.evaluate(el => el.scrollTop)).toBeGreaterThan(before)
      await content.evaluate(el => { el.scrollTop = 0 })

      for (const category of ["Colors", "Typography", "Effects", "Command"] as const) {
        await editorCategory(page, category)
        const panel = page.getByRole("tabpanel", { name: category, exact: true })
        // WRCP-05 shared section triggers.
        for (const section of await panel.locator('[data-testid^="section-"]').all()) {
          const trigger = section.getByRole("button").first()
          await expect(trigger).toHaveClass(/(?:^| )bg-muted(?: |$)/)
          await expect(trigger).toHaveClass(/(?:^| )ring-1 ring-border(?: |$)/)
          await expect(trigger).toHaveClass(/(?:^| )hover:bg-muted\/80(?: |$)/)
          // WSPF-05 supersedes text-foreground/75 with the semantic muted pair; no local foreground workaround.
          await expect(trigger).toHaveClass(/(?:^| )text-muted-foreground(?: |$)/)
          await expect(trigger).not.toHaveClass(/accent|bg-muted\/50|ring-border\/50|text-foreground/)
          const s = await trigger.evaluate(el => { const c = getComputedStyle(el); return { pl: c.paddingLeft, pr: c.paddingRight, pt: c.paddingTop, pb: c.paddingBottom, size: parseFloat(c.fontSize), transform: c.textTransform, spacing: parseFloat(c.letterSpacing), radius: parseFloat(c.borderRadius), shadow: c.boxShadow, bg: c.backgroundColor } })
          expect([s.pl, s.pr, s.pt, s.pb]).toEqual(["8px", "8px", "2px", "2px"])
          expect(s.size).toBeLessThan(12)
          expect(s.transform).toBe("uppercase")
          expect(s.spacing).toBeGreaterThan(0)
          expect(s.radius).toBeGreaterThan(0)
          expect(s.shadow).not.toBe("none")
          expect((await box(trigger)).width).toBeLessThan((await box(section)).width)
          await trigger.hover()
          await expect.poll(() => style(trigger, "background-color")).not.toBe(s.bg)
          await page.keyboard.press("Tab")
          await trigger.focus()
          await expect.poll(() => style(trigger, "box-shadow")).toContain("3px")
          await trigger.press("Enter"); await expect(trigger).toHaveAttribute("aria-expanded", "false")
          await trigger.press("Space"); await expect(trigger).toHaveAttribute("aria-expanded", "true")
        }
        // WRCP-10 every editable Workbench control computes to 14px and stays contained.
        for (const control of await panel.locator('input:not([type=color]):not([type=range]):not([aria-hidden=true]), textarea').all()) {
          if (!(await control.isVisible())) continue
          expect(await style(control, "font-size")).toBe("14px")
          const b = await box(control)
          expect(b.x + b.width).toBeLessThanOrEqual(surfaceBox.x + surfaceBox.width - 15)
        }
        expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
        await axe(page, `${category}-${mode}-${reducedMotion}`, info)
        if (reducedMotion === "reduce") {
          for (const chevron of await panel.locator('[data-testid^="section-"] > h3 svg').all()) expect(await style(chevron, "transition-duration")).toBe("0s")
        }
      }
      await info.attach(`editor-${mode}-${reducedMotion}.png`, { body: await page.screenshot(), contentType: "image/png" })

      // WRCP-10 font search and Save As name are Workbench editable controls too.
      await editorCategory(page, "Typography")
      await page.getByTestId("control-font-sans").getByRole("combobox").click()
      const search = page.getByRole("combobox", { name: "Search Sans fonts" })
      await expect(search).toBeVisible()
      expect(await style(search, "font-size")).toBe("14px")
      await search.fill("Lat")
      await expect(page.getByRole("option", { name: "Lato", exact: true })).toBeVisible()
      await page.keyboard.press("Escape")
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Save", exact: true }).click()
      const dialog = page.getByRole("dialog", { name: "Save as a custom theme" })
      await expect(dialog).toBeVisible()
      const name = dialog.getByLabel("Theme name")
      expect(await style(name, "font-size")).toBe("14px")
      await page.keyboard.press("Tab")
      await name.focus()
      await expect.poll(() => style(name, "box-shadow")).toContain("3px")
      await name.fill("")
      await dialog.getByRole("button", { name: "Save theme", exact: true }).click()
      await expect(dialog.getByTestId("save-as-error")).toBeVisible()
      await expect(name).toHaveAttribute("aria-invalid", "true")
      await page.keyboard.press("Escape")
      await expect(dialog).toHaveCount(0)

      // WSPF-09 supersedes WCN-04's native preview document: its root ScrollArea scrolls; the document root never does.
      const doc = preview(page).locator("html")
      const previewViewport = preview(page).getByRole("group", { name: "Preview document", exact: true })
      expect(await style(doc, "scrollbar-width")).toBe("auto")
      expect(await style(doc, "overflow-y")).toBe("hidden")
      const docRest = await box(doc)
      const frame = await box(page.getByTestId("preview-frame"))
      await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2)
      expect(await box(doc)).toEqual(docRest)
      await page.mouse.wheel(0, 400)
      await expect.poll(() => previewViewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
      expect(await doc.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0)
      await previewViewport.evaluate(el => { el.scrollTop = 0 })

      // WCN-11: official Select keeps keyboard selection.
      await previewTabs.focus()
      await expect(previewTabs).toBeFocused()
      await previewTabs.press("Enter")
      await expect(previewTabs).toHaveAttribute("aria-expanded", "true")
      const cardsOption = preview(page).getByRole("option", { name: "Cards", exact: true })
      const statesOption = preview(page).getByRole("option", { name: "States", exact: true })
      await expect(cardsOption).toBeVisible()
      await expect(cardsOption).toBeFocused()
      await page.keyboard.press("End")
      await expect(statesOption).toBeFocused()
      await expect(statesOption).toHaveAttribute("data-highlighted")
      await page.keyboard.press("Enter")
      await expect(previewTabs).toHaveAttribute("aria-expanded", "false")
      await expect(previewTabs).toHaveText("States")
      await expect(previewTabs).toBeFocused()

      // WRCP-11 containment at both viewports.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(await doc.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await axe(page, `preview-${mode}-${reducedMotion}`, info)
      await info.attach(`preview-${mode}-${reducedMotion}.png`, { body: await page.screenshot(), contentType: "image/png" })
    })
  }
}

test("WRCP-03/04 Shadow color reuses the picker/text interaction; approved Other labels; no stored-value helper", async ({ page }, info) => {
  await page.goto("/")
  await editorCategory(page, "Effects")
  const panel = page.getByRole("tabpanel", { name: "Effects", exact: true })
  const shadow = panel.getByTestId("section-shadow")
  const labels = await shadow.locator('[data-slot="field-label"]').allInnerTexts()
  expect(labels.map(label => label.trim())).toEqual(["Shadow color", "Opacity", "Blur", "Spread", "Offset X", "Offset Y"])
  expect((await panel.getByTestId("section-motion").locator('[data-slot="field-label"]').allInnerTexts()).map(l => l.trim())).toEqual(["Duration"])
  for (const old of ["Shadow opacity", "Shadow blur", "Shadow spread", "Shadow offset X", "Shadow offset Y", "Base motion duration", "Stored as"]) {
    await expect(panel.getByText(old, { exact: false })).toHaveCount(0)
  }
  await expect(page.getByTestId("shadow-color-canonical")).toHaveCount(0)

  // Same structure as a Colors-tab row: a native picker beside the canonical text field.
  const colors = await page.getByTestId("control-shadow-color").evaluate(el => el.innerHTML.replace(/shadow-color|Shadow color|value="[^"]*"/g, ""))
  await editorCategory(page, "Colors")
  const primary = await page.getByTestId("control-color-primary").evaluate(el => el.innerHTML.replace(/color-primary|Primary|value="[^"]*"/g, ""))
  expect(colors).toBe(primary)
  await editorCategory(page, "Effects")

  const text = page.getByLabel("Shadow color", { exact: true })
  const picker = page.getByLabel("Shadow color picker", { exact: true })
  const at = Number(await revision(page).getAttribute("data-revision"))
  await picker.fill("#ff0000")
  await expect(revision(page)).toHaveAttribute("data-revision", String(at + 1))
  await expect(text).toHaveValue("oklch(0.627955 0.257683 29.23388)")
  await expect(picker).toHaveValue("#ff0000")
  const elevation = () => preview(page).getByTestId("elevation-sample").evaluate(el => getComputedStyle(el).boxShadow)
  await workspaceMode(page, "Preview")
  await preview(page).getByRole("combobox", { name: "Preview views" }).click()
  await preview(page).getByRole("option", { name: "States", exact: true }).click()
  await expect.poll(elevation).toMatch(/oklch\(0\.627955 0\.257683 29\.23\d* \/ 0\.1\)/)
  await editorCategory(page, "Effects")

  // Keyboard text entry: HEX normalizes to canonical OKLCH; a translucent colour is rejected locally and never applied.
  await text.focus()
  await page.keyboard.press("ControlOrMeta+a")
  await page.keyboard.type("#000000")
  await expect(revision(page)).toHaveAttribute("data-revision", String(at + 2))
  await page.keyboard.press("Tab")
  await expect(text).not.toBeFocused()
  await expect(text).toHaveValue("oklch(0 0 0)")
  await text.fill("rgba(0, 0, 0, 0.5)")
  await expect(page.getByTestId("shadow-color-error")).toContainText("mutation.invalid-value at operations[0].value.color")
  await expect(page.getByTestId("shadow-color-error")).toContainText("opacity is set separately")
  await expect(text).toHaveAttribute("aria-invalid", "true")
  await expect(revision(page)).toHaveAttribute("data-revision", String(at + 2))
  await expect(page.getByRole("button", { name: "Shadow", exact: true })).toHaveAttribute("aria-expanded", "true")
  await text.fill("oklch(0.5 0.1 250)")
  await expect(page.getByTestId("shadow-color-error")).toHaveCount(0)
  await expect(revision(page)).toHaveAttribute("data-revision", String(at + 3))
  await axe(page, "shadow-color", info)
})
