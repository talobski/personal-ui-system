import { workspaceMode, previewStates, selectTheme } from "./workbench-navigation"
import { readFileSync, writeFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

/**
 * PH3-07 default-equivalence guardrail. At the canonical default theme (quiet-editorial, light), the computed
 * font-family, box-shadow, and border-radius of a fixed set of preview elements must equal the values committed in
 * e2e/fixtures/default-computed-styles.json. That fixture was captured BEFORE the renderer indirection landed.
 *
 * Sampled (all inside the preview iframe; mode-independent properties, so light only):
 *   body                              -> font-family                       (font-sans on body)
 *   button "default"                  -> font-family, box-shadow, border-radius   (shadow-xs, rounded-md)
 *   input labelled "Default"          -> font-family, box-shadow, border-radius   (shadow-xs, rounded-md)
 *   [data-testid=elevation-sample]    -> font-family, box-shadow, border-radius   (shadow-md, rounded-md)
 *   [data-slot=dialog-content] at the 1024px preview width -> font-family, box-shadow, border-radius (shadow-lg, rounded-lg)
 * Not sampled: font-mono, and the sm radius/shadow tokens (no preview element consumes them).
 *
 * Recapture (only on the pre-indirection renderer): CAPTURE_DEFAULT_STYLES=1 pnpm test:browser:workbench.
 */
const FIXTURE = new URL("./fixtures/default-computed-styles.json", import.meta.url)
const PROPERTIES = ["fontFamily", "boxShadow", "borderRadius"] as const

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

const sample = (locator: Locator) =>
  locator.evaluate((el, props) => {
    const style = getComputedStyle(el)
    return Object.fromEntries(props.map((p) => [p, style[p]]))
  }, PROPERTIES as unknown as (keyof CSSStyleDeclaration)[]) as Promise<Record<string, string>>

async function collect(page: Page) {
  const frame = previewFrame(page)
  await page.goto("/")
  // Fresh state is now the built-in Default; the guardrail stays pinned to the accepted Quiet Editorial theme.
  await selectTheme(page, "quiet-editorial")
  await previewStates(page)
  await expect(frame.getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await expect(frame.getByTestId("preview")).toHaveAttribute("data-theme-id", "quiet-editorial")
  await workspaceMode(page, "Preview")
  await page.getByRole("radio", { name: "Light", exact: true }).click()
  await expect(frame.getByTestId("preview")).toHaveAttribute("data-mode", "light")
  await workspaceMode(page, "Preview")
  await page.getByRole("radio", { name: "Desktop 1024" }).click()

  const result: Record<string, Record<string, string>> = {}
  result["body"] = { fontFamily: (await sample(frame.locator("body"))).fontFamily! }
  result["button-default"] = await sample(frame.getByRole("button", { name: "default", exact: true, includeHidden: true }))
  result["input-default"] = await sample(frame.getByRole("textbox", { name: "Default", exact: true }))
  result["elevation-sample"] = await sample(frame.getByTestId("elevation-sample"))

  await frame.getByRole("button", { name: "Open dialog" }).click()
  const dialog = frame.locator('[data-slot="dialog-content"]')
  await expect(dialog).toBeVisible()
  result["dialog-content"] = await sample(dialog)
  return result
}

/**
 * Theme v2 themes the `shadow-xs` tier that v1 left to Tailwind's default, using the identical colour (black at 5%,
 * `rgb(0 0 0 / 0.05)` in tailwindcss 4.3.3) written as canonical OKLCH. The browser serializes computed colours in the
 * space they were authored in, so this exact achromatic-black spelling is mapped to its identical sRGB form on both
 * sides (the committed fixture already mixes the two spellings) before comparison; any other difference still fails.
 */
const sameBlack = (value: string) => value.replace(/oklch\(0 0 0 \/ ([\d.]+)\)/g, "rgba(0, 0, 0, $1)")

test("Quiet Editorial resolves to the pre-indirection computed font, shadow, and radius", async ({ page }) => {
  const actual = JSON.parse(sameBlack(JSON.stringify(await collect(page))))
  if (process.env.CAPTURE_DEFAULT_STYLES) {
    writeFileSync(FIXTURE, `${JSON.stringify(actual, null, 2)}\n`)
    return
  }
  expect(actual).toEqual(JSON.parse(sameBlack(readFileSync(FIXTURE, "utf8"))))
})
