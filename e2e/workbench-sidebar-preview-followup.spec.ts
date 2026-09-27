import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Locator, Page } from "@playwright/test"
import { getValidatedTheme } from "../packages/core/src/context/themes"
import { KNOWN_DEFAULT_MUTED_DEBT, seriousOutsideKnownDebt } from "./known-contrast-debt"
import { colorInput, editorCategory, expectEditorContainment, isMobileShell, previewView, setColorMode, workspaceMode } from "./workbench-navigation"

// Runs in both projects of playwright.workbench.config.ts (390x844 and 1440x900). No viewport skips.
const TRANSPARENT = "rgba(0, 0, 0, 0)"
const defaultTheme = getValidatedTheme("default")!
const box = async (el: Locator) => {
  const bounds = await el.boundingBox()
  expect(bounds).not.toBeNull()
  return bounds!
}
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
const css = (el: Locator, property: string) => el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)
const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

/** Resolves a semantic token (or any colour expression) through the renderer of the document that owns `scope`. */
const resolve = (scope: Locator, value: string, property: "color" | "background-color" | "border-radius" = "color") =>
  scope.evaluate((el, [v, p]) => {
    const probe = el.ownerDocument.createElement("span")
    probe.style.setProperty(p!, p === "border-radius" ? v! : v!.startsWith("var(") || v!.includes("(") ? v! : `var(--${v})`)
    // Keep the probe inside the themed scope so inherited Workbench variables resolve.
    el.append(probe)
    const result = getComputedStyle(probe).getPropertyValue(p!)
    probe.remove()
    return result
  }, [value, property] as const)

const renderedRgba = (scope: Locator, value: string, property: "color" | "background-color" = "color") =>
  scope.evaluate((el, [v, p]) => {
    const probe = el.ownerDocument.createElement("span")
    probe.style.setProperty(p!, v!.startsWith("var(") || v!.includes("(") ? v! : `var(--${v})`)
    el.append(probe)
    const computed = getComputedStyle(probe).getPropertyValue(p!)
    const canvas = el.ownerDocument.createElement("canvas")
    canvas.width = 1; canvas.height = 1
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = computed; ctx.fillRect(0, 0, 1, 1)
    const result = Array.from(ctx.getImageData(0, 0, 1, 1).data)
    probe.remove()
    return result
  }, [value, property] as const)

const computedRgba = (scope: Locator, property: "color" | "background-color") =>
  scope.evaluate((el, p) => {
    const canvas = el.ownerDocument.createElement("canvas")
    canvas.width = 1; canvas.height = 1
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(el).getPropertyValue(p); ctx.fillRect(0, 0, 1, 1)
    return Array.from(ctx.getImageData(0, 0, 1, 1).data)
  }, property)

/** WCAG contrast of an element's computed foreground over its computed (opaque) background, via the renderer's sRGB. */
const contrast = (el: Locator) => el.evaluate(node => {
  const s = getComputedStyle(node)
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!
  const srgb = (color: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)) }
  const hex = (rgb: number[]) => "#" + rgb.map(c => c.toString(16).padStart(2, "0")).join("")
  const lum = (rgb: number[]) => rgb.map(c => c / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((sum, c, i) => sum + [0.2126, 0.7152, 0.0722][i]! * c, 0)
  const fg = srgb(s.color), bg = srgb(s.backgroundColor)
  const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x)
  return { fg: hex(fg), bg: hex(bg), ratio: (a! + 0.05) / (b! + 0.05), fontSize: s.fontSize, fontWeight: s.fontWeight }
})

async function settle(page: Page) {
  await page.mouse.move(0, 0)
  await expect.poll(async () => (await page.evaluate(() => document.getAnimations().filter(a => a.playState === "running").length))
    + (await previewFrame(page).locator("html").evaluate(() => document.getAnimations().filter(a => a.playState === "running").length))).toBe(0)
}

const previewDocument = (frame: FrameLocator) => frame.getByRole("group", { name: "Preview document", exact: true })

for (const mode of ["light", "dark"] as const) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`WSPF-02–08/10 sidebar navigation, header, triggers, contrast record, preview Select and spacing: ${mode}, ${reducedMotion}`, async ({ page }, info) => {
      test.setTimeout(120_000)
      await page.emulateMedia({ reducedMotion })
      await page.goto("/")
      await setColorMode(page, mode)
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
      await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "default")
      await editorCategory(page, "Colors")

      // WSPF-02: the horizontal owner spans the sidebar editor; the 16px inset is scrollable content, not viewport width.
      const editor = page.locator(".quiet-editor")
      const editorBox = await box(editor)
      const nav = page.getByRole("region", { name: "Editor category navigation", exact: true })
      const navRoot = nav.locator("xpath=..")
      await expect(navRoot).toHaveAttribute("data-slot", "scroll-area")
      const rootBox = await box(navRoot), navBox = await box(nav)
      close(rootBox.x, editorBox.x); close(rootBox.x + rootBox.width, editorBox.x + editorBox.width)
      close(navBox.x, editorBox.x); close(navBox.width, editorBox.width)
      expect([await css(nav, "overflow-x"), await css(nav, "overflow-y")]).toEqual(["scroll", "hidden"])
      const inset = page.getByTestId("category-inset")
      expect(await inset.evaluate(el => { const s = getComputedStyle(el); return [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft] })).toEqual(["16px", "16px", "16px", "16px"])
      const tablist = page.getByRole("tablist", { name: "Editor categories" })
      close((await box(tablist)).x - editorBox.x, 16)
      close((await box(page.getByTestId("control-color-primary"))).x - editorBox.x, 16)
      // Scrolled fully, the trailing 16px inset scrolls into view with the content.
      const extent = await nav.evaluate(el => { el.scrollLeft = el.scrollWidth; return { left: el.scrollLeft, max: el.scrollWidth - el.clientWidth } })
      expect(extent.left).toBe(extent.max)
      const last = await box(tablist.getByRole("tab", { name: "Command", exact: true }))
      if (extent.max > 0) close(navBox.x + navBox.width - (last.x + last.width), 16)
      await nav.evaluate(el => { el.scrollLeft = 0 })
      // Only the category row scrolls horizontally: the editor, sidebar and document never do.
      expect(await editor.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      const editorViewport = page.getByRole("region", { name: "Theme editor", exact: true })
      expect(await css(editorViewport, "overflow-y")).toBe("scroll")
      expect(await editorViewport.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      expect(await editor.locator('[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]').evaluateAll(bars => bars.every(bar => bar.closest('[data-slot="scroll-area"]')?.querySelector('[aria-label="Editor category navigation"]') != null))).toBe(true)
      await expectEditorContainment(page)

      // WSPF-03 (WSTP-13 px-2): transparent padding-free list; content-width px-2 triggers with semantic active/inactive states.
      expect(await tablist.evaluate(el => { const s = getComputedStyle(el); return [s.backgroundColor, s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft, s.flexWrap, s.height] })).toEqual([TRANSPARENT, "0px", "0px", "0px", "0px", "nowrap", "36px"])
      const radiusMd = await resolve(tablist, defaultTheme.radius.md.$value, "border-radius")
      const tokens = { secondary: await renderedRgba(tablist, "secondary", "background-color"), secondaryForeground: await renderedRgba(tablist, "secondary-foreground"), muted: await renderedRgba(tablist, "muted-foreground") }
      const tabs = tablist.getByRole("tab")
      const tabHeights = new Set<number>()
      for (const tab of await tabs.all()) {
        const s = await tab.evaluate(el => { const c = getComputedStyle(el); return { grow: c.flexGrow, shrink: c.flexShrink, wrap: c.whiteSpace, pl: c.paddingLeft, pr: c.paddingRight, pt: c.paddingTop, pb: c.paddingBottom, cursor: c.cursor, size: c.fontSize, weight: c.fontWeight, radius: c.borderRadius, bg: c.backgroundColor, color: c.color, shadow: c.boxShadow } })
        expect([s.grow, s.shrink, s.wrap, s.pl, s.pr, s.pt, s.pb, s.cursor, s.size, s.weight, s.radius]).toEqual(["0", "0", "nowrap", "8px", "8px", "4px", "4px", "pointer", "14px", "500", radiusMd])
        tabHeights.add((await box(tab)).height)
        if ((await tab.getAttribute("aria-selected")) === "true") {
          expect(await computedRgba(tab, "background-color")).toEqual(tokens.secondary)
          expect(await computedRgba(tab, "color")).toEqual(tokens.secondaryForeground)
          expect(s.shadow).toBe("none")
        } else {
          expect(s.bg).toBe(TRANSPARENT)
          expect(await computedRgba(tab, "color")).toEqual(tokens.muted)
        }
      }
      // The accepted trigger height: the former 3px-padded 36px list, less 1px.
      expect([...tabHeights]).toEqual([29])
      const inactive = tablist.getByRole("tab", { name: "Effects", exact: true })
      const restColor = await css(inactive, "color")
      await inactive.hover()
      await expect.poll(() => css(inactive, "color")).not.toBe(restColor)
      expect(await css(inactive, "background-color")).toBe(TRANSPARENT)
      await page.mouse.move(0, 0)
      await expect.poll(() => css(inactive, "color")).toBe(restColor)
      // Keyboard, ARIA and focus stay primitive-owned.
      await tablist.getByRole("tab", { name: "Colors", exact: true }).focus()
      await page.keyboard.press("ArrowRight")
      const typography = tablist.getByRole("tab", { name: "Typography", exact: true })
      await expect(typography).toBeFocused()
      await expect(typography).toHaveAttribute("aria-selected", "true")
      await expect(page.getByRole("tabpanel", { name: "Typography", exact: true })).toBeVisible()
      await expect.poll(() => css(typography, "box-shadow")).toContain("3px")
      await page.keyboard.press("End")
      await expect(tablist.getByRole("tab", { name: "Command", exact: true })).toBeFocused()
      await expect(tablist.getByRole("tab", { name: "Command", exact: true })).toBeInViewport()
      await page.keyboard.press("Home")
      await expect(tablist.getByRole("tab", { name: "Colors", exact: true })).toHaveAttribute("aria-selected", "true")

      // WSPF-04: the 64px header gains only a semantic bottom border.
      const header = page.locator('[data-slot="sidebar-header"]')
      const headerBox = await box(header)
      expect(headerBox.height).toBe(64)
      expect(await header.evaluate(el => { const s = getComputedStyle(el); return [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth, s.borderBottomStyle, s.boxShadow, s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft, s.alignItems] })).toEqual(["0px", "0px", "1px", "0px", "solid", "none", "0px", "8px", "0px", "8px", "center"])
      expect(await css(header, "border-bottom-color")).toBe(await resolve(header, "border"))
      close((await box(page.getByRole("combobox", { name: "Active theme" }))).y + (await box(page.getByRole("combobox", { name: "Active theme" }))).height / 2, headerBox.y + headerBox.height / 2)
      if (!isMobileShell(page)) {
        const toolbarBox = await box(page.getByTestId("workbench-toolbar"))
        close(headerBox.y + headerBox.height, toolbarBox.y + toolbarBox.height, 1 / (await page.evaluate(() => devicePixelRatio)))
      }

      // WSPF-05: every shared ControlSection trigger uses the semantic muted pair and compact geometry.
      const radiusSm = await resolve(header, defaultTheme.radius.sm.$value, "border-radius")
      const pair = { bg: await resolve(header, "muted", "background-color"), fg: await resolve(header, "muted-foreground") }
      const measurements: { category: string; section: string; fg: string; bg: string; ratio: number; fontSize: string }[] = []
      for (const category of ["Colors", "Typography", "Effects"] as const) {
        await editorCategory(page, category)
        const panel = page.getByRole("tabpanel", { name: category, exact: true })
        for (const section of await panel.locator('[data-testid^="section-"]').all()) {
          const trigger = section.locator(":scope > h3 > button")
          await trigger.scrollIntoViewIfNeeded()
          await page.mouse.move(0, 0)
          await expect.poll(() => css(trigger, "background-color")).toBe(pair.bg)
          const s = await trigger.evaluate(el => { const c = getComputedStyle(el); return { color: c.color, pl: c.paddingLeft, pr: c.paddingRight, pt: c.paddingTop, pb: c.paddingBottom, transform: c.textTransform, spacing: c.letterSpacing, bodySpacing: getComputedStyle(document.body).letterSpacing, size: parseFloat(c.fontSize), radius: c.borderRadius, ring: c.boxShadow } })
          expect(s.color).toBe(pair.fg)
          expect([s.pl, s.pr, s.pt, s.pb, s.transform, s.radius]).toEqual(["8px", "8px", "2px", "2px", "uppercase", radiusSm])
          expect(s.spacing).toBe(s.bodySpacing); expect(s.size).toBeLessThan(12) // NGIP-08: Body tracking
          expect(s.ring).toMatch(/0px 0px 0px 1px/)
          expect((await box(trigger)).width).toBeLessThan((await box(section)).width)
          const chevron = trigger.locator("svg")
          expect(await chevron.evaluate(el => { const r = el.getBoundingClientRect(); return [r.width, r.height] })).toEqual([12, 12])
          measurements.push({ category, section: (await section.getAttribute("data-testid"))!, ...(await contrast(trigger)) })
          // Hover changes only the fill (bg-muted/80); the foreground stays muted-foreground.
          await trigger.hover()
          await expect.poll(() => css(trigger, "background-color")).not.toBe(pair.bg)
          expect(await css(trigger, "color")).toBe(pair.fg)
          await trigger.focus()
          await trigger.press("Enter"); await expect(trigger).toHaveAttribute("aria-expanded", "false")
          // Tailwind v4 rotate-180 sets the individual rotate property.
          await expect.poll(() => css(chevron, "rotate")).toBe("none")
          await trigger.press("Space"); await expect(trigger).toHaveAttribute("aria-expanded", "true")
          await expect.poll(() => css(chevron, "rotate")).toBe("180deg")
          if (reducedMotion === "reduce") expect(await css(chevron, "transition-duration")).toBe("0s")
        }
      }
      // WSPF-06: measured and recorded, never hidden. Default light is the one known pairing (~4.35:1); dark passes.
      await info.attach(`wspf-06-contrast-${mode}-${reducedMotion}.json`, { body: JSON.stringify({ theme: "default", mode, known: KNOWN_DEFAULT_MUTED_DEBT, measurements }, null, 2), contentType: "application/json" })
      expect(measurements.length).toBeGreaterThanOrEqual(15)
      for (const m of measurements) {
        if (mode === "light") {
          expect([m.fg, m.bg]).toEqual([KNOWN_DEFAULT_MUTED_DEBT.fgColor, KNOWN_DEFAULT_MUTED_DEBT.bgColor])
          expect(m.ratio).toBeGreaterThan(KNOWN_DEFAULT_MUTED_DEBT.minRatio)
          expect(m.ratio).toBeLessThan(KNOWN_DEFAULT_MUTED_DEBT.maxRatio)
        } else expect(m.ratio).toBeGreaterThanOrEqual(4.5)
      }
      await editorCategory(page, "Colors")
      await settle(page)
      const axeControls = await new AxeBuilder({ page }).analyze()
      await info.attach(`axe-wspf-controls-${mode}-${reducedMotion}.json`, { body: JSON.stringify(axeControls), contentType: "application/json" })
      const debtNodes = axeControls.violations.filter(v => v.id === "color-contrast").flatMap(v => v.nodes).filter(n => (n.any[0]?.data as { fgColor?: string } | undefined)?.fgColor === KNOWN_DEFAULT_MUTED_DEBT.fgColor && (n.any[0]?.data as { bgColor?: string } | undefined)?.bgColor === KNOWN_DEFAULT_MUTED_DEBT.bgColor)
      // The exception is present exactly when the pairing is rendered, so it can never silently widen or vanish.
      if (mode === "light") expect(debtNodes.length).toBeGreaterThan(0)
      else expect(debtNodes).toEqual([])
      expect(await seriousOutsideKnownDebt(page, axeControls.violations, info, `wspf-controls-${mode}-${reducedMotion}`)).toEqual([])

      // NGIP-07 supersedes WSPF-07: Cards / States are left-aligned official Tabs styled exactly like the sidebar tabs.
      const sidebarTrigger = (name: string) => page.getByRole("tablist", { name: "Editor categories" }).getByRole("tab", { name, exact: true })
      const triggerStyle = (el: Locator) => el.evaluate(node => {
        const c = getComputedStyle(node), r = node.getBoundingClientRect()
        return { bg: c.backgroundColor, color: c.color, font: [c.fontFamily, c.fontSize, c.fontWeight, c.letterSpacing], padding: [c.paddingLeft, c.paddingRight], radius: c.borderTopLeftRadius, shadow: c.boxShadow, cursor: c.cursor, height: Math.round(r.height) }
      })
      const sidebarStyles = isMobileShell(page) ? null : { active: await triggerStyle(sidebarTrigger("Colors")), inactive: await triggerStyle(sidebarTrigger("Typography")) }
      await workspaceMode(page, "Preview")
      const frame = previewFrame(page)
      const main = frame.getByTestId("preview")
      const view = frame.getByRole("tablist", { name: "Preview views" })
      const cards = view.getByRole("tab", { name: "Cards", exact: true }), states = view.getByRole("tab", { name: "States", exact: true })
      await settle(page)
      await expect(cards).toHaveAttribute("aria-selected", "true")
      await expect(states).toHaveAttribute("aria-selected", "false")
      await expect(frame.getByRole("combobox", { name: "Preview views" })).toHaveCount(0)
      const m = await box(main), leftInset = parseFloat(await css(main, "padding-left"))
      close((await box(view)).x, m.x + leftInset)
      expect(await css(states, "background-color")).toBe(TRANSPARENT)
      expect(await computedRgba(cards, "background-color")).toEqual(await renderedRgba(main, "secondary", "background-color"))
      if (sidebarStyles) {
        expect(await triggerStyle(cards)).toEqual(sidebarStyles.active)
        expect(await triggerStyle(states)).toEqual(sidebarStyles.inactive)
      }
      await page.mouse.move(0, 0)
      await page.keyboard.press("Tab")
      await cards.focus()
      await expect.poll(() => cards.evaluate(el => el.matches(":focus-visible"))).toBe(true)
      await expect.poll(() => css(cards, "box-shadow")).toContain("3px")
      await page.keyboard.press("ArrowRight")
      await expect(states).toBeFocused()
      await expect(states).toHaveAttribute("aria-selected", "true")
      await expect(frame.getByRole("heading", { name: "Button", exact: true })).toBeVisible()
      await expect(frame.getByRole("tabpanel", { name: "States", exact: true })).toBeVisible()
      close((await box(view)).x, m.x + leftInset)

      // WSPF-08: the preview root is gap-4 p-4. CGS-03: the gallery frame follows its own container width, one column
      // below 42rem and a 12-track frame above; the first right-region local group splits from its region's 32rem.
      expect(await main.evaluate(el => { const s = getComputedStyle(el); return [s.display, s.rowGap, s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft] })).toEqual(["grid", "16px", "16px", "16px", "16px", "16px"])
      await page.keyboard.press("ArrowLeft")
      await expect(cards).toHaveAttribute("aria-selected", "true")
      const gallery = frame.locator("[data-gallery]")
      const galleryWidth = await gallery.evaluate(el => el.getBoundingClientRect().width)
      const rightWidth = await frame.locator('[data-gallery-region="right"]').evaluate(el => el.getBoundingClientRect().width)
      const columns = (selector: string) => frame.locator(selector).first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length)
      expect(await gallery.locator(":scope > div").evaluate(el => [getComputedStyle(el).display, getComputedStyle(el).rowGap])).toEqual(["grid", galleryWidth >= 896 ? "24px" : "16px"])
      expect(await columns("[data-gallery] > div")).toBe(galleryWidth >= 672 ? 12 : 1)
      expect(await columns('[data-gallery-region="right"] > [data-gallery-group]')).toBe(rightWidth >= 512 ? 2 : 1)
      expect(await frame.locator("html").evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

      await settle(page)
      const axePreview = await new AxeBuilder({ page }).analyze()
      await info.attach(`axe-wspf-preview-${mode}-${reducedMotion}.json`, { body: JSON.stringify(axePreview), contentType: "application/json" })
      expect(await seriousOutsideKnownDebt(page, axePreview.violations, info, `wspf-preview-${mode}-${reducedMotion}`)).toEqual([])
      await info.attach(`wspf-${mode}-${reducedMotion}.png`, { body: await page.screenshot(), contentType: "image/png" })
    })

    test(`WSPF-09/10 one preview-document ScrollArea: ownership, wheel, keyboard, thumb, no trap: ${mode}, ${reducedMotion}`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await page.emulateMedia({ reducedMotion })
      await page.goto("/")
      await setColorMode(page, mode)
      const frame = previewFrame(page)
      await expect(frame.getByTestId("preview")).toHaveAttribute("data-ready", "true")
      await workspaceMode(page, "Preview")
      const doc = frame.locator("html")
      const iframe = page.getByTestId("preview-frame")
      const toolbar = page.getByTestId("workbench-toolbar")
      const outerViewport = page.getByRole("region", { name: "Preview viewport", exact: true })

      // Exactly one vertical ScrollArea in the embedded document, sized to the iframe viewport; none around the iframe.
      expect(await frame.locator('[data-slot="scroll-area"]').count()).toBe(1)
      expect(await page.locator('[data-slot="scroll-area"]').evaluateAll(roots => roots.some(root => root.querySelector("iframe")))).toBe(false)
      expect(await iframe.evaluate(el => el.parentElement!.closest('[data-slot="scroll-area"]'))).toBeNull()
      const root = frame.getByTestId("preview-scroll")
      const viewport = previewDocument(frame)
      expect(await root.evaluate(el => { const r = el.getBoundingClientRect(); return [r.top, r.height - innerHeight, r.width - innerWidth] })).toEqual([0, 0, 0])
      expect(await frame.locator('[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]').count()).toBe(0)
      await expect(frame.locator('[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]')).toBeAttached()
      expect([await css(viewport, "overflow-y"), await css(viewport, "overflow-x")]).toEqual(["scroll", "hidden"])
      // Competing document-root overflow is suppressed; nothing is reserved for a native scrollbar.
      expect(await doc.evaluate(el => [getComputedStyle(el).overflowY, getComputedStyle(document.body).overflowY, el.scrollHeight <= el.clientHeight, el.clientWidth === innerWidth])).toEqual(["hidden", "hidden", true, true])
      expect(await viewport.evaluate(el => el.clientWidth === el.getBoundingClientRect().width && el.scrollHeight > el.clientHeight)).toBe(true)
      const fixed = { toolbar: await box(toolbar), iframe: await box(iframe), main: await box(frame.getByTestId("preview")) }
      const quiet = async () => {
        expect(await doc.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0)
        expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0)
        expect(await outerViewport.evaluate(el => el.scrollTop)).toBe(0)
        expect(await box(toolbar)).toEqual(fixed.toolbar)
        expect(await box(iframe)).toEqual(fixed.iframe)
      }

      // Wheel and a small trackpad-equivalent delta scroll only the ScrollArea viewport.
      const f = fixed.iframe
      await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2)
      await page.mouse.wheel(0, 300)
      await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
      const afterWheel = await viewport.evaluate(el => el.scrollTop)
      await page.mouse.wheel(0, 37)
      await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(afterWheel)
      await quiet()
      // Hover reveals the overlay thumb without moving content (no layout shift, no reserved width).
      const thumb = frame.locator('[data-slot="scroll-area-thumb"]')
      await expect.poll(() => css(thumb, "background-color")).not.toBe(TRANSPARENT)
      expect((await box(frame.getByTestId("preview"))).width).toBe(fixed.main.width)

      // Keyboard scrolling from the focusable viewport (keyboard modality first, so the focus ring is visible).
      await page.keyboard.press("Tab")
      await viewport.focus()
      await expect.poll(() => css(viewport, "box-shadow")).toContain("3px")
      await viewport.press("Home")
      await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBe(0)
      await viewport.press("PageDown")
      await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
      await viewport.press("End")
      await expect.poll(() => viewport.evaluate(el => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) <= 1)).toBe(true)
      // At the end, further wheel input neither scrolls the Workbench nor traps the pointer.
      await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2)
      await page.mouse.wheel(0, 600)
      await quiet()
      await viewport.press("Home")
      await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBe(0)
      // Focus is not trapped: Tab leaves the viewport for the first preview control.
      await page.keyboard.press("Tab")
      await expect(frame.getByRole("tab", { selected: true })).toBeFocused()

      // Thumb drag.
      await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2)
      const t = await box(thumb)
      await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2)
      await page.mouse.down()
      await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2 + 120, { steps: 8 })
      await page.mouse.up()
      await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
      await quiet()
      if (reducedMotion === "reduce") expect(await css(viewport, "scroll-behavior")).toBe("auto")

      // Focus inside the preview reveals the target through the same single owner.
      await previewDocument(frame).evaluate(el => { el.scrollTop = 0 })
      const target = frame.getByRole("button").last()
      await target.focus()
      await expect(target).toBeInViewport()
      await quiet()
      await info.attach(`wspf-09-${mode}-${reducedMotion}.png`, { body: await page.screenshot(), contentType: "image/png" })
    })
  }
}

test("WSPF-10 touch-equivalent preview scrolling stays in the single document ScrollArea", async ({ page, context }) => {
  await page.goto("/")
  const frame = previewFrame(page)
  await expect(frame.getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await workspaceMode(page, "Preview")
  const viewport = previewDocument(frame)
  const f = await box(page.getByTestId("preview-frame"))
  const cdp = await context.newCDPSession(page)
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true })
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: f.x + f.width / 2, y: f.y + f.height * 0.7 }] })
  for (let i = 1; i <= 8; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: f.x + f.width / 2, y: f.y + f.height * 0.7 - i * 25 }] })
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await cdp.detach()
  expect(await frame.locator("html").evaluate(() => document.scrollingElement!.scrollTop)).toBe(0)
  expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0)
  // The mobile off-canvas sidebar still opens over the preview and returns to it.
  await workspaceMode(page, "Controls")
  await workspaceMode(page, "Preview")
  await expect(page.getByRole("button", { name: "Toggle Sidebar" })).toBeVisible()
})

test("WSPF-11 live editing, preview view state and scroll position survive theme updates", async ({ page }) => {
  await page.goto("/")
  const frame = previewFrame(page)
  await expect(frame.getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await workspaceMode(page, "Preview")
  const view = frame.getByRole("tab", { name: "States", exact: true })
  await previewView(page, "States")
  const viewport = previewDocument(frame)
  await viewport.evaluate(el => { el.scrollTop = 120 })
  const top = await viewport.evaluate(el => el.scrollTop)
  expect(top).toBeGreaterThan(0)
  const revision = Number(await frame.getByTestId("preview").getAttribute("data-revision"))
  await editorCategory(page, "Colors")
  await colorInput(page, "primary").fill("oklch(0.5 0.1 250)")
  await expect(frame.getByTestId("preview")).toHaveAttribute("data-revision", String(revision + 1))
  await workspaceMode(page, "Preview")
  await expect(view).toHaveAttribute("aria-selected", "true")
  expect(await viewport.evaluate(el => el.scrollTop)).toBe(top)
  expect(await frame.locator('[data-slot="scroll-area"]').count()).toBe(1)
})
