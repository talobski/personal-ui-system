import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { editorCategory, previewStates, previewView, saveTheme, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * tactile-ui-effects-v1-001 producer definitions (PUI-113), retargeted by ui-effects-showcase-polish-v1-001
 * (PUI-119/PUI-120/PUI-121; Lead-executed under playwright.workbench.config.ts at 390x844 and 1440x900). TUE-04 /
 * IESP-04 Off/Tactile controls; TUE-05 / IESP-05 Secondary Button only (Outline flat); TUE-06 surface Tabs, now
 * including the default-surface category tabs; TUE-07 light/dark, strength bounds and decoded axe; TUE-02 save/reload.
 * amber-dusk-shell-refinement-v1-001 (PUI-124/PUI-125, ADSR-04/05): surface Tabs take only a fixed TabsList
 * `ring-1 ring-ring/20` while Tactile, their triggers keep default shadcn styling, and the helper is Tactile-only.
 * tactile-border-designsystem-type-v1-001 (PUI-129) recolours that decorative ring to `ring-1 ring-border/80`.
 * accepted-implementation-review-inset-tabs-v1-001 (PUI-133) draws it inward: `inset-ring-1 inset-ring-border/80`.
 * The unified interaction-depth system extends Tactile to every interactive control through Raised, Filled, Recessed,
 * Pressed and Flat roles; the TabsList edge and outer elevation reach their theme value at the default strength, and
 * strength 0 renders exactly like Off.
 */

const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const style = (el: Locator) => el.evaluate((node) => {
  const s = getComputedStyle(node)
  return { boxShadow: s.boxShadow, backgroundImage: s.backgroundImage, backgroundColor: s.backgroundColor, borderRadius: s.borderRadius, height: s.height, fontSize: s.fontSize, fontWeight: s.fontWeight }
})
const variant = (frame: FrameLocator, name: string) => frame.locator(`[data-testid="preview"] section[aria-labelledby="pv-buttons"] [data-slot="button"][data-variant="${name}"]`).first()
const surfaceTabs = (frame: FrameLocator) => frame.getByRole("tablist", { name: "Surface tabs sample" })
const tactile = (s: { backgroundImage: string; boxShadow: string }) => s.backgroundImage.includes("linear-gradient") && s.boxShadow.includes("inset")
/**
 * The fixed PUI-124 TabsList edge, inward since PUI-133: one inset 1px ring layer in the list's box-shadow and no outer
 * 1px ring layer. Off (`false`) has no 1px layer of either kind.
 */
const listRing = (s: { boxShadow: string }) => /0px 0px 0px 1px inset/.test(s.boxShadow) && !/0px 0px 0px 1px(?! inset)/.test(s.boxShadow)
const anyListRing = (s: { boxShadow: string }) => /0px 0px 0px 1px/.test(s.boxShadow)

async function open(page: Page) {
  await page.goto("/workbench")
  await expect(preview(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
}

async function uiEffects(page: Page) {
  await editorCategory(page, "Effects")
  return {
    effect: page.getByRole("combobox", { name: "Effect", exact: true }),
    strength: page.getByRole("textbox", { name: "Strength", exact: true }),
    slider: page.getByRole("slider", { name: "Strength", exact: true }),
  }
}

async function setEffect(page: Page, effect: "Off" | "Tactile") {
  const control = (await uiEffects(page)).effect
  if ((await control.textContent())?.includes(effect)) return
  await control.click()
  await page.getByRole("option", { name: effect, exact: true }).click()
  await expect(control).toHaveText(new RegExp(effect))
}

async function snapshot(page: Page) {
  const frame = preview(page)
  await previewStates(page)
  // Settle the prior active Cards tab before comparing inactive styles.
  await expect.poll(() => frame.locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
  const variants = Object.fromEntries(await Promise.all(["default", "secondary", "outline", "ghost", "destructive", "link"].map(async (name) => [name, await style(variant(frame, name))] as const)))
  const tabs = surfaceTabs(frame)
  return {
    variants,
    activeTab: await style(tabs.getByRole("tab", { selected: true })),
    inactiveTab: await style(tabs.getByRole("tab", { name: "Activity" })),
    categoryTab: await style(frame.getByRole("tablist", { name: "Preview views" }).getByRole("tab", { selected: true })),
    inactiveCategoryTab: await style(frame.getByRole("tablist", { name: "Preview views" }).getByRole("tab", { name: "Cards", exact: true })),
    surfaceList: await style(tabs),
    categoryList: await style(frame.getByRole("tablist", { name: "Preview views" })),
  }
}

async function axe(page: Page, info: TestInfo, label: string) {
  await page.mouse.move(0, 0)
  await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const blocking = await seriousOutsideKnownDebt(page, violations, info, `tue-${label}`)
  await info.attach(`axe-tue-${label}.json`, { body: JSON.stringify(blocking, null, 2), contentType: "application/json" })
  expect(blocking.filter((v) => v.impact === "critical" || v.impact === "serious"), label).toEqual([])
}

test("TUE-04 / IESP-04 the UI EFFECTS section sits between Shadow and Motion with Off/Tactile, a helper and one Strength", async ({ page }) => {
  await open(page)
  const c = await uiEffects(page)
  const sections = await page.locator('[role="tabpanel"]:visible [data-testid^="section-"]').evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")))
  expect(sections).toEqual(["section-shadow", "section-ui-effects", "section-motion"])
  const section = page.getByTestId("section-ui-effects")
  await expect(section.getByRole("button", { name: "UI Effects" })).toBeVisible()
  await expect(c.effect).toHaveText(/Off/)
  // PUI-125: Off renders no helper row and no description.
  await expect(page.getByTestId("ui-effect-help")).toHaveCount(0)
  await expect(c.effect).not.toHaveAttribute("aria-describedby")
  await c.effect.click()
  await expect(page.getByRole("option")).toHaveText(["Off", "Tactile"])
  await page.keyboard.press("Escape")
  // No per-target toggles remain anywhere in the section.
  await expect(section.getByRole("switch")).toHaveCount(0)
  await expect(page.getByText(/Outline buttons|Secondary buttons$/)).toHaveCount(0)
  await expect(c.slider).toHaveAttribute("aria-valuemin", "0")
  await expect(c.slider).toHaveAttribute("aria-valuemax", "100")
  await expect(c.strength).toHaveValue("50")
  // Off: Strength is semantically disabled and de-emphasized; Tactile makes it active.
  await expect(c.strength).toBeDisabled()
  await expect(c.slider).toBeDisabled()
  await expect(c.slider).not.toHaveAttribute("tabindex", "0")
  await expect(c.slider).toHaveAttribute("aria-valuenow", "50")
  await expect(page.getByTestId("control-uiEffectsStrength")).toHaveAttribute("data-disabled", "true")
  expect(Number(await page.getByTestId("control-uiEffectsStrength").locator("label").evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(1)
  // The Effect select is keyboard operable.
  await c.effect.focus()
  await page.keyboard.press("Enter")
  await page.getByRole("option", { name: "Tactile", exact: true }).press("Enter")
  await expect(c.effect).toHaveText(/Tactile/)
  await expect(c.strength).toBeEnabled()
  await expect(page.getByTestId("control-uiEffectsStrength")).not.toHaveAttribute("data-disabled", "true")
  await expect(c.effect).toHaveAccessibleDescription("Applied to buttons, fields, tabs and selection controls.")
  await expect(page.getByTestId("ui-effect-help")).toHaveText("Applied to buttons, fields, tabs and selection controls.")
  await expect(page.getByTestId("ui-effect-help-icon")).toHaveAttribute("aria-hidden", "true")
})

/** The States view's controls, one locator per role/state, read for depth, colour and geometry. */
function statesControls(frame: FrameLocator) {
  const root = frame.locator('[data-testid="preview"]')
  const tabs = surfaceTabs(frame)
  const line = frame.getByRole("tablist", { name: "Line tabs sample" })
  const range = frame.getByRole("radiogroup", { name: "Calendar range" })
  const choices = root.locator('section[aria-labelledby="pv-choices"]')
  const inputs = root.locator('section[aria-labelledby="pv-inputs"]')
  return {
    raised: { secondary: variant(frame, "secondary"), outline: variant(frame, "outline"), toggleOff: range.getByRole("radio", { name: "Day" }) },
    filled: { primary: variant(frame, "default"), checkboxOn: choices.getByRole("checkbox", { name: "Mentions" }), radioOn: choices.getByRole("radio", { name: "Email" }), switchOn: choices.getByRole("switch", { name: "Sync" }) },
    recessed: {
      input: frame.getByRole("textbox", { name: "Default", exact: true }), invalid: inputs.locator('[aria-invalid="true"]'), textarea: frame.getByRole("textbox", { name: "Notes" }),
      select: inputs.locator('[data-slot="select-trigger"]'), group: inputs.locator('[data-slot="input-group"]'), checkboxOff: choices.getByRole("checkbox", { name: "Weekly digest" }),
      radioOff: choices.getByRole("radio", { name: "SMS" }), switchOff: choices.getByRole("switch", { name: "Autosave" }), surfaceList: tabs,
    },
    pressed: { toggleOn: range.getByRole("radio", { name: "Week" }) },
    flat: {
      ghost: variant(frame, "ghost"), destructive: variant(frame, "destructive"), link: variant(frame, "link"), disabledButton: root.getByRole("button", { name: "Disabled", exact: true }),
      disabledInput: frame.getByRole("textbox", { name: "Disabled", exact: true }), groupControl: inputs.locator('[data-slot="input-group-control"]'), toggleDisabled: range.getByRole("radio", { name: "Year" }),
      checkboxDisabled: choices.getByRole("checkbox", { name: "Product news" }), radioDisabled: choices.getByRole("radio", { name: "Post" }), switchDisabled: choices.getByRole("switch", { name: "Beta" }),
      activeTab: tabs.getByRole("tab", { selected: true }), inactiveTab: tabs.getByRole("tab", { name: "Activity" }), lineList: line, lineActive: line.getByRole("tab", { selected: true }), elevation: frame.getByTestId("elevation-sample"),
    },
  }
}
const read = (el: Locator) => el.evaluate((node) => {
  const s = getComputedStyle(node)
  const r = node.getBoundingClientRect()
  return { boxShadow: s.boxShadow, backgroundImage: s.backgroundImage, backgroundColor: s.backgroundColor, borderColor: s.borderTopColor, color: s.color, font: `${s.fontSize} ${s.fontWeight}`, radius: s.borderRadius, box: [r.x, r.y, r.width, r.height].map(Math.round).join(",") }
})
async function readAll(page: Page) {
  const frame = preview(page)
  await previewStates(page)
  await page.mouse.move(0, 0)
  await expect.poll(() => frame.locator("html").evaluate(() => document.getAnimations().length)).toBe(0)
  const groups = statesControls(frame)
  const out: Record<string, Record<string, Awaited<ReturnType<typeof read>>>> = {}
  for (const [role, controls] of Object.entries(groups)) {
    out[role] = {}
    for (const [name, locator] of Object.entries(controls)) out[role]![name] = await read(locator)
  }
  return out
}
/** Raised and Filled draw a 1px inner top highlight and 1px inner lower shade; Recessed and Pressed a soft 2px inset. */
const edged = (shadow: string) => /0px 1px 0px 0px inset/.test(shadow) && /0px -1px 0px 0px inset/.test(shadow)
const inset = (shadow: string) => /0px 1px 2px 0px inset/.test(shadow)
/** Any visible outer (non-inset) layer other than a focus ring. */
const outerElevation = (shadow: string) => shadow.split(/,(?![^(]*\))/).some((layer) => !layer.includes("inset") && !/\/ 0\)|rgba\(0, 0, 0, 0\)/.test(layer))

test("Tactile gives every interactive control its semantic depth, keeps static, line and disabled controls flat, never moves geometry, and Off restores", async ({ page }) => {
  await open(page)
  const flat = await readAll(page)
  for (const role of Object.values(flat)) for (const s of Object.values(role)) expect(s.backgroundImage).toBe("none")

  await setEffect(page, "Tactile")
  const on = await readAll(page)
  // Visual only: geometry, radius, fill, foreground and type never change.
  for (const [role, controls] of Object.entries(on)) {
    for (const [name, s] of Object.entries(controls)) {
      for (const key of ["box", "radius", "backgroundColor", "color", "font"] as const) expect(s[key], `${role}.${name}.${key}`).toBe(flat[role]![name]![key])
    }
  }
  for (const [name, s] of Object.entries(on.raised!)) expect(edged(s.boxShadow), `raised ${name}`).toBe(true)
  for (const [name, s] of Object.entries(on.filled!)) expect(edged(s.boxShadow), `filled ${name}`).toBe(true)
  for (const [name, s] of Object.entries(on.recessed!)) expect(inset(s.boxShadow), `recessed ${name}`).toBe(true)
  expect(inset(on.pressed!.toggleOn!.boxShadow)).toBe(true)
  expect(outerElevation(on.pressed!.toggleOn!.boxShadow)).toBe(false)
  // Secondary carries its wash and Primary its one-sided face wash; Primary also gains the theme's xs elevation.
  expect(tactile(on.raised!.secondary!)).toBe(true)
  expect(tactile(on.filled!.primary!)).toBe(true)
  for (const [name, s] of [...Object.entries(on.raised!), ...Object.entries(on.filled!)]) if (name !== "secondary" && name !== "primary") expect(s.backgroundImage, name).toBe("none")
  expect(outerElevation(on.filled!.primary!.boxShadow)).toBe(true)
  // Flat: ghost, destructive and link Buttons, disabled controls, the grouped field, every tab trigger, the line tabs and
  // the static Elevation surface are exactly Off.
  for (const [name, s] of Object.entries(on.flat!)) expect(s, `flat ${name}`).toEqual(flat.flat![name])

  // Secondary composed through an asChild trigger (the Workbench's collapsible section triggers) keeps its recipe, the
  // borderless theme menu trigger is opted out, and the gallery's Secondary Buttons follow.
  await editorCategory(page, "Effects")
  expect(tactile(await style(page.getByTestId("section-ui-effects").locator('[data-slot="collapsible-trigger"]')))).toBe(true)
  expect(listRing(await style(page.getByRole("tablist", { name: "Editor categories" })))).toBe(true)
  expect((await style(page.getByRole("combobox", { name: "Active theme" }))).boxShadow).not.toMatch(/inset/)
  await previewView(page, "Cards")
  for (const name of ["Manage storage", "GitHub", "Google"]) expect(tactile(await style(preview(page).getByRole("button", { name, exact: true }))), name).toBe(true)
  // Hand-built field groups recess once, on the row.
  const quickFind = preview(page).getByRole("searchbox", { name: "Search commands" })
  expect(inset((await style(quickFind)).boxShadow)).toBe(false)
  expect(inset(await quickFind.evaluate((el) => getComputedStyle(el.parentElement!).boxShadow))).toBe(true)

  // Strength 0 and Off both return every control, including the surface tab edge, to exactly its flat style.
  const strength = (await uiEffects(page)).strength
  await strength.fill("0")
  await strength.blur()
  expect(await readAll(page)).toEqual(flat)
  expect(listRing(await style(surfaceTabs(preview(page))))).toBe(false)
  await setEffect(page, "Off")
  expect(await readAll(page)).toEqual(flat)
})

test("TUE-05 / IESP-05 focus rings, keyboard activation, pressed, open and hover states, and focus/invalid precedence hold", async ({ page }) => {
  await open(page)
  await setEffect(page, "Tactile")
  const frame = preview(page)
  await previewStates(page)
  const secondary = variant(frame, "secondary")
  await variant(frame, "default").focus()
  await page.keyboard.press("Tab")
  await expect(secondary).toBeFocused()
  await expect(secondary).toHaveCSS("box-shadow", /0px 0px 0px 3px/)
  const focused = await style(secondary)
  expect(focused.boxShadow).toMatch(/inset/)
  expect(focused.boxShadow).toMatch(/0px 0px 0px 3px/)
  await page.mouse.move(0, 0)
  await frame.locator("body").evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  const rest = (await style(secondary)).boxShadow
  expect(rest).toMatch(/inset/)
  const handle = await secondary.boundingBox()
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2)
  await page.mouse.down()
  const pressed = await style(secondary)
  await page.mouse.up()
  expect(pressed.boxShadow).not.toBe(rest)
  expect(pressed.boxShadow).toMatch(/0px 1px 2px 0px inset/)

  // Primary: pressing reverses its depth and removes its outer elevation, without any press translation.
  const primary = variant(frame, "default")
  const primaryRest = await read(primary)
  const p = await primary.boundingBox()
  await page.mouse.move(p!.x + p!.width / 2, p!.y + p!.height / 2)
  await page.mouse.down()
  await expect.poll(async () => (await read(primary)).boxShadow).toMatch(/0px 1px 2px 0px inset/)
  const primaryPressed = await read(primary)
  await page.mouse.up()
  expect(outerElevation(primaryRest.boxShadow)).toBe(true)
  expect(outerElevation(primaryPressed.boxShadow)).toBe(false)
  expect(primaryPressed.box).toBe(primaryRest.box)
  expect(await primary.evaluate((el) => getComputedStyle(el).transform)).toBe("none")
  // Its face flips when pressed, as Secondary's wash does.
  const stops = (image: string) => { const parts = [""]; let depth = 0; for (const c of image.slice("linear-gradient(".length, -1)) { depth += c === "(" ? 1 : c === ")" ? -1 : 0; if (c === "," && depth === 0) parts.push(""); else parts[parts.length - 1] += c } return parts.map((part) => part.trim()) }
  expect(primaryRest.backgroundImage).toMatch(/^linear-gradient\(/)
  expect(stops(primaryPressed.backgroundImage)).toEqual(stops(primaryRest.backgroundImage).reverse())

  // Outline: hover strengthens the border; an open dialog trigger reads as pressed.
  const outline = variant(frame, "outline")
  await page.mouse.move(0, 0)
  await expect.poll(async () => (await read(outline)).boxShadow).toMatch(/0px 1px 0px 0px inset/)
  const outlineRest = await read(outline)
  await outline.hover()
  await expect.poll(async () => (await read(outline)).borderColor).not.toBe(outlineRest.borderColor)
  // A modal dialog hides the page from role queries, so the trigger is held by its markup.
  const openDialog = frame.locator('[data-testid="preview"] section[aria-labelledby="pv-dialog"] [data-variant="outline"]')
  await openDialog.click()
  await expect(openDialog).toHaveAttribute("data-state", "open")
  await expect.poll(async () => (await read(openDialog)).boxShadow).toMatch(/0px 1px 2px 0px inset/)
  await page.keyboard.press("Escape")
  await expect(openDialog).toHaveAttribute("data-state", "closed")

  // Fields: focus and invalid borders outrank hover, and the focus ring composes with the recess.
  const field = frame.getByRole("textbox", { name: "Default", exact: true })
  const fieldRest = await read(field)
  await field.hover()
  await expect.poll(async () => (await read(field)).borderColor).not.toBe(fieldRest.borderColor)
  await field.focus()
  await page.keyboard.press("Shift+Tab")
  await page.keyboard.press("Tab")
  await expect(field).toBeFocused()
  const ring = await field.evaluate((el) => { const probe = document.createElement("span"); probe.style.color = "var(--ring)"; el.parentElement!.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c })
  await expect.poll(async () => (await read(field)).borderColor).toBe(ring)
  await expect.poll(async () => (await read(field)).boxShadow).toMatch(/0px 0px 0px 3px/)
  expect((await read(field)).boxShadow).toMatch(/0px 1px 2px 0px inset/)
  const invalid = frame.locator('[data-testid="preview"] [aria-invalid="true"]')
  const invalidRest = await read(invalid)
  await invalid.hover()
  await page.waitForTimeout(250)
  expect((await read(invalid)).borderColor).toBe(invalidRest.borderColor)
})

test("TUE-07 strength is bounded and scales; dark mode swaps the semantic light source; decoded axe", async ({ page }, info) => {
  await open(page)
  await setEffect(page, "Tactile")
  const frame = preview(page)
  const highlight = async () => {
    await previewStates(page)
    return variant(frame, "secondary").evaluate((node) => getComputedStyle(node).getPropertyValue("--ui-tactile-shade").trim())
  }
  const c = await uiEffects(page)
  // Strength 0 emits nothing, exactly like Off.
  await c.strength.fill("0")
  await c.strength.blur()
  expect(await highlight()).toBe("")
  await editorCategory(page, "Effects")
  await c.strength.fill("100")
  await c.strength.blur()
  expect(await highlight()).toMatch(/ 10%, transparent\)$/)
  await editorCategory(page, "Effects")
  // Out of bounds is rejected locally (the draft and its error stay visible); the applied strength stays 100.
  await c.strength.fill("101")
  await expect(page.getByTestId("uiEffectsStrength-error")).toBeVisible()
  await expect(c.slider).toHaveAttribute("aria-valuenow", "100")
  await c.strength.blur()
  expect(await highlight()).toMatch(/ 10%, transparent\)$/)

  for (const mode of ["light", "dark"] as const) {
    await setColorMode(page, mode)
    await previewStates(page)
    // The highlight is mixed from the semantic Background token in light and the Foreground token in dark.
    const { highlight: source, token } = await variant(frame, "secondary").evaluate((node, name) => ({
      highlight: getComputedStyle(node).getPropertyValue("--ui-tactile-highlight").trim(),
      token: getComputedStyle(node).getPropertyValue(name).trim(),
    }), mode === "light" ? "--background" : "--foreground")
    expect(source).toBe(`color-mix(in oklab, ${token} ${mode === "light" ? 90 : 14}%, transparent)`)
    await info.attach(`tue-states-${mode}.png`, { body: await page.screenshot(), contentType: "image/png" })
    await axe(page, info, `states-${mode}`)
  }
})

test("TUE-04/02 history, dirty state, chrome Secondary triggers and save/reload with Effect and Strength only", async ({ page }) => {
  await open(page)
  await setEffect(page, "Tactile")
  await workspaceMode(page, "Preview")
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled()
  await page.getByRole("button", { name: "Undo", exact: true }).click()
  await previewStates(page)
  expect(tactile(await style(variant(preview(page), "secondary")))).toBe(false)
  await workspaceMode(page, "Preview")
  await page.getByRole("button", { name: "Redo", exact: true }).click()
  await previewStates(page)
  expect(tactile(await style(variant(preview(page), "secondary")))).toBe(true)

  // The active theme's effect reaches Workbench chrome controls: Outline ones (Save As Cancel) are raised, without the
  // Secondary wash.
  await saveTheme(page)
  const dialog = page.getByRole("dialog", { name: "Save as a custom theme" })
  await expect(dialog).toBeVisible()
  const cancel = await style(dialog.getByRole("button", { name: "Cancel", exact: true }))
  expect(tactile(cancel)).toBe(false)
  expect(edged(cancel.boxShadow)).toBe(true)
  await dialog.getByLabel("Theme name").fill("Tactile Check")
  await dialog.getByRole("button", { name: "Save theme", exact: true }).click()
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "tactile-check")

  await page.reload()
  await expect(preview(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
  const c = await uiEffects(page)
  await expect(c.effect).toHaveText(/Tactile/)
  await expect(c.strength).toHaveValue("50")
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("personal-ui-workbench/v1")!).themes["tactile-check"].uiEffects)
  expect(stored).toEqual({ effect: { $type: "string", $value: "tactile" }, strength: { $type: "number", $value: 50 } })
})
