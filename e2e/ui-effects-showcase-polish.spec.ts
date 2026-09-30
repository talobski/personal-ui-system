import { readFileSync } from "node:fs"

import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { editorCategory, isMobileShell, previewView, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * ui-effects-showcase-polish-v1-001 producer definitions (PUI-119..PUI-122; Lead-executed under
 * playwright.workbench.config.ts at 390x844 and 1440x900). IESP-02 saved toggle-based themes migrate on load; IESP-06
 * default-surface Workbench tabs at natural width; IESP-07 Secondary specimens with no workflow or network; IESP-08 the
 * Design system hierarchy and contextual Sidebar labels over live values.
 */

const STORAGE_KEY = "personal-ui-workbench/v1"
const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const box = async (el: Locator) => (await el.boundingBox())!
const tactile = (el: Locator) => el.evaluate((node) => { const s = getComputedStyle(node); return s.backgroundImage.includes("linear-gradient") && s.boxShadow.includes("inset") })

async function open(page: Page) {
  await page.goto("/")
  await expect(preview(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `iesp-${label}`)
  await info.attach(`axe-iesp-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
  expect(blocking.filter((v) => v.impact === "critical" || v.impact === "serious"), label).toEqual([])
}

test("IESP-02 saved toggle-based themes load by the any-target rule, save back as Effect and Strength, malformed ones are refused", async ({ page }) => {
  // Seed from the Workbench's own export of Default, so only uiEffects differs from an accepted Theme v3 document.
  await open(page)
  await workspaceMode(page, "Preview")
  const download = page.waitForEvent("download")
  await page.getByRole("button", { name: "Export", exact: true }).click()
  const theme = JSON.parse(readFileSync((await (await download).path())!, "utf8"))
  const legacy = (outlineButtons: boolean, tabs: boolean) => ({ effect: { $type: "string", $value: "tactile" }, outlineButtons: { $type: "boolean", $value: outlineButtons }, tabs: { $type: "boolean", $value: tabs }, strength: { $type: "number", $value: 72 } })
  const seeds = [legacy(true, false), legacy(false, true), legacy(false, false)]
  const ids = ["legacy-outline", "legacy-tabs", "legacy-none", "legacy-bad"]
  const themes = Object.fromEntries(ids.map((id, i) => [id, { ...theme, id, name: id.replaceAll("-", " "), uiEffects: i < 3 ? seeds[i] : { ...seeds[0], inputs: { $type: "boolean", $value: true } } }]))
  await page.evaluate(({ key, themes }) => {
    localStorage.setItem(key, JSON.stringify({ themes, activeId: "legacy-outline", bases: Object.fromEntries(Object.keys(themes).map((id) => [id, "default"])) }))
  }, { key: STORAGE_KEY, themes })
  await open(page)
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "legacy-outline")
  await editorCategory(page, "Effects")
  await expect(page.getByRole("combobox", { name: "Effect", exact: true })).toHaveText(/Tactile/)
  await expect(page.getByRole("textbox", { name: "Strength", exact: true })).toHaveValue("72")
  await previewView(page, "Cards")
  expect(await tactile(preview(page).getByRole("button", { name: "Manage storage", exact: true }))).toBe(true)

  for (const [id, effect] of [["legacy-tabs", "Tactile"], ["legacy-none", "Off"]] as const) {
    await page.evaluate(({ key, id }) => { const saved = JSON.parse(localStorage.getItem(key)!); saved.activeId = id; localStorage.setItem(key, JSON.stringify(saved)) }, { key: STORAGE_KEY, id })
    await open(page)
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", id)
    await editorCategory(page, "Effects")
    await expect(page.getByRole("combobox", { name: "Effect", exact: true })).toHaveText(new RegExp(effect))
    await expect(page.getByRole("textbox", { name: "Strength", exact: true })).toHaveValue("72")
  }
  // The malformed value is not silently stripped into a valid theme: it is refused on load.
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
  expect(Object.keys(stored.themes)).toEqual(expect.arrayContaining(["legacy-outline", "legacy-tabs", "legacy-none"]))
  await workspaceMode(page, "Controls")
  await page.getByLabel("Active theme").click()
  await expect(page.getByRole("option", { name: "legacy tabs", exact: true })).toBeVisible()
  await expect(page.getByRole("option", { name: "legacy bad", exact: true })).toHaveCount(0)
  await page.keyboard.press("Escape")

  // Saving a migrated theme writes the two-field canonical shape.
  await workspaceMode(page, "Preview")
  await editorCategory(page, "Effects")
  await page.getByRole("combobox", { name: "Effect", exact: true }).click()
  await page.getByRole("option", { name: "Tactile", exact: true }).click()
  await page.getByRole("textbox", { name: "Strength", exact: true }).fill("40")
  await page.getByRole("textbox", { name: "Strength", exact: true }).blur()
  await page.getByRole("combobox", { name: "Effect", exact: true }).click()
  await page.getByRole("option", { name: "Off", exact: true }).click()
  await workspaceMode(page, "Preview")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).themes["legacy-none"].uiEffects, STORAGE_KEY)).toEqual({ effect: { $type: "string", $value: "off" }, strength: { $type: "number", $value: 40 } })
})

test("IESP-06 both Workbench tab groups are default surface Tabs at natural width, contained, and follow Off/Tactile", async ({ page }, info) => {
  await open(page)
  const check = async (list: Locator, labels: string[]) => {
    await expect(list.getByRole("tab")).toHaveText(labels)
    const listStyle = await list.evaluate((el) => { const s = getComputedStyle(el); return { bg: s.backgroundColor, padding: s.paddingTop, variant: el.getAttribute("data-variant") } })
    expect(listStyle.variant).toBeNull()
    expect(listStyle.padding).toBe("3px")
    expect(listStyle.bg).not.toBe("rgba(0, 0, 0, 0)")
    const listBox = await box(list)
    const tabs = await list.getByRole("tab").evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(el); return { width: r.width, height: r.height, text: range.getBoundingClientRect().width, grow: getComputedStyle(el).flexGrow } }))
    // Natural-width triggers: each is its label plus the official padding, never an equal share.
    for (const tab of tabs) {
      expect(tab.grow).toBe("0")
      expect(Math.abs(tab.width - tab.text - 2 * 8 - 2)).toBeLessThanOrEqual(1)
      expect(tab.height).toBe(29)
    }
    expect(new Set(tabs.map((tab) => Math.round(tab.width))).size).toBeGreaterThan(1)
    // The list is only as wide as its triggers.
    expect(Math.abs(listBox.width - tabs.reduce((sum, tab) => sum + tab.width, 0) - 6)).toBeLessThanOrEqual(1)
    const active = list.getByRole("tab", { selected: true })
    return { active, activeBg: await active.evaluate((el) => getComputedStyle(el).backgroundColor), listBg: listStyle.bg }
  }
  await workspaceMode(page, "Controls")
  const editor = await check(page.getByRole("tablist", { name: "Editor categories" }), ["Colors", "Typography", "Geometry", "Effects", "Command"])
  expect(editor.activeBg).not.toBe(editor.listBg)
  expect(await tactile(editor.active)).toBe(false)
  // Contained: the category list scrolls inside its own region rather than widening the sidebar.
  const region = page.getByRole("region", { name: "Editor category navigation" })
  expect(await region.evaluate((el) => el.getBoundingClientRect().right <= el.closest('[data-slot="sidebar-content"]')!.getBoundingClientRect().right + 0.5)).toBe(true)
  // Keyboard navigation and selection still work.
  await page.getByRole("tab", { name: "Colors", exact: true }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(page.getByRole("tab", { name: "Typography", exact: true })).toBeFocused()
  await expect(page.getByRole("tab", { name: "Typography", exact: true })).toHaveAttribute("aria-selected", "true")
  await expect(page.getByRole("tab", { name: "Typography", exact: true })).toHaveCSS("box-shadow", /3px/)

  await workspaceMode(page, "Preview")
  const view = await check(preview(page).getByRole("tablist", { name: "Preview views" }), ["Cards", "Design system", "App shells", "States"])
  expect(await tactile(view.active)).toBe(false)
  const frameWidth = await page.getByTestId("preview-frame").evaluate((el) => el.getBoundingClientRect().width)
  expect((await box(preview(page).getByRole("tablist", { name: "Preview views" }))).width).toBeLessThanOrEqual(frameWidth)

  await editorCategory(page, "Effects")
  const effect = page.getByRole("combobox", { name: "Effect", exact: true })
  await effect.click()
  await page.getByRole("option", { name: "Tactile", exact: true }).click()
  // PUI-124 (ADSR-04): Tactile reaches the surface TabsList as one fixed ring, inward since PUI-133; no trigger takes the
  // tactile recipe.
  const ring = (el: Locator) => el.evaluate((node) => /0px 0px 0px 1px inset/.test(getComputedStyle(node).boxShadow))
  expect(await tactile(page.getByRole("tablist", { name: "Editor categories" }).getByRole("tab", { selected: true }))).toBe(false)
  expect(await tactile(page.getByRole("tablist", { name: "Editor categories" }).getByRole("tab", { name: "Colors", exact: true }))).toBe(false)
  expect(await ring(page.getByRole("tablist", { name: "Editor categories" }))).toBe(true)
  await workspaceMode(page, "Preview")
  expect(await tactile(preview(page).getByRole("tablist", { name: "Preview views" }).getByRole("tab", { selected: true }))).toBe(false)
  expect(await tactile(preview(page).getByRole("tablist", { name: "Preview views" }).getByRole("tab", { name: "States", exact: true }))).toBe(false)
  expect(await ring(preview(page).getByRole("tablist", { name: "Preview views" }))).toBe(true)
  for (const mode of ["light", "dark"] as const) {
    await setColorMode(page, mode)
    await info.attach(`iesp-tabs-${mode}.png`, { body: await page.screenshot(), contentType: "image/png" })
    await axe(page, info, `tabs-${mode}`)
  }
})

test("IESP-07 Manage storage, section triggers and social Buttons are Secondary, keep geometry and have no workflow or network path", async ({ page }) => {
  const external: string[] = []
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1")) external.push(request.url()) })
  await open(page)
  await workspaceMode(page, "Preview")
  const frame = preview(page)
  const storage = frame.locator('[data-composition="plan-usage"]')
  const manage = storage.getByRole("button", { name: "Manage storage", exact: true })
  await expect(storage.getByRole("button")).toHaveCount(1)
  await expect(manage).toHaveAttribute("data-variant", "secondary")
  await expect(manage).toHaveAttribute("type", "button")
  // It sits below the breakdown, starts at the content edge, and ends the card's content. PUI-128 (ADSR-05): it spans
  // the full inner content width.
  const [list, button] = [await box(storage.locator("ul")), await box(manage)]
  expect(button.y).toBeGreaterThan(list.y + list.height)
  expect(Math.abs(button.x - list.x)).toBeLessThanOrEqual(0.5)
  expect(Math.abs(button.width - list.width)).toBeLessThanOrEqual(0.5)
  const url = page.url()
  const before = await page.evaluate(() => localStorage.getItem("personal-ui-workbench/v1"))
  await manage.click()
  await manage.press("Enter")
  await expect(frame.getByRole("dialog")).toHaveCount(0)
  expect(page.url()).toBe(url)
  expect(await page.evaluate(() => localStorage.getItem("personal-ui-workbench/v1"))).toBe(before)

  // Create account: GitHub and Google are Secondary, two equal columns, icon + label, no OAuth.
  const signup = frame.locator('[data-composition="signup-form"]')
  const social = ["GitHub", "Google"].map((name) => signup.getByRole("button", { name, exact: true }))
  for (const b of social) {
    await expect(b).toHaveAttribute("data-variant", "secondary")
    await expect(b).toHaveAttribute("type", "button")
    await expect(b.locator("svg")).toHaveCount(1)
    const s = await b.evaluate((el) => { const c = getComputedStyle(el); return { h: c.height, pl: c.paddingLeft, gap: c.columnGap, icon: el.querySelector("svg")!.getBoundingClientRect().width, size: c.fontSize } })
    expect(s).toEqual({ h: "36px", pl: "12px", gap: "8px", icon: 16, size: "14px" })
  }
  const [a, b] = [await box(social[0]!), await box(social[1]!)]
  expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(0.5)
  expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(0.5)
  expect(b.x).toBeGreaterThan(a.x + a.width)
  await social[0]!.click()
  expect(page.url()).toBe(url)

  // Section triggers: Secondary surface at the accepted compact geometry; expand/collapse by keyboard and pointer.
  await editorCategory(page, "Colors")
  const trigger = page.getByTestId("section-colors-primary").locator('[data-slot="collapsible-trigger"]')
  await expect(trigger).toHaveAttribute("data-variant", "secondary")
  const t = await trigger.evaluate((el) => { const c = getComputedStyle(el); return { pad: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft], size: c.fontSize, weight: c.fontWeight, transform: c.textTransform, gap: c.columnGap, icon: el.querySelector("svg")!.getBoundingClientRect().width, height: el.getBoundingClientRect().height, shadow: c.boxShadow } })
  expect(t).toMatchObject({ pad: ["2px", "8px", "2px", "8px"], size: "11px", transform: "uppercase", gap: "6px", icon: 12, shadow: "none" })
  expect(t.height).toBeLessThan(21)
  expect(await trigger.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(await trigger.evaluate((el) => { const probe = document.createElement("span"); probe.style.background = "var(--secondary)"; document.body.append(probe); const bg = getComputedStyle(probe).backgroundColor; probe.remove(); return bg }))
  await trigger.focus()
  await trigger.press("Enter"); await expect(trigger).toHaveAttribute("aria-expanded", "false")
  await trigger.press("Space"); await expect(trigger).toHaveAttribute("aria-expanded", "true")
  await trigger.click(); await expect(trigger).toHaveAttribute("aria-expanded", "false")
  await trigger.click(); await expect(trigger).toHaveAttribute("aria-expanded", "true")
  expect(external).toEqual([])
})

test("IESP-08 Design system hierarchy, contextual Sidebar labels, live alias and dedicated values in light and dark", async ({ page }, info) => {
  await open(page)
  await previewView(page, "Design system")
  const frame = preview(page)
  const sheet = frame.locator("[data-design-system]")
  const px = (el: Locator, prop: string) => el.evaluate((node, p) => parseFloat(getComputedStyle(node).getPropertyValue(p)), prop)
  const colors = frame.locator('[data-design-section="colors"]')
  const h2 = colors.getByRole("heading", { level: 2, name: "Colors" })
  const h3 = colors.getByRole("heading", { level: 3, name: "Primary" })
  const label = colors.locator('[data-token="primary"] [data-testid="token-label"]')
  const hex = colors.locator('[data-token="primary"] [data-testid="token-value"]')
  // Hierarchy: section heading > group heading > label = HEX size. PUI-126/PUI-131: the group heading is the
  // uppercase text-sm anchor; the label is title case at its unchanged size in the base foreground; HEX muted.
  expect(await px(h2, "font-size")).toBeGreaterThan(await px(h3, "font-size"))
  expect(await px(h3, "font-size")).toBeGreaterThan(await px(label, "font-size"))
  expect(await px(h3, "font-size")).toBe(14)
  expect(await px(label, "font-size")).toBe(await px(hex, "font-size"))
  expect(await h3.evaluate((el) => getComputedStyle(el).textTransform)).toBe("uppercase")
  expect(await label.evaluate((el) => [getComputedStyle(el).textTransform, getComputedStyle(el).fontWeight])).toEqual(["none", "400"])
  await expect(label).toHaveText("Background")
  const fg = await h3.evaluate((el) => getComputedStyle(el).color)
  expect(await label.evaluate((el) => getComputedStyle(el).color)).toBe(fg)
  expect(await hex.evaluate((el) => getComputedStyle(el).color)).not.toBe(fg)
  // Swatches: rectangular, narrower than their column, pairs side by side; groups further apart than pair rows.
  const swatch = await box(colors.locator('[data-token="primary"] [data-testid="swatch"]'))
  const item = await box(colors.locator('[data-token="primary"]'))
  expect(swatch.width).toBeGreaterThan(swatch.height)
  expect(swatch.width).toBeLessThan(item.width)
  expect(Math.abs((await box(colors.locator('[data-token="primary-foreground"]'))).y - item.y)).toBeLessThanOrEqual(0.5)
  expect(await px(frame.getByTestId("color-groups"), "row-gap")).toBeGreaterThan(await px(colors.locator('[data-token="primary"]').locator(".."), "row-gap"))

  // Sidebar labels are contextual; values follow the live aliases while off and the dedicated values once on.
  const sidebarLabels = { sidebar: "Background", "sidebar-foreground": "Foreground", "sidebar-primary": "Primary Background", "sidebar-primary-foreground": "Primary Foreground", "sidebar-accent": "Accent Background", "sidebar-accent-foreground": "Accent Foreground", "sidebar-border": "Sidebar Border", "sidebar-ring": "Sidebar Ring" }
  for (const [token, text] of Object.entries(sidebarLabels)) await expect(colors.locator(`[data-token="${token}"] [data-testid="token-label"]`)).toHaveText(text)
  await expect(colors.locator(".sr-only")).toHaveCount(0)
  const value = (token: string) => colors.locator(`[data-token="${token}"] [data-testid="token-value"]`)
  await expect(value("sidebar-primary")).toHaveText(await value("primary").innerText())
  await workspaceMode(page, "Controls")
  await editorCategory(page, "Colors")
  await page.getByRole("switch", { name: "Use sidebar tokens" }).click()
  await page.getByTestId("section-colors-sidebar").getByRole("textbox", { name: "Sidebar Primary", exact: true }).fill("#1a73e8")
  await page.getByTestId("section-colors-sidebar").getByRole("textbox", { name: "Sidebar Primary", exact: true }).blur()
  await previewView(page, "Design system")
  await expect(value("sidebar-primary")).toHaveText("#1A73E8")
  await expect(value("primary")).not.toHaveText("#1A73E8")
  // Editor labels are unchanged by the display wording.
  await workspaceMode(page, "Controls")
  await expect(page.getByTestId("section-colors-sidebar").getByRole("textbox", { name: "Sidebar Primary", exact: true })).toBeVisible()
  await workspaceMode(page, "Preview")

  for (const mode of ["light", "dark"] as const) {
    await setColorMode(page, mode)
    await previewView(page, "Design system")
    expect(await sheet.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    expect(await label.evaluate((el) => getComputedStyle(el).color)).toBe(await h3.evaluate((el) => getComputedStyle(el).color))
    await info.attach(`iesp-design-system-${mode}${isMobileShell(page) ? "-narrow" : ""}.png`, { body: await page.screenshot({ fullPage: false }), contentType: "image/png" })
    await axe(page, info, `design-system-${mode}`)
  }
})
