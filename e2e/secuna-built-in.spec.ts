import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import type { FrameLocator, Page } from "@playwright/test"

import { previewView, setColorMode, workspaceMode } from "./workbench-navigation"

/**
 * Secuna built-in: it follows Pocketmarket in the picker, renders the fixture's colours and tones in both modes (the
 * re-derived Dark tones, never the stale export defaults), and a custom theme saved under the id `secuna` before the
 * promotion survives under the next free id with its values.
 */
const FIXTURE = JSON.parse(readFileSync(new URL("../packages/core/src/theme/fixtures/secuna.json", import.meta.url), "utf8"))
const STALE_DARK_TONE_1 = "oklch(0.320862 0.049065 248.554392)"
const STORAGE_KEY = "personal-ui-workbench/v1"

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')
const property = (frame: FrameLocator, name: string) => frame.locator("html").evaluate((_, value) => getComputedStyle(document.documentElement).getPropertyValue(value).trim(), name)

async function openSecuna(page: Page) {
  await page.goto("/workbench/themes/secuna")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "secuna")
}

test.describe("SECU-01 Secuna built-in", () => {
  test("follows Pocketmarket in the Built-in group of the theme picker", async ({ page }) => {
    await openSecuna(page)
    await workspaceMode(page, "Controls")
    await page.getByRole("combobox", { name: "Active theme" }).click()
    await expect(page.getByRole("group", { name: "Built-in", exact: true }).getByRole("option")).toHaveText(["Default", "Quiet Editorial", "Amber Dusk", "Pocketmarket", "Secuna"])
    await expect(page.getByRole("group", { name: "Custom", exact: true })).toHaveCount(0)
  })

  for (const mode of ["light", "dark"] as const) {
    test(`renders its colours and tones, and the Design system view shows each tone pair (${mode})`, async ({ page }) => {
      await openSecuna(page)
      await setColorMode(page, mode)
      const frame = previewFrame(page)
      for (const name of ["background", "foreground", "primary", "muted", "border", "chart-3"]) {
        await expect.poll(() => property(frame, `--${name}`), name).toBe(FIXTURE.colors[mode][name].$value)
      }
      // Dedicated Sidebar tokens are off, so the Sidebar resolves to its base alias.
      await expect.poll(() => property(frame, "--sidebar")).toBe(FIXTURE.colors[mode].background.$value)
      for (const [token, { $value }] of Object.entries<{ $value: string }>(FIXTURE.tones[mode])) {
        await expect.poll(() => property(frame, `--${token}`), token).toBe($value)
      }
      if (mode === "dark") expect(await property(frame, "--tone-1")).not.toBe(STALE_DARK_TONE_1)
      await previewView(page, "Design system")
      const panel = frame.getByRole("tabpanel", { name: "Design system", exact: true })
      for (const n of [1, 2, 3, 4, 5, 6]) {
        for (const [token, label] of [[`tone-${n}`, `Tone ${n} Background`], [`tone-${n}-foreground`, `Tone ${n} Foreground`]] as const) {
          const swatch = panel.locator(`[data-token="${token}"]`)
          await expect(swatch.getByTestId("token-label")).toHaveText(label)
          await expect(swatch.getByTestId("token-value")).toHaveAttribute("data-resolved", FIXTURE.tones[mode][token].$value)
          await expect(swatch.getByTestId("token-value")).toHaveText(/^#[0-9A-F]{6}$/)
        }
      }
    })
  }

  test("keeps a custom theme saved as secuna before the promotion, under secuna-2 with its values", async ({ page }) => {
    const custom = { ...structuredClone(FIXTURE), name: "Secuna", revision: 3 }
    custom.colors.light.primary.$value = "oklch(0.5 0.1 150)"
    await page.addInitScript(([key, value]) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value) }, [STORAGE_KEY, JSON.stringify({ themes: { secuna: custom }, activeId: "secuna", bases: { secuna: "default" } })] as const)
    await page.goto("/workbench")
    await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
    // The saved selection follows the custom theme to its new id, and its own primary renders.
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "secuna-2")
    await expect.poll(() => property(previewFrame(page), "--primary")).toBe("oklch(0.5 0.1 150)")
    await workspaceMode(page, "Controls")
    await page.getByRole("combobox", { name: "Active theme" }).click()
    await expect(page.getByRole("group", { name: "Built-in", exact: true }).getByRole("option")).toHaveText(["Default", "Quiet Editorial", "Amber Dusk", "Pocketmarket", "Secuna"])
    await expect(page.getByRole("group", { name: "Custom", exact: true }).getByRole("option")).toHaveText(["Secuna"])
    // Choosing the built-in persists the selection; the custom theme is written under its new key, never dropped.
    await page.getByRole("group", { name: "Built-in", exact: true }).getByRole("option", { name: "Secuna", exact: true }).click()
    await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "secuna")
    await expect.poll(() => property(previewFrame(page), "--primary")).toBe(FIXTURE.colors.light.primary.$value)
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)
    expect(Object.keys(stored.themes)).toEqual(["secuna-2"])
    expect(stored.themes["secuna-2"]).toMatchObject({ id: "secuna-2", name: "Secuna", revision: 3 })
    expect(stored.themes["secuna-2"].colors.light.primary.$value).toBe("oklch(0.5 0.1 150)")
    expect(stored.bases).toEqual({ "secuna-2": "default" })
  })
})
