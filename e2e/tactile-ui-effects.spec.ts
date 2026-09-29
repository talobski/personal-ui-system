import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Locator, Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { editorCategory, previewStates, saveTheme, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * tactile-ui-effects-v1-001 producer definitions (PUI-113), retargeted by ui-effects-showcase-polish-v1-001
 * (PUI-119/PUI-120/PUI-121; Lead-executed under playwright.workbench.config.ts at 390x844 and 1440x900). TUE-04 /
 * IESP-04 Off/Tactile controls; TUE-05 / IESP-05 Secondary Button only (Outline flat); TUE-06 surface Tabs, now
 * including the default-surface category tabs; TUE-07 light/dark, strength bounds and decoded axe; TUE-02 save/reload.
 * amber-dusk-shell-refinement-v1-001 (PUI-124/PUI-125, ADSR-04/05): surface Tabs take only a fixed TabsList
 * `ring-1 ring-ring/20` while Tactile, their triggers keep default shadcn styling, and the helper is Tactile-only.
 * tactile-border-designsystem-type-v1-001 (PUI-129) recolours that decorative ring to `ring-1 ring-border/80`.
 */

const preview = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const style = (el: Locator) => el.evaluate((node) => {
  const s = getComputedStyle(node)
  return { boxShadow: s.boxShadow, backgroundImage: s.backgroundImage, backgroundColor: s.backgroundColor, borderRadius: s.borderRadius, height: s.height, fontSize: s.fontSize, fontWeight: s.fontWeight }
})
const variant = (frame: FrameLocator, name: string) => frame.locator(`[data-testid="preview"] section[aria-labelledby="pv-buttons"] [data-slot="button"][data-variant="${name}"]`).first()
const surfaceTabs = (frame: FrameLocator) => frame.getByRole("tablist", { name: "Surface tabs sample" })
const tactile = (s: { backgroundImage: string; boxShadow: string }) => s.backgroundImage.includes("linear-gradient") && s.boxShadow.includes("inset")
/** The fixed PUI-124 TabsList ring: one 1px ring layer in the list's box-shadow. */
const listRing = (s: { boxShadow: string }) => / 0px 0px 0px 1px/.test(` ${s.boxShadow}`) || /0px 0px 0px 1px/.test(s.boxShadow)

async function open(page: Page) {
  await page.goto("/")
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
  await expect(c.effect).toHaveAccessibleDescription("Applied to secondary buttons and tabs.")
  await expect(page.getByTestId("ui-effect-help")).toHaveText("Applied to secondary buttons and tabs.")
  await expect(page.getByTestId("ui-effect-help-icon")).toHaveAttribute("aria-hidden", "true")
})

test("TUE-05/06 / IESP-05 / ADSR-04 Tactile reaches Secondary Buttons and surface TabsLists only; Off is flat", async ({ page }) => {
  await open(page)
  const flat = await snapshot(page)
  for (const s of [...Object.values(flat.variants), flat.activeTab, flat.inactiveTab, flat.categoryTab, flat.inactiveCategoryTab]) expect(tactile(s)).toBe(false)
  for (const s of [flat.surfaceList, flat.categoryList]) expect(listRing(s)).toBe(false)

  await setEffect(page, "Tactile")
  const on = await snapshot(page)
  expect(tactile(on.variants.secondary!)).toBe(true)
  // PUI-124: every trigger, active or not, keeps exactly its default shadcn styling; the list gets the fixed ring.
  expect(on.activeTab).toEqual(flat.activeTab)
  expect(on.categoryTab).toEqual(flat.categoryTab)
  for (const [list, before] of [[on.surfaceList, flat.surfaceList], [on.categoryList, flat.categoryList]] as const) {
    expect(listRing(list)).toBe(true)
    expect(list.backgroundImage).toBe("none")
    for (const key of ["backgroundColor", "borderRadius", "height"] as const) expect(list[key]).toBe(before[key])
  }
  // Geometry, typography and surface colour are untouched; only the shadow slot and wash change.
  for (const key of ["backgroundColor", "borderRadius", "height", "fontSize", "fontWeight"] as const) {
    expect(on.variants.secondary![key]).toBe(flat.variants.secondary![key])
  }
  // Outline and every other variant, and inactive triggers, stay exactly flat.
  for (const name of ["default", "outline", "ghost", "destructive", "link"]) expect(on.variants[name], name).toEqual(flat.variants[name])
  expect(on.inactiveTab).toEqual(flat.inactiveTab)
  expect(on.inactiveCategoryTab).toEqual(flat.inactiveCategoryTab)

  // Secondary composed through an asChild trigger (the Workbench's collapsible section triggers) keeps the effect;
  // outline ToggleGroup items and Outline asChild triggers stay flat.
  await editorCategory(page, "Effects")
  expect(tactile(await style(page.getByTestId("section-ui-effects").locator('[data-slot="collapsible-trigger"]')))).toBe(true)
  expect(tactile(await style(page.getByRole("tablist", { name: "Editor categories" }).getByRole("tab", { selected: true })))).toBe(false)
  expect(listRing(await style(page.getByRole("tablist", { name: "Editor categories" })))).toBe(true)
  expect(tactile(await style(page.getByRole("tablist", { name: "Editor categories" }).getByRole("tab", { name: "Colors", exact: true })))).toBe(false)
  await previewStates(page)
  expect(tactile(await style(preview(page).getByRole("button", { name: "Open dialog", exact: true })))).toBe(false)
  const cards = preview(page).getByRole("tablist", { name: "Preview views" }).getByRole("tab", { name: "Cards", exact: true })
  await cards.click()
  const toggleItems = preview(page).locator('[data-slot="toggle-group-item"]')
  expect(await toggleItems.count()).toBeGreaterThan(0)
  for (const item of await toggleItems.all()) expect(tactile(await style(item))).toBe(false)
  for (const name of ["Manage storage", "GitHub", "Google"]) expect(tactile(await style(preview(page).getByRole("button", { name, exact: true }))), name).toBe(true)

  // Keyboard selection keeps selected semantics and the ordinary focus-visible ring; no trigger takes the recipe.
  const frame = preview(page)
  await previewStates(page)
  const activity = surfaceTabs(frame).getByRole("tab", { name: "Activity" })
  await surfaceTabs(frame).getByRole("tab", { name: "Overview" }).focus()
  await page.keyboard.press("ArrowRight")
  await expect(activity).toHaveAttribute("aria-selected", "true")
  await expect(activity).toBeFocused()
  // The trigger transitions its box-shadow, so the settled focus ring is polled.
  await expect.poll(async () => (await style(activity)).boxShadow).toMatch(/0px 0px 0px 3px/)
  expect(tactile(await style(activity))).toBe(false)
  expect(tactile(await style(surfaceTabs(frame).getByRole("tab", { name: "Overview" })))).toBe(false)
  expect(listRing(await style(surfaceTabs(frame)))).toBe(true)

  // Off returns every target to its flat style.
  await setEffect(page, "Off")
  const off = await snapshot(page)
  expect(off.variants).toEqual(flat.variants)
  for (const s of [off.activeTab, off.categoryTab]) expect(tactile(s)).toBe(false)
  expect(off.surfaceList).toEqual(flat.surfaceList)
  expect(off.categoryList).toEqual(flat.categoryList)
})

test("TUE-05 / IESP-05 focus-visible rings, keyboard activation, and the pressed state hold on a tactile Secondary Button", async ({ page }) => {
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
})

test("TUE-07 strength is bounded and scales; dark mode swaps the semantic light source; decoded axe", async ({ page }, info) => {
  await open(page)
  await setEffect(page, "Tactile")
  const frame = preview(page)
  const highlight = async () => {
    await previewStates(page)
    return variant(frame, "secondary").evaluate((node) => getComputedStyle(node).getPropertyValue("--ui-tactile-lower").trim())
  }
  const c = await uiEffects(page)
  await c.strength.fill("0")
  await c.strength.blur()
  expect(await highlight()).toMatch(/ 0%, transparent\)$/)
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

  // The active theme's effect reaches Workbench chrome Secondary controls but not Outline ones (Save As Cancel).
  await saveTheme(page)
  const dialog = page.getByRole("dialog", { name: "Save as a custom theme" })
  await expect(dialog).toBeVisible()
  expect(tactile(await style(dialog.getByRole("button", { name: "Cancel", exact: true })))).toBe(false)
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
