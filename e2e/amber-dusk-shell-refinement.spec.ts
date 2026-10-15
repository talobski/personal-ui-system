import { mkdirSync, readFileSync } from "node:fs"

import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Locator, Page, TestInfo } from "@playwright/test"

import { copyThemeCode, editorCategory, isMobileShell, previewStates, previewView, saveTheme, selectTheme, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * amber-dusk-shell-refinement-v1-001 producer definitions (PUI-123..PUI-128; Lead-executed under
 * playwright.workbench.config.ts at 390x844 and 1440x900). ADSR-02/03 Amber Dusk through the existing built-in flows;
 * ADSR-04 Off/Tactile targets with a fixed surface TabsList ring invariant to Strength; ADSR-05 helper, Colors hierarchy,
 * App shell scale and Inset styling, Storage width and the fixed-circle Chat send Button. Axe results are attached
 * decoded and unfiltered, with their disposition left to Lead: the owner-supplied Amber Dusk palette carries measured
 * source-palette contrast debt (see packages/core/src/theme/fixtures/amber-dusk.conversion.json and lifecycle.test.ts).
 */

const STORAGE_KEY = "personal-ui-workbench/v1"
const FIXTURE = JSON.parse(readFileSync(new URL("../packages/core/src/theme/fixtures/amber-dusk.json", import.meta.url), "utf8"))
const DEFAULT = JSON.parse(readFileSync(new URL("../packages/core/src/theme/fixtures/default.json", import.meta.url), "utf8"))
const SHOTS = process.env.ADSR_SHOTS_DIR
const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const box = async (el: Locator) => (await el.boundingBox())!
const css = (el: Locator, prop: string) => el.evaluate((node, p) => getComputedStyle(node).getPropertyValue(p), prop)
const rootVar = (frame: FrameLocator, name: string) => frame.locator("html").evaluate((el, n) => getComputedStyle(el).getPropertyValue(n).trim(), name)
/** What a semantic token paints, resolved in the preview document. */
const token = (frame: FrameLocator, name: string) => frame.locator("body").evaluate((body, n) => {
  const probe = document.createElement("span")
  probe.style.backgroundColor = `var(--${n})`
  body.append(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
}, name)
const tactile = (el: Locator) => el.evaluate((node) => { const s = getComputedStyle(node); return s.backgroundImage.includes("linear-gradient") && s.boxShadow.includes("inset") })

async function open(page: Page) {
  await page.goto("/workbench")
  await expect(preview(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function shot(page: Page, info: TestInfo, name: string) {
  const body = await page.screenshot()
  await info.attach(`${name}.png`, { body, contentType: "image/png" })
  if (SHOTS) {
    mkdirSync(SHOTS, { recursive: true })
    await page.screenshot({ path: `${SHOTS}/${name}-${isMobileShell(page) ? "narrow" : "wide"}.png` })
  }
}

async function axeRecord(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const decoded = violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => ({ target: n.target, data: n.any[0]?.data })) }))
  await info.attach(`axe-adsr-${label}.json`, { body: JSON.stringify(decoded, null, 2), contentType: "application/json" })
}

async function setEffect(page: Page, effect: "Off" | "Tactile") {
  await editorCategory(page, "Effects")
  const control = page.getByRole("combobox", { name: "Effect", exact: true })
  if ((await control.textContent())?.includes(effect)) return
  await control.click()
  await page.getByRole("option", { name: effect, exact: true }).click()
  await expect(control).toHaveText(new RegExp(effect))
}

async function setStrength(page: Page, value: number) {
  await editorCategory(page, "Effects")
  const input = page.getByRole("textbox", { name: "Strength", exact: true })
  await input.fill(String(value))
  await input.blur()
  await expect(page.getByRole("slider", { name: "Strength", exact: true })).toHaveAttribute("aria-valuenow", String(value))
}

test.describe("ADSR-02/03 Amber Dusk built-in (PUI-123)", () => {
  for (const mode of ["light", "dark"] as const) {
    test(`selects live, renders its palette, dedicated Sidebar and charts, and does not leak (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await workspaceMode(page, "Controls")
      await page.getByRole("combobox", { name: "Active theme" }).click()
      await expect(page.getByRole("group", { name: "Built-in", exact: true }).getByRole("option")).toHaveText(["Default", "Quiet Editorial", "Amber Dusk"])
      await page.keyboard.press("Escape")
      await selectTheme(page, "amber-dusk")
      const frame = preview(page)
      await expect(frame.getByTestId("preview")).toHaveAttribute("data-theme-id", "amber-dusk")
      // Every semantic, chart and dedicated Sidebar variable in the preview is the fixture's canonical value.
      for (const name of Object.keys(FIXTURE.colors[mode])) await expect.poll(() => rootVar(frame, `--${name}`), name).toBe(FIXTURE.colors[mode][name].$value)
      expect(await rootVar(frame, "--radius")).toBe("0.5rem")
      await workspaceMode(page, "Controls")
      await editorCategory(page, "Colors")
      await expect(page.getByRole("switch", { name: "Use sidebar tokens" })).toHaveAttribute("aria-checked", "true")
      // The shells paint the dedicated Sidebar colour; the chart paints chart tokens.
      await previewView(page, "App shells")
      const classic = frame.locator('[data-app-shell="Classic workspace"] [data-slot="sidebar"]')
      expect(await css(classic, "background-color")).toBe(await token(frame, "sidebar"))
      expect(await token(frame, "sidebar")).not.toBe(await token(frame, "background"))
      await shot(page, info, `adsr-amber-shells-${mode}`)
      await previewView(page, "Cards")
      await shot(page, info, `adsr-amber-cards-${mode}`)
      await axeRecord(page, info, `amber-cards-${mode}`)
      // Switching back to Default leaves no Amber Dusk value behind.
      await selectTheme(page, "default")
      for (const name of ["primary", "background", "chart-2", "sidebar"]) {
        const expected = name === "sidebar" ? DEFAULT.colors[mode].background.$value : DEFAULT.colors[mode][name].$value
        await expect.poll(() => rootVar(frame, `--${name}`), name).toBe(expected)
      }
    })
  }

  test("history, Reset, Save As custom copy, reload and export round trip use the existing flows", async ({ page }) => {
    test.setTimeout(90_000)
    await open(page)
    await selectTheme(page, "amber-dusk")
    await editorCategory(page, "Geometry")
    await page.getByRole("textbox", { name: "Radius", exact: true }).fill("1")
    await page.getByRole("textbox", { name: "Radius", exact: true }).blur()
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")
    await workspaceMode(page, "Preview")
    const history = (name: string) => page.getByTestId("history-controls").getByRole("button", { name, exact: true })
    await history("Undo").click()
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
    await history("Redo").click()
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")
    await saveTheme(page, "Amber Copy")
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "amber-copy")
    await workspaceMode(page, "Preview")
    const exported = JSON.parse((await copyThemeCode(page)).text)
    for (const key of ["id", "name", "schemaVersion"]) expect(exported).not.toHaveProperty(key)
    expect(exported.radius.base.$value).toBe("1rem")
    expect(exported.colors).toEqual(FIXTURE.colors)
    expect(exported.sidebar).toEqual({ useDedicatedTokens: FIXTURE.sidebar.useDedicatedTokens })
    expect(exported.uiEffects).toBeUndefined()
    // Theme code JSON is portable (no Theme v3 identity), so restore goes through the saved canonical theme: stored
    // under a new id it loads and renders identically.
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).themes["amber-copy"], STORAGE_KEY)
    await page.evaluate(([key, theme]) => localStorage.setItem(key as string, JSON.stringify({ themes: { "amber-import": theme }, activeId: "amber-import", bases: { "amber-import": "amber-dusk" } })), [STORAGE_KEY, { ...saved, id: "amber-import", name: "Amber Import" }])
    await page.reload()
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "amber-import")
    await expect.poll(() => rootVar(preview(page), "--primary")).toBe(FIXTURE.colors.light.primary.$value)
    // The built-in itself is untouched: re-selecting it shows the fixture radius, and Reset has nothing to do.
    await selectTheme(page, "amber-dusk")
    await expect.poll(() => rootVar(preview(page), "--radius")).toBe("0.5rem")
    await workspaceMode(page, "Preview")
    await expect(history("Reset")).toBeDisabled()
  })
})

test.describe("ADSR-04 Off/Tactile targets and the fixed TabsList ring (PUI-124)", () => {
  for (const theme of ["default", "amber-dusk"] as const) {
    for (const mode of ["light", "dark"] as const) {
      test(`Tabs are invariant to Strength while Secondary responds (${theme}, ${mode})`, async ({ page }, info) => {
        test.setTimeout(120_000)
        await open(page)
        if (theme !== "default") await selectTheme(page, theme)
        await setColorMode(page, mode)
        const frame = preview(page)
        const list = frame.getByRole("tablist", { name: "Surface tabs sample" })
        const active = list.getByRole("tab", { selected: true })
        const secondary = frame.locator('[data-testid="preview"] section[aria-labelledby="pv-buttons"] [data-slot="button"][data-variant="secondary"]').first()
        const read = async () => {
          await previewStates(page)
          await expect.poll(() => frame.locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
          const style = (el: Locator) => el.evaluate((node) => { const s = getComputedStyle(node); const r = node.getBoundingClientRect(); return { boxShadow: s.boxShadow, backgroundImage: s.backgroundImage, backgroundColor: s.backgroundColor, borderColor: s.borderTopColor, color: s.color, width: r.width, height: r.height } })
          return { list: await style(list), active: await style(active), secondary: await style(secondary) }
        }
        const off = await read()
        expect(off.list.boxShadow).not.toMatch(/0px 0px 0px 1px/)
        await setEffect(page, "Tactile")
        const readings: Record<number, Awaited<ReturnType<typeof read>>> = {}
        for (const strength of [0, 50, 100]) {
          await setStrength(page, strength)
          readings[strength] = await read()
        }
        // One fixed ring on the list at every strength, including 0; triggers keep exactly their Off styling.
        for (const strength of [0, 50, 100]) {
          expect(readings[strength]!.list, `list ${strength}`).toEqual(readings[0]!.list)
          expect(readings[strength]!.active, `active ${strength}`).toEqual(off.active)
        }
        // PUI-133: the fixed edge is one inward 1px layer; no outer 1px ring remains.
        expect(readings[0]!.list.boxShadow).toMatch(/0px 0px 0px 1px inset/)
        expect(readings[0]!.list.boxShadow).not.toMatch(/0px 0px 0px 1px(?! inset)/)
        for (const key of ["backgroundColor", "width", "height", "backgroundImage"] as const) expect(readings[50]!.list[key]).toBe(off.list[key])
        // PUI-129: the ring colour is the semantic border token at 80%.
        const ringColor = await list.evaluate((node) => { const probe = document.createElement("span"); probe.style.color = "color-mix(in oklab, var(--border) 80%, transparent)"; node.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c })
        expect(readings[50]!.list.boxShadow).toContain(ringColor)
        // Secondary responds to Strength.
        expect(readings[100]!.secondary.boxShadow).not.toBe(readings[0]!.secondary.boxShadow)
        expect(readings[100]!.secondary.backgroundImage).not.toBe(readings[0]!.secondary.backgroundImage)
        expect(await tactile(active)).toBe(false)
        // Keyboard, selection and focus semantics hold.
        await list.getByRole("tab", { name: "Overview" }).focus()
        await page.keyboard.press("ArrowRight")
        await expect(list.getByRole("tab", { name: "Activity" })).toHaveAttribute("aria-selected", "true")
        await expect(list.getByRole("tab", { name: "Activity" })).toBeFocused()
        await expect.poll(() => css(list.getByRole("tab", { name: "Activity" }), "box-shadow")).toMatch(/0px 0px 0px 3px/)
        await shot(page, info, `adsr-tabs-${theme}-${mode}`)
        await setEffect(page, "Off")
        const back = await read()
        expect(back.list).toEqual(off.list)
      })
    }
  }
})

test.describe("ADSR-05 helper, Colors hierarchy, App shells, Storage and Chat (PUI-125..PUI-128)", () => {
  test("the helper row exists only for Tactile, with the exact copy and a decorative info icon", async ({ page }, info) => {
    await open(page)
    await editorCategory(page, "Effects")
    const field = page.getByTestId("control-ui-effect")
    await expect(page.getByTestId("ui-effect-help")).toHaveCount(0)
    const offHeight = (await box(field)).height
    await setEffect(page, "Tactile")
    const help = page.getByTestId("ui-effect-help")
    await expect(help).toHaveText("Applied to secondary buttons and tabs.")
    const icon = page.getByTestId("ui-effect-help-icon")
    await expect(icon).toHaveAttribute("aria-hidden", "true")
    const [i, t] = [await box(icon), await box(help.locator("span"))]
    expect(Math.abs(i.y + i.height / 2 - (t.y + t.height / 2))).toBeLessThanOrEqual(1.5)
    expect(i.x).toBeLessThan(t.x)
    expect(t.x - (i.x + i.width)).toBeLessThanOrEqual(8)
    expect(await css(help, "color")).toBe(await page.locator("body").evaluate(() => { const p = document.createElement("span"); p.style.color = "var(--muted-foreground)"; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c }))
    expect(await css(help, "background-color")).toBe("rgba(0, 0, 0, 0)")
    expect(await css(help, "border-top-width")).toBe("0px")
    await shot(page, info, "adsr-helper-tactile")
    await setEffect(page, "Off")
    await expect(page.getByTestId("ui-effect-help")).toHaveCount(0)
    expect((await box(field)).height).toBe(offHeight)
  })

  test("Colors: uppercase text-sm group headings (PUI-131), title-case labels at the HEX size, muted HEX", async ({ page }, info) => {
    await open(page)
    await previewView(page, "Design system")
    const colors = preview(page).locator('[data-design-section="colors"]')
    const h3 = colors.getByRole("heading", { level: 3, name: "Primary" })
    expect(await css(h3, "text-transform")).toBe("uppercase")
    expect(await css(h3, "font-size")).toBe("14px")
    const labels = colors.getByTestId("token-label")
    for (const label of await labels.all()) expect(await css(label, "text-transform")).toBe("none")
    await expect(colors.locator('[data-token="ring"] [data-testid="token-label"]')).toHaveText("Ring")
    await expect(colors.locator('[data-token="chart-1"] [data-testid="token-label"]')).toHaveText("Chart-1")
    expect(await css(labels.first(), "font-size")).toBe(await css(colors.getByTestId("token-value").first(), "font-size"))
    expect(await css(labels.first(), "color")).toBe(await css(h3, "color"))
    expect(await css(colors.getByTestId("token-value").first(), "color")).not.toBe(await css(h3, "color"))
    // Headings do not wrap or clip.
    for (const heading of await colors.getByRole("heading", { level: 3 }).all()) {
      expect(await heading.evaluate((el) => el.scrollWidth <= el.clientWidth + 1 && el.getBoundingClientRect().height < 30)).toBe(true)
    }
    await shot(page, info, "adsr-colors")
  })

  for (const mode of ["light", "dark"] as const) {
    test(`App shells are about 90% wide, proportionally tall, with a sidebar-surface Inset body and restrained panel (${mode})`, async ({ page }, info) => {
      test.setTimeout(90_000)
      await open(page)
      await setColorMode(page, mode)
      await previewView(page, "App shells")
      const frame = preview(page)
      const panel = frame.getByRole("tabpanel", { name: "App shells", exact: true })
      const root = frame.locator("[data-app-shells]")
      const rootBox = await box(root)
      const frames = await Promise.all([0, 1, 2].map((i) => box(panel.locator("[data-app-shell]").nth(i).locator(":scope > div"))))
      for (const f of frames) {
        if (isMobileShell(page)) expect(Math.abs(f.width - rootBox.width)).toBeLessThanOrEqual(1)
        else {
          expect(f.width / rootBox.width).toBeGreaterThan(0.88)
          expect(f.width / rootBox.width).toBeLessThan(0.92)
          expect(f.width / f.height).toBeGreaterThan(1.3)
          expect(f.width / f.height).toBeLessThan(2)
        }
        expect(f.height).toBeGreaterThanOrEqual(480 - 1)
      }
      // Desktop-app chrome: 64px header (48px compact) and wider sidebars than the accepted 15rem/14rem/12.5rem caps.
      const headerHeight = (title: string) => frame.locator(`[data-app-shell="${title}"] [data-shell-header]`).evaluate((el) => el.parentElement!.getBoundingClientRect().height)
      expect(await headerHeight("Classic workspace")).toBe(64)
      expect(await headerHeight("Compact utility")).toBe(48)
      // Inset: sidebar and connected body are the dedicated sidebar surface (PUI-140, formerly muted); the inset panel is
      // the background surface with the 2xs shadow.
      const inset = frame.locator('[data-app-shell="Inset project"]')
      expect(await css(inset.locator('[data-slot="sidebar"]'), "background-color")).toBe(await token(frame, "sidebar"))
      expect(await css(inset.locator("[data-shell-body]"), "background-color")).toBe(await token(frame, "sidebar"))
      // PUI-140: every outer shell frame is flat, edged by the semantic border rather than an outer shadow.
      for (const title of ["Classic workspace", "Inset project", "Compact utility"]) {
        const outer = frame.locator(`[data-app-shell="${title}"] [data-slot="sidebar-wrapper"]`)
        expect(await css(outer, "box-shadow"), title).toBe("none")
        expect(await css(outer, "border-top-color"), title).toBe(await token(frame, "border"))
      }
      expect(await css(inset.locator("[data-shell-inset]"), "background-color")).toBe(await token(frame, "background"))
      const insetShadow = await css(inset.locator("[data-shell-inset]"), "box-shadow")
      // Tailwind composes the theme's 2xs tier (runtime variable --shadow-layers-2xs) after its empty ring/inset slots.
      const twoXs = await inset.locator("[data-shell-inset]").evaluate((node) => { const p = document.createElement("span"); p.style.boxShadow = "var(--shadow-layers-2xs)"; node.append(p); const s = getComputedStyle(p).boxShadow; p.remove(); return s })
      expect(twoXs).not.toBe("none")
      expect(insetShadow.endsWith(`, ${twoXs}`)).toBe(true)
      expect(insetShadow.replace(/rgba\(0, 0, 0, 0\) 0px 0px 0px 0px, /g, "")).toBe(twoXs)
      // Classic and Compact keep their sidebar surface.
      for (const title of ["Classic workspace", "Compact utility"]) expect(await css(frame.locator(`[data-app-shell="${title}"] [data-slot="sidebar"]`), "background-color")).toBe(await token(frame, "sidebar"))
      // Independent collapse and Workbench isolation.
      const workbenchState = isMobileShell(page) ? null : await page.locator('[data-slot="sidebar"]').first().getAttribute("data-state")
      await frame.getByRole("button", { name: "Toggle Inset project sidebar", exact: true }).click()
      await expect(inset).toHaveAttribute("data-shell-state", "collapsed")
      await expect(frame.locator('[data-app-shell="Classic workspace"]')).toHaveAttribute("data-shell-state", "expanded")
      await expect(frame.locator('[data-app-shell="Compact utility"]')).toHaveAttribute("data-shell-state", "expanded")
      if (workbenchState) expect(await page.locator('[data-slot="sidebar"]').first().getAttribute("data-state")).toBe(workbenchState)
      expect(await frame.locator("html").evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
      await frame.getByRole("button", { name: "Toggle Inset project sidebar", exact: true }).click()
      await expect(inset).toHaveAttribute("data-shell-state", "expanded")
      await shot(page, info, `adsr-shells-${mode}`)
      await axeRecord(page, info, `shells-${mode}`)
    })
  }

  test("Storage's Manage storage fills the content width; Chat send stays a circle at any theme radius", async ({ page }, info) => {
    await open(page)
    await previewView(page, "Cards")
    const frame = preview(page)
    const storage = frame.locator('[data-composition="plan-usage"]')
    const manage = storage.getByRole("button", { name: "Manage storage", exact: true })
    const content = storage.locator('[data-slot="card-content"]')
    const [b, c] = [await box(manage), await box(content)]
    const padding = parseFloat(await css(content, "padding-left")) + parseFloat(await css(content, "padding-right"))
    expect(Math.abs(b.width - (c.width - padding))).toBeLessThanOrEqual(0.5)
    expect(b.height).toBe(36)
    await expect(manage).toHaveAttribute("data-variant", "secondary")
    const chat = frame.locator('[data-composition="team-chat"]')
    const send = chat.getByRole("button", { name: "Send message", exact: true })
    const composer = chat.locator('[data-slot="chat-composer"]')
    const composerRadii: string[] = []
    for (const radius of ["0", "2.5", "0.5"]) {
      await editorCategory(page, "Geometry")
      await page.getByRole("textbox", { name: "Radius", exact: true }).fill(radius)
      await page.getByRole("textbox", { name: "Radius", exact: true }).blur()
      await workspaceMode(page, "Preview")
      await expect.poll(() => rootVar(frame, "--radius")).toBe(radius === "0" ? "0rem" : `${radius}rem`)
      const s = await box(send)
      expect(s.width).toBe(28)
      expect(s.height).toBe(28)
      expect(parseFloat(await css(send, "border-top-left-radius"))).toBeGreaterThanOrEqual(14)
      composerRadii.push(await css(composer, "border-top-left-radius"))
    }
    expect(new Set(composerRadii).size).toBe(3)
    await chat.getByRole("textbox", { name: "Message Maya Chen" }).focus()
    await page.keyboard.press("Tab")
    await expect(send).toBeFocused()
    await expect.poll(() => css(send, "box-shadow")).toMatch(/0px 0px 0px 3px/)
    await shot(page, info, "adsr-storage-chat")
  })
})
