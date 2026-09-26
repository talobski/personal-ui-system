import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"
import { getValidatedTheme } from "../packages/core/src/context/themes"
import { stageCommand } from "./design-command-fixture"
import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { colorInput, editorCategory, expectEditorContainment, isMobileShell, saveTheme, setColorMode, sidebarSheet, workspaceMode } from "./workbench-navigation"

/*
 * WSTP-15 focused browser definitions for workbench-sidebar-theme-polish-v1-001. Runs in both projects of
 * playwright.workbench.config.ts (390x844 and 1440x900), for light/dark and reduced/default motion. Lead-executed.
 */

const defaultTheme = getValidatedTheme("default")!
const SIDEBAR_TOKENS = ["sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring"] as const
const ALIASES = { sidebar: "background", "sidebar-foreground": "foreground", "sidebar-primary": "primary", "sidebar-primary-foreground": "primary-foreground", "sidebar-accent": "accent", "sidebar-accent-foreground": "accent-foreground", "sidebar-border": "border", "sidebar-ring": "ring" } as const
const LABELS = ["Background", "Foreground", "Primary", "Primary foreground", "Accent", "Accent foreground", "Border", "Ring"]
const DEDICATED = "oklch(0.6 0.1 250)"

const box = async (el: Locator) => {
  const bounds = await el.boundingBox()
  expect(bounds).not.toBeNull()
  return bounds!
}
const close = (actual: number, expected: number, tolerance = 1) => expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance)
const css = (el: Locator, property: string) => el.evaluate((node, name) => getComputedStyle(node).getPropertyValue(name), property)
const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

/** A colour expression (a token name or any CSS colour) rendered to sRGB bytes inside `scope`'s themed document. */
const rendered = (scope: Locator, value: string) =>
  scope.evaluate((el, v) => {
    const probe = el.ownerDocument.createElement("span")
    probe.style.setProperty("color", v.includes("(") ? v : `var(--${v})`)
    el.append(probe)
    const computed = getComputedStyle(probe).color
    probe.remove()
    const ctx = el.ownerDocument.createElement("canvas").getContext("2d", { willReadFrequently: true })!
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = computed; ctx.fillRect(0, 0, 1, 1)
    return Array.from(ctx.getImageData(0, 0, 1, 1).data)
  }, value)

/** An element's computed colour property as sRGB bytes (alpha included). */
const bytes = (el: Locator, property: "color" | "background-color" | "border-top-color") =>
  el.evaluate((node, p) => {
    const ctx = node.ownerDocument.createElement("canvas").getContext("2d", { willReadFrequently: true })!
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = getComputedStyle(node).getPropertyValue(p); ctx.fillRect(0, 0, 1, 1)
    return Array.from(ctx.getImageData(0, 0, 1, 1).data)
  }, property)

const alphaOf = async (el: Locator) => {
  const color = await el.evaluate(node => getComputedStyle(node).backgroundColor)
  return el.evaluate((node, c) => {
    const ctx = node.ownerDocument.createElement("canvas").getContext("2d", { willReadFrequently: true })!
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1)
    return ctx.getImageData(0, 0, 1, 1).data[3]! / 255
  }, color)
}

/** The live Sidebar surface: the desktop sidebar inner panel, or the open mobile sheet. */
async function sidebarSurface(page: Page) {
  await workspaceMode(page, "Controls")
  return isMobileShell(page) ? sidebarSheet(page) : page.locator('[data-slot="sidebar-inner"]')
}

async function openSidebarGroup(page: Page) {
  await editorCategory(page, "Colors")
  const section = page.getByTestId("section-colors-sidebar")
  await section.scrollIntoViewIfNeeded()
  await expect(section).toBeVisible()
  return section
}

async function axe(page: Page, info: Parameters<typeof seriousOutsideKnownDebt>[2], label: string) {
  // Measure resting states: no pointer hover over a control (as the accepted phase specs do).
  await page.mouse.move(0, 0)
  const result = await new AxeBuilder({ page }).analyze()
  expect(await seriousOutsideKnownDebt(page, result.violations, info, label)).toEqual([])
}

for (const mode of ["light", "dark"] as const) {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test.describe(`${mode}, ${reducedMotion} motion`, () => {
      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion })
        await page.goto("/")
        await setColorMode(page, mode)
        await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
      })

      test("WSTP-06/07/09 Sidebar source: off aliases, no-jump activation, live edits, preserved values, save and reload", async ({ page }, info) => {
        test.setTimeout(120_000)
        const surface = await sidebarSurface(page)
        // OFF: the Sidebar background is the base background, never card.
        expect(await bytes(surface, "background-color")).toEqual(await rendered(surface, "background"))
        expect(await bytes(surface, "color")).toEqual(await rendered(surface, "foreground"))
        const card = await rendered(surface, "card")
        if (JSON.stringify(card) !== JSON.stringify(await rendered(surface, "background"))) expect(await bytes(surface, "background-color")).not.toEqual(card)
        expect(await bytes(page.getByRole("region", { name: "Editor category navigation", exact: true }).locator("xpath=../.."), "background-color")).toEqual(await rendered(surface, "background"))

        // One Sidebar group: official Switch, exact helper copy, eight visible enabled controls in both states.
        const section = await openSidebarGroup(page)
        await expect(section.getByRole("heading", { level: 3 })).toHaveText("Sidebar")
        const toggle = section.getByRole("switch", { name: "Use sidebar tokens" })
        await expect(toggle).toHaveAttribute("aria-checked", "false")
        await expect(toggle).toHaveAttribute("data-slot", "switch")
        await expect(section.getByTestId("sidebar-tokens-status")).toHaveText("Sidebar tokens are currently not applied.")
        await expect(toggle).toHaveAccessibleDescription("Sidebar tokens are currently not applied.")
        // Visible label text only (each carries a screen-reader-only "Sidebar" prefix).
        const labels = await section.locator('[data-testid^="control-color-"] label').evaluateAll(els => els.map(el => {
          const clone = el.cloneNode(true) as HTMLElement
          clone.querySelectorAll(".sr-only").forEach(node => node.remove())
          return clone.textContent!.trim()
        }))
        expect(labels).toEqual(LABELS)
        for (const token of SIDEBAR_TOKENS) {
          await expect(colorInput(page, token)).toBeVisible()
          await expect(colorInput(page, token)).toBeEnabled()
          await expect(colorInput(page, token)).toHaveValue(defaultTheme.colors[mode][ALIASES[token]].$value)
        }

        // First activation: no visual jump.
        const before = await bytes(surface, "background-color")
        const beforeForeground = await bytes(surface, "color")
        await toggle.click()
        await expect(toggle).toHaveAttribute("aria-checked", "true")
        await expect(section.getByTestId("sidebar-tokens-status")).toHaveText("Sidebar tokens are active.")
        expect(await bytes(surface, "background-color")).toEqual(before)
        expect(await bytes(surface, "color")).toEqual(beforeForeground)
        await axe(page, info, `${mode}-sidebar-on`)

        // ON: dedicated edits recolor the live Sidebar immediately; inputs keep the ordinary input token.
        await colorInput(page, "sidebar").fill(DEDICATED)
        await expect.poll(() => bytes(surface, "background-color")).toEqual(await rendered(surface, DEDICATED))
        await colorInput(page, "sidebar-border").fill("oklch(0.5 0.12 30)")
        expect(await bytes(colorInput(page, "sidebar"), "border-top-color")).toEqual(await rendered(surface, "input"))

        // OFF (keyboard): base aliases return; dedicated values stay stored, visible, and editable but unapplied.
        await toggle.focus()
        await page.keyboard.press("Space")
        await expect(toggle).toHaveAttribute("aria-checked", "false")
        await expect.poll(() => bytes(surface, "background-color")).toEqual(await rendered(surface, "background"))
        await expect(colorInput(page, "sidebar")).toHaveValue(DEDICATED)
        await expect(colorInput(page, "sidebar")).toBeEnabled()
        await colorInput(page, "sidebar-accent").fill("oklch(0.7 0.05 150)")
        await expect(colorInput(page, "sidebar-accent")).toHaveValue("oklch(0.7 0.05 150)")
        expect(await bytes(surface, "background-color")).toEqual(await rendered(surface, "background"))
        await axe(page, info, `${mode}-sidebar-off`)
        await expectEditorContainment(page)

        // Save As, reload: the mode and dedicated values survive; turning it back on applies them.
        await saveTheme(page, "Sidebar Mode")
        await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "sidebar-mode")
        const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!).themes["sidebar-mode"])
        expect(stored.schemaVersion).toBe("3.0")
        expect(stored.sidebar).toEqual({ useDedicatedTokens: { $type: "boolean", $value: false }, dedicatedValuesInitialized: true })
        expect(stored.colors[mode].sidebar.$value).toBe(DEDICATED)
        await page.reload()
        await setColorMode(page, mode)
        const reloaded = await openSidebarGroup(page)
        await expect(reloaded.getByRole("switch", { name: "Use sidebar tokens" })).toHaveAttribute("aria-checked", "false")
        await expect(colorInput(page, "sidebar")).toHaveValue(DEDICATED)
        await reloaded.getByRole("switch", { name: "Use sidebar tokens" }).click()
        const surfaceAfter = await sidebarSurface(page)
        await expect.poll(() => bytes(surfaceAfter, "background-color")).toEqual(await rendered(surfaceAfter, DEDICATED))
      })

      test("WSTP-04/06 a saved v2.0 custom theme migrates on load, starts off, and renders its base background", async ({ page }) => {
        const legacy = structuredClone(defaultTheme) as Record<string, any>
        Object.assign(legacy, { id: "legacy-v20", name: "Legacy V20", revision: 3, schemaVersion: "2.0", $schema: "https://personal-ui.local/schema/theme-2.json" })
        legacy.typography = { sans: legacy.typography.body.font, serif: legacy.typography.heading.font, mono: legacy.typography.mono, tracking: legacy.typography.body.tracking }
        delete legacy.sidebar
        for (const m of ["light", "dark"]) for (const token of SIDEBAR_TOKENS) delete legacy.colors[m][token]
        legacy.colors[mode].background.$value = mode === "light" ? "oklch(0.97 0.01 90)" : "oklch(0.2 0.01 250)"
        await page.evaluate(theme => localStorage.setItem("personal-ui-workbench/v1", JSON.stringify({ themes: { [theme.id]: theme }, activeId: theme.id, bases: { [theme.id]: "default" } })), legacy)
        await page.reload()
        await setColorMode(page, mode)
        await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "legacy-v20")
        const surface = await sidebarSurface(page)
        expect(await bytes(surface, "background-color")).toEqual(await rendered(surface, legacy.colors[mode].background.$value))
        const section = await openSidebarGroup(page)
        await expect(section.getByRole("switch", { name: "Use sidebar tokens" })).toHaveAttribute("aria-checked", "false")
        await expect(colorInput(page, "sidebar")).toHaveValue(legacy.colors[mode].background.$value)
        // Loading never rewrites storage; the next Save persists canonical v3.
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!).themes["legacy-v20"].schemaVersion)).toBe("2.0")
        await saveTheme(page)
        await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!).themes["legacy-v20"].schemaVersion)).toBe("3.0")
      })

      test("WSTP-06/08 a staged Sidebar proposal previews only in the preview and applies through Apply", async ({ page }) => {
        const surface = await sidebarSurface(page)
        const active = await bytes(surface, "background-color")
        await stageCommand(page, [{ op: "setSidebarTokensEnabled", value: true }, { op: "setColor", mode, token: "sidebar", value: DEDICATED }])
        await workspaceMode(page, "Preview")
        await expect(page.getByTestId("proposal-staged")).toBeVisible()
        const paths = await page.getByTestId("proposal-diff-list").locator("li").evaluateAll(els => els.map(el => el.getAttribute("data-path")))
        expect(paths).toEqual([`colors.${mode}.sidebar`, "sidebar.useDedicatedTokens"])
        await expect(page.getByTestId("proposal-diff-list")).not.toContainText("dedicatedValuesInitialized")
        // The candidate reaches only the preview document; the Workbench chrome keeps the active theme.
        await expect.poll(() => previewFrame(page).locator("html").evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--sidebar").trim())).toBe(DEDICATED)
        expect(await bytes(await sidebarSurface(page), "background-color")).toEqual(active)
        await workspaceMode(page, "Preview")
        await page.getByRole("button", { name: "Apply proposal" }).click()
        await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
        const applied = await sidebarSurface(page)
        await expect.poll(() => bytes(applied, "background-color")).toEqual(await rendered(applied, DEDICATED))
      })

      test("WSTP-11/12/13 geometry, typography rows, selector weight, Effects tab, and pointer affordances", async ({ page }, info) => {
        test.setTimeout(120_000)
        const viewport = page.viewportSize()!
        // WSTP-11: official --sidebar-width 28rem on desktop; the 18rem mobile sheet is unchanged.
        if (isMobileShell(page)) {
          const sheet = await sidebarSurface(page)
          close((await box(sheet)).width, 18 * 16)
          await workspaceMode(page, "Preview")
          close((await box(page.locator('[data-slot="sidebar-inset"]'))).width, viewport.width)
        } else {
          const container = page.locator('[data-slot="sidebar-container"]')
          close((await box(container)).width, 28 * 16)
          const inset = await box(page.locator('[data-slot="sidebar-inset"]'))
          close(inset.x, 28 * 16); close(inset.width, viewport.width - 28 * 16)
          close((await box(page.getByTestId("preview-frame"))).width, viewport.width - 28 * 16)
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width)
          await page.keyboard.press("ControlOrMeta+b")
          await expect.poll(async () => (await box(page.locator('[data-slot="sidebar-inset"]'))).width).toBeCloseTo(viewport.width, 0)
          await page.keyboard.press("ControlOrMeta+b")
          await expect.poll(async () => (await box(page.locator('[data-slot="sidebar-inset"]'))).x).toBeCloseTo(28 * 16, 0)
        }

        // WSTP-13 tabs: Effects label for the internal `other` panel, px-2 triggers, original order.
        await workspaceMode(page, "Controls")
        const tablist = page.getByRole("tablist", { name: "Editor categories" })
        await expect(tablist.getByRole("tab")).toHaveText(["Colors", "Typography", "Effects", "Command"])
        for (const tab of await tablist.getByRole("tab").all()) expect([await css(tab, "padding-left"), await css(tab, "padding-right"), await css(tab, "cursor")]).toEqual(["8px", "8px", "pointer"])
        await editorCategory(page, "Effects")
        const effects = page.getByRole("tabpanel", { name: "Effects", exact: true })
        await expect(effects.getByRole("heading", { level: 3 })).toHaveText(["Radius", "Spacing", "Shadow", "Motion"])

        // WSTP-12: shared 5rem label column, stable across a spacing-token change; no wrapping or clipping.
        const labelColumn = async (row: Locator) => {
          const label = row.locator(":scope > label")
          const metrics = await label.evaluate(el => {
            // Visible text only: a screen-reader-only group prefix (e.g. "Heading " before "Font") is not a wrapped line.
            const rects = Array.from(el.childNodes).filter(node => !(node instanceof HTMLElement && node.classList.contains("sr-only"))).flatMap(node => {
              const range = el.ownerDocument.createRange()
              range.selectNodeContents(node)
              return Array.from(range.getClientRects())
            })
            const lines = new Set(rects.filter(r => r.width > 0).map(r => Math.round(r.top))).size
            return { width: el.getBoundingClientRect().width, lines, clipped: el.scrollWidth > el.clientWidth }
          })
          close(metrics.width, 80)
          expect(metrics.clipped).toBe(false)
          expect(metrics.lines).toBeLessThanOrEqual(1)
        }
        for (const row of await effects.locator('[data-testid$="-row"]').all()) await labelColumn(row)
        await page.getByRole("textbox", { name: "Spacing", exact: true }).fill("0.5")
        await expect(page.getByRole("textbox", { name: "Spacing", exact: true })).toHaveValue("0.5")
        for (const row of await effects.locator('[data-testid$="-row"]').all()) await labelColumn(row)
        await editorCategory(page, "Typography")
        const typography = page.getByRole("tabpanel", { name: "Typography", exact: true })
        // STHG-06: Heading, Body, then the compact Mono primitive; the old Font families / Spacing groups are gone.
        await expect(typography.getByRole("heading", { level: 3 })).toHaveText(["Heading", "Body", "Mono"])
        expect(await typography.getByRole("heading", { level: 3 }).evaluateAll(els => els.map(el => (el as HTMLElement).innerText.trim()))).toEqual(["HEADING", "BODY", "MONO"])
        for (const role of ["heading", "body", "mono"] as const) {
          const title = `${role[0]!.toUpperCase()}${role.slice(1)}`
          const row = page.getByTestId(`font-${role}-row`)
          await expect(row.locator(":scope > label")).toHaveText(`${title} Font`)
          await expect(row.locator(":scope > label > .sr-only")).toHaveText(`${title} `)
          expect(await row.locator(":scope > label").evaluate(el => Array.from(el.childNodes).filter(node => !(node instanceof HTMLElement && node.classList.contains("sr-only"))).map(node => node.textContent).join("").trim())).toBe("Font")
          await labelColumn(row)
          await expect(page.getByRole("combobox", { name: `${title} Font`, exact: true })).toBeVisible()
          expect(await css(page.getByRole("combobox", { name: `${title} Font`, exact: true }), "cursor")).toBe("pointer")
        }
        for (const [id, name] of [["headingWeight", "Heading Weight"], ["headingTracking", "Heading Tracking"], ["bodyWeight", "Body Weight"], ["bodyTracking", "Body Tracking"]] as const) {
          await labelColumn(page.getByTestId(`${id}-row`))
          expect(await page.getByTestId(`${id}-row`).locator(":scope > label").evaluate(el => Array.from(el.childNodes).filter(node => !(node instanceof HTMLElement && node.classList.contains("sr-only"))).map(node => node.textContent).join("").trim())).toBe(name.split(" ")[1])
          await expect(page.getByRole("slider", { name, exact: true })).toBeVisible()
        }
        await expectEditorContainment(page)

        // WSTP-13 selector: active and listed theme names compute to 500; other selector styling unchanged.
        const trigger = page.getByRole("combobox", { name: "Active theme" })
        expect(await trigger.locator("span.truncate.font-medium").evaluate(el => getComputedStyle(el).fontWeight)).toBe("500")
        await trigger.click()
        await expect(page.getByRole("option", { name: "Default", exact: true })).toBeVisible()
        for (const option of await page.getByRole("option").all()) expect(await option.locator("span.font-medium").evaluate(el => getComputedStyle(el).fontWeight)).toBe("500")
        // Re-selecting the active theme closes the list without changing anything.
        await page.getByRole("option", { name: "Default", exact: true }).click()
        await expect(trigger).toHaveAttribute("aria-expanded", "false")

        // WSTP-13 pointer: enabled actions show pointer; labels and sliders do not; disabled actions take no pointer.
        await editorCategory(page, "Effects")
        expect(await css(page.getByRole("button", { name: "Radius", exact: true }), "cursor")).toBe("pointer")
        expect(await css(effects.locator("label").first(), "cursor")).not.toBe("pointer")
        expect(await css(page.getByRole("slider", { name: "Radius" }), "cursor")).not.toBe("pointer")
        await workspaceMode(page, "Preview")
        for (const name of ["Export", "Save", "Toggle Sidebar"]) expect(await css(page.getByRole("button", { name, exact: true }), "cursor")).toBe("pointer")
        expect(await css(page.getByRole("switch", { name: "Dark mode" }), "cursor")).toBe("pointer")
        await stageCommand(page, [{ op: "setSidebarTokensEnabled", value: true }])
        await workspaceMode(page, "Preview")
        for (const name of ["Export", "Save"]) {
          const button = page.getByRole("button", { name, exact: true })
          await expect(button).toBeDisabled()
          expect(await css(button, "pointer-events")).toBe("none")
        }
        await page.getByRole("button", { name: "Discard proposal" }).click()
        await axe(page, info, `${mode}-geometry`)
      })

      test("WSTP-10 shared ScrollArea: slim bars, semantic thumb states, no reserved width, native input", async ({ page }) => {
        await editorCategory(page, "Colors")
        const root = page.getByTestId("editor-scroll")
        const viewportRegion = page.getByRole("region", { name: "Theme editor", exact: true })
        const bar = root.locator(':scope > [data-slot="scroll-area-scrollbar"][data-orientation="vertical"]')
        const thumb = bar.locator('[data-slot="scroll-area-thumb"]')
        await expect(thumb).toBeAttached()
        close((await box(bar)).width, 8, 0.5)
        expect(await css(bar, "background-color")).toBe("rgba(0, 0, 0, 0)")
        expect(await css(thumb, "border-radius")).not.toBe("0px")
        // No reserved width: the viewport keeps the full root width.
        close((await box(viewportRegion)).width, (await box(root)).width)
        expect(await viewportRegion.evaluate(el => el.clientWidth === el.getBoundingClientRect().width)).toBe(true)
        // Rest 25%, region hover/focus 40%, thumb hover 55% of the semantic muted foreground.
        await page.mouse.move(0, 0)
        await viewportRegion.evaluate(el => (el as HTMLElement).blur())
        await expect.poll(() => alphaOf(thumb)).toBeCloseTo(0.25, 1)
        const rest = await box(viewportRegion)
        await viewportRegion.hover()
        await expect.poll(() => alphaOf(thumb)).toBeCloseTo(0.4, 1)
        const t = await box(thumb)
        await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2)
        await expect.poll(() => alphaOf(thumb)).toBeCloseTo(0.55, 1)
        expect(await box(viewportRegion)).toEqual(rest)
        // Pointer drag, wheel, and keyboard remain Radix/native.
        await page.mouse.down()
        await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2 + 60, { steps: 4 })
        await page.mouse.up()
        await expect.poll(() => viewportRegion.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
        await viewportRegion.evaluate(el => { el.scrollTop = 0 })
        await viewportRegion.hover()
        await page.mouse.wheel(0, 240)
        await expect.poll(() => viewportRegion.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
        await viewportRegion.focus()
        await viewportRegion.press("Home")
        await expect.poll(() => viewportRegion.evaluate(el => el.scrollTop)).toBe(0)
        await viewportRegion.press("PageDown")
        await expect.poll(() => viewportRegion.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
        await expect.poll(() => alphaOf(thumb)).toBeCloseTo(0.4, 1)
        // A horizontal bar, when the category row overflows, uses the same 0.5rem thickness.
        const horizontal = page.locator('[data-slot="scroll-area-scrollbar"][data-orientation="horizontal"]')
        for (const h of await horizontal.all()) if (await h.isVisible()) close((await box(h)).height, 8, 0.5)
        // The preview document's root ScrollArea inherits the same shared treatment.
        await workspaceMode(page, "Preview")
        const previewBar = previewFrame(page).locator('[data-slot="scroll-area-scrollbar"][data-orientation="vertical"]').first()
        await expect(previewBar).toBeAttached()
        close((await box(previewBar)).width, 8, 0.5)
      })
    })
  }
}
