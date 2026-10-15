import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

import { seriousOutsideKnownDebt } from "./known-contrast-debt"
import { colorInput, editorCategory, isMobileShell, saveTheme, selectTheme, workspaceMode } from "./workbench-navigation"

/**
 * PUI-143/PUI-144 (LWR-01..05) producer checks, run under playwright.workbench.config.ts at 390x844 and 1440x900:
 * the landing page at `/`, the editor at `/workbench`, stable built-in links, URL precedence without stored-selection
 * writes, History API selection sync, safe unknown-slug normalization, reserved `/themes` paths, and the preview
 * iframe's move to `/workbench?preview=1`.
 */

const STORAGE_KEY = "personal-ui-workbench/v1"
const SLUGS = { default: "default", "quiet-editorial": "quiet-editorial", "amber-dusk": "amber-dusk" } as const

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const activeTheme = (page: Page) => page.locator("#workbench-active-theme")
const storedBytes = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)
const pathname = (page: Page) => page.evaluate(() => location.pathname)

/** The Workbench is coherent: chrome, toolbar and a ready preview that renders the expected theme. */
async function expectWorkbench(page: Page, themeId: string) {
  // By element, not role: the open mobile sidebar sheet makes the page behind it inert to the accessibility tree.
  await expect(page.locator("h1", { hasText: "Personal UI Workbench" })).toBeAttached()
  await expect(page.getByTestId("workbench-toolbar")).toBeVisible()
  await expect(activeTheme(page)).toHaveAttribute("data-theme-id", themeId)
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-theme-id", themeId)
  await expect(page.getByTestId("landing")).toHaveCount(0)
}

/** A saved custom theme (a renamed copy of the built-in Default fixture) plus a stored selection, written before load. */
async function seedStorage(page: Page, activeId: string) {
  await page.goto("/workbench")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await saveTheme(page, "Route Keep")
  await expect(activeTheme(page)).toHaveAttribute("data-theme-id", "route-keep")
  await page.evaluate(([key, id]) => {
    const stored = JSON.parse(localStorage.getItem(key!)!)
    localStorage.setItem(key!, JSON.stringify({ ...stored, activeId: id }))
  }, [STORAGE_KEY, activeId])
  return (await storedBytes(page))!
}

async function expectNoSeriousViolations(page: Page, label: string, testInfo: TestInfo) {
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)).toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = await seriousOutsideKnownDebt(page, violations, testInfo, `lwr-${label}`)
  await testInfo.attach(`axe-lwr-${label}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious, `${label}: ${JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]))}`).toEqual([])
}

const noHorizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)

test.describe("LWR-01 landing page", () => {
  test("/ is a distinct, accessible landing page whose CTA opens /workbench in place, with back/forward", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/")
    const landing = page.getByTestId("landing")
    await expect(landing).toBeVisible()
    await expect(page).toHaveTitle(/Personal UI/)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Shape a theme once. Every surface follows.")
    await expect(page.getByRole("banner")).toBeVisible()
    await expect(page.getByRole("main")).toBeVisible()
    await expect(page.getByRole("contentinfo")).toBeVisible()
    // Not the editor: no Workbench chrome and no preview document.
    await expect(page.locator("iframe")).toHaveCount(0)
    await expect(page.getByTestId("workbench-toolbar")).toHaveCount(0)
    await expect(page.getByRole("combobox", { name: "Active theme" })).toHaveCount(0)
    // The landing page never writes Workbench storage.
    expect(await storedBytes(page)).toBeNull()
    expect(await noHorizontalOverflow(page)).toBe(true)

    const cta = page.getByTestId("landing-primary-cta")
    await expect(cta).toHaveAttribute("href", "/workbench")
    await expect(cta).toHaveAccessibleName("Open the Workbench")
    await expectNoSeriousViolations(page, `landing-light`, testInfo)

    const entries = await page.evaluate(() => history.length)
    await cta.click()
    await expect(page).toHaveURL(/\/workbench$/)
    await expectWorkbench(page, "default")
    expect(await page.evaluate(() => history.length)).toBe(entries + 1)
    await expect(page).toHaveTitle("Personal UI Workbench")
    // Back returns to the landing page; forward reopens the editor from local state.
    await page.goBack()
    await expect(page).toHaveURL(/\/$/)
    await expect(landing).toBeVisible()
    await expect(page.locator("iframe")).toHaveCount(0)
    await page.goForward()
    await expectWorkbench(page, "default")
  })

  test("keyboard: skip link, header CTA and primary CTA are reachable and activate with Enter", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByTestId("landing")).toBeVisible()
    await page.keyboard.press("Tab")
    const skip = page.getByRole("link", { name: "Skip to content" })
    await expect(skip).toBeFocused()
    await expect(skip).toBeInViewport()
    await page.keyboard.press("Enter")
    await expect(page.locator("#main")).toBeFocused()
    // The primary CTA follows the hero copy in tab order.
    for (let i = 0; i < 6 && !(await page.getByTestId("landing-primary-cta").evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab")
    await expect(page.getByTestId("landing-primary-cta")).toBeFocused()
    await page.keyboard.press("Enter")
    await expectWorkbench(page, "default")
    await expect(page).toHaveURL(/\/workbench$/)
  })

  test("the theme dial and mode switch restyle the page from real built-in fixtures, light and dark, without storage", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/")
    const landing = page.getByTestId("landing")
    const background = () => landing.evaluate((el) => getComputedStyle(el).backgroundColor)
    const defaultLight = await background()
    await page.getByTestId("landing-theme-dial").getByRole("radio", { name: "Amber Dusk" }).click()
    await expect(landing).toHaveAttribute("data-theme-id", "amber-dusk")
    expect(await page.locator("#landing-theme").evaluate((el) => el.textContent)).toContain("--primary:")
    expect(await background()).not.toBe(defaultLight)
    await page.getByRole("switch", { name: "Toggle dark mode" }).click()
    await expect(landing).toHaveAttribute("data-mode", "dark")
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true)
    expect(await noHorizontalOverflow(page)).toBe(true)
    await expectNoSeriousViolations(page, "landing-amber-dark", testInfo)
    // Theme code shows the generated output for the theme the page is wearing.
    await expect(page.getByTestId("landing-code-json")).toContainText('"$value": "oklch(0.5773 0.1375 39.0427)"')
    await expect(page.getByTestId("landing-code-json")).not.toContainText('"id"')
    expect(await storedBytes(page)).toBeNull()
    // Each built-in card links to its stable Workbench path.
    for (const [slug, id] of Object.entries(SLUGS)) await expect(page.getByTestId(`landing-open-${id}`)).toHaveAttribute("href", `/workbench/themes/${slug}`)
    await page.getByTestId("landing-open-quiet-editorial").click()
    await expect(page).toHaveURL(/\/workbench\/themes\/quiet-editorial$/)
    await expectWorkbench(page, "quiet-editorial")
    // Leaving the landing page clears its dark class; the Workbench starts in its own light mode.
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false)
    await expect(page.locator("#landing-theme")).toHaveCount(0)
  })

  test("every built-in, light and dark, passes decoded axe with no horizontal overflow", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/")
    const landing = page.getByTestId("landing")
    for (const [name, id] of [["Default", "default"], ["Quiet Editorial", "quiet-editorial"], ["Amber Dusk", "amber-dusk"]] as const) {
      await page.getByTestId("landing-theme-dial").getByRole("radio", { name }).click()
      await expect(landing).toHaveAttribute("data-theme-id", id)
      for (const mode of ["light", "dark"] as const) {
        if ((await landing.getAttribute("data-mode")) !== mode) await page.getByRole("switch", { name: "Toggle dark mode" }).click()
        await expect(landing).toHaveAttribute("data-mode", mode)
        expect(await noHorizontalOverflow(page), `${id}-${mode}`).toBe(true)
        await expectNoSeriousViolations(page, `landing-${id}-${mode}`, testInfo)
      }
    }
  })

  test("reduced motion: the landing page runs no animations; motion is decorative otherwise", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/")
    await expect(page.getByTestId("landing")).toBeVisible()
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length)).toBe(0)
    expect(await page.locator(".landing-rise").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none")
  })

  test("the hero specimen is inert real compositions, outside the tab order", async ({ page }) => {
    await page.goto("/")
    const specimen = page.getByTestId("landing-specimen")
    await expect(specimen).toHaveAttribute("inert", "")
    await expect(specimen.locator("[data-slot=card]").first()).toBeVisible()
    expect(await specimen.evaluate((el) => el.contains(document.activeElement))).toBe(false)
  })
})

test.describe("LWR-02/03 editor route and built-in links", () => {
  test("/workbench restores a valid stored selection, or Default when fresh", async ({ page }) => {
    await page.goto("/workbench")
    await expectWorkbench(page, "default")
    expect(await pathname(page)).toBe("/workbench")
    expect(await storedBytes(page)).toBeNull()
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ themes: {}, activeId: "amber-dusk", bases: {} })), STORAGE_KEY)
    await page.goto("/workbench")
    await expectWorkbench(page, "amber-dusk")
    // The plain editor URL is kept as opened; only a selection change moves it.
    expect(await pathname(page)).toBe("/workbench")
  })

  for (const [slug, id] of Object.entries(SLUGS)) {
    test(`/workbench/themes/${slug} opens ${id} ahead of the stored selection, writes nothing, and survives refresh and a fresh tab`, async ({ page, context }) => {
      const before = await seedStorage(page, id === "quiet-editorial" ? "amber-dusk" : "quiet-editorial")
      await page.goto(`/workbench/themes/${slug}`)
      await expectWorkbench(page, id)
      expect(await pathname(page)).toBe(`/workbench/themes/${slug}`)
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
      // URL selection alone writes neither theme data nor the stored selection; the custom theme is untouched.
      expect(await storedBytes(page)).toBe(before)
      await page.reload()
      await expectWorkbench(page, id)
      expect(await storedBytes(page)).toBe(before)
      const fresh = await context.newPage()
      await fresh.goto(`/workbench/themes/${slug}`)
      await expectWorkbench(fresh, id)
      expect(await storedBytes(fresh)).toBe(before)
      await fresh.close()
      // Plain /workbench still restores the stored selection.
      await page.goto("/workbench")
      await expectWorkbench(page, JSON.parse(before).activeId)
    })
  }

  test("a recipient with no local state gets the built-in fixture, not anyone's edits", async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto("/workbench/themes/amber-dusk")
    await expectWorkbench(page, "amber-dusk")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
    await expect(activeTheme(page)).toHaveAttribute("data-revision", "1")
    expect(await storedBytes(page)).toBeNull()
    await context.close()
  })
})

test.describe("LWR-04 navigation", () => {
  test("selecting a built-in replaces the path with its stable URL; a custom theme makes /workbench current; no new entries", async ({ page }) => {
    await page.goto("/workbench")
    await expectWorkbench(page, "default")
    const entries = await page.evaluate(() => history.length)
    await selectTheme(page, "amber-dusk")
    await expect.poll(() => pathname(page)).toBe("/workbench/themes/amber-dusk")
    // Explicit selection keeps the accepted persistence rule: only the selection is stored.
    expect(JSON.parse((await storedBytes(page))!)).toMatchObject({ activeId: "amber-dusk", themes: {} })
    await selectTheme(page, "quiet-editorial")
    await expect.poll(() => pathname(page)).toBe("/workbench/themes/quiet-editorial")
    await saveTheme(page, "Path Custom")
    await expect(activeTheme(page)).toHaveAttribute("data-theme-id", "path-custom")
    await expect.poll(() => pathname(page)).toBe("/workbench")
    await selectTheme(page, "default")
    await expect.poll(() => pathname(page)).toBe("/workbench/themes/default")
    await selectTheme(page, "path-custom")
    await expect.poll(() => pathname(page)).toBe("/workbench")
    expect(await page.evaluate(() => history.length)).toBe(entries)
    // Refresh at /workbench restores the stored custom selection.
    await page.reload()
    await expectWorkbench(page, "path-custom")
  })

  test("unknown and malformed slugs normalize to /workbench and start from valid local state", async ({ page }) => {
    await page.goto("/workbench")
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ themes: {}, activeId: "quiet-editorial", bases: {} })), STORAGE_KEY)
    const before = await storedBytes(page)
    for (const path of ["/workbench/themes/not-a-theme", "/workbench/themes/Amber-Dusk", "/workbench/themes/toString", "/workbench/themes/amber-dusk/extra", "/workbench/elsewhere", "/workbench/"]) {
      await page.goto(path)
      await expect.poll(() => pathname(page), path).toBe("/workbench")
      await expectWorkbench(page, "quiet-editorial")
      expect(await storedBytes(page)).toBe(before)
    }
  })

  test("back/forward between built-in paths keeps the mounted Workbench, its working state and history, without storage writes", async ({ page }) => {
    await page.goto("/workbench/themes/default")
    await expectWorkbench(page, "default")
    await editorCategory(page, "Colors")
    await colorInput(page, "primary").fill("oklch(0.5 0.1 30)")
    await colorInput(page, "primary").press("Enter")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")
    await workspaceMode(page, "Preview")
    const revision = await activeTheme(page).getAttribute("data-revision")
    const before = await storedBytes(page)
    // A same-document entry onto another built-in, as an in-app link or the address bar's history would create.
    await page.evaluate(() => {
      history.pushState(null, "", "/workbench/themes/amber-dusk")
      dispatchEvent(new PopStateEvent("popstate"))
    })
    await expectWorkbench(page, "amber-dusk")
    await page.goBack()
    await expect.poll(() => pathname(page)).toBe("/workbench/themes/default")
    await expectWorkbench(page, "default")
    await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")
    await expect(activeTheme(page)).toHaveAttribute("data-revision", revision!)
    await workspaceMode(page, "Preview")
    await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeEnabled()
    await page.goForward()
    await expectWorkbench(page, "amber-dusk")
    expect(await storedBytes(page)).toBe(before)
  })
})

test.describe("LWR-04/05 reserved paths and preview isolation", () => {
  test("/themes and /themes/:slug are reserved and unimplemented", async ({ page }) => {
    for (const path of ["/themes", "/themes/amber-dusk"]) {
      await page.goto(path)
      await expect(page.getByRole("heading", { name: "Page not found", level: 1 })).toBeVisible()
      expect(await pathname(page)).toBe(path)
      await expect(page.locator("iframe")).toHaveCount(0)
      await expect(page.getByTestId("landing")).toHaveCount(0)
    }
    await page.getByRole("link", { name: "Open the Workbench" }).click()
    await expectWorkbench(page, "default")
  })

  test("the preview iframe loads /workbench?preview=1, and / never selects the preview entry", async ({ page }) => {
    await page.goto("/workbench/themes/amber-dusk")
    await expectWorkbench(page, "amber-dusk")
    await expect(page.getByTestId("preview-frame")).toHaveAttribute("src", "/workbench?preview=1")
    const frame = page.frames().find((f) => f.url().endsWith("/workbench?preview=1"))
    expect(frame).toBeDefined()
    // The preview document keeps its own location; parent URL sync never touches it.
    expect(await frame!.evaluate(() => location.pathname + location.search)).toBe("/workbench?preview=1")
    await page.goto("/?preview=1")
    await expect(page.getByTestId("landing")).toBeVisible()
    await expect(page.getByTestId("preview")).toHaveCount(0)
    // The mobile shell keeps its own sidebar sheet; desktop keeps the persistent sidebar beside the preview.
    await page.goto("/workbench")
    await expectWorkbench(page, "default")
    if (isMobileShell(page)) await expect(page.getByRole("dialog", { name: "Sidebar", exact: true })).toHaveCount(0)
  })
})
