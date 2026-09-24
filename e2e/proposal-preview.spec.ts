import { stageCommand } from "./design-command-fixture"
import { workspaceMode, editorCategory, previewStates, assertActiveControls, saveTheme, selectTheme, setColorMode } from "./workbench-navigation"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const STORAGE_KEY = "personal-ui-workbench/v1"
const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

const proposal = (id: string, revision: number, overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    schemaVersion: "1.0",
    proposalId: id,
    base: { themeId: "quiet-editorial", revision },
    provenance: { source: "fixture", sourceId: "spec", createdAt: "2026-09-21T10:00:00Z", intentSummary: "Rounder, calmer, warmer." },
    operations: [
      { op: "setRadius", value: "1rem" },
      { op: "setMotionDuration", value: "320ms" },
      { op: "setColor", mode: "light", token: "primary", value: "oklch(0.4 0.1 150)" },
      { op: "setColor", mode: "dark", token: "primary", value: "oklch(0.8 0.1 150)" },
    ],
    ...overrides,
  })

/**
 * These lifecycle checks exercise Quiet Editorial (the accepted v1 theme, now a migrated built-in) so every resolved
 * baseline value below is unchanged from the accepted phase; fresh state itself is Default (theme-v2 spec).
 */
async function openWorkbench(page: Page, mode: "light" | "dark") {
  await page.goto("/")
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-theme-id", "default")
  await selectTheme(page, "quiet-editorial")
  await previewStates(page)
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-theme-id", "quiet-editorial")
  await setColorMode(page, mode)
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-mode", mode)
}

const stageText = async (page: Page, text: string) => {
  await stageCommand(page, JSON.parse(text).operations)
}

const previewStyle = (page: Page, testId: string, prop: keyof CSSStyleDeclaration) =>
  previewFrame(page).getByTestId(testId).evaluate((el, p) => String(getComputedStyle(el)[p]), prop)
const buttonMotion = (page: Page) =>
  previewFrame(page).getByRole("button", { name: "default", exact: true, includeHidden: true }).evaluate((el) => getComputedStyle(el).transitionDuration)
// One computed-style probe per theme category, all read from the preview iframe.
const categoryStyles = (page: Page) =>
  previewFrame(page).locator("html").evaluate(() => {
    const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement
    const button = Array.from(document.querySelectorAll("button")).find((b) => b.textContent === "default") as HTMLElement
    const elevation = getComputedStyle(byTestId("elevation-sample"))
    return {
      color: getComputedStyle(button).backgroundColor,
      radius: elevation.borderRadius,
      density: elevation.paddingTop,
      typography: elevation.fontFamily,
      shadow: elevation.boxShadow,
      motion: getComputedStyle(button).transitionDuration,
    }
  })
// The mode switch starts a colour transition; sample a baseline only once the iframe has no running animations.
const settled = (page: Page) =>
  expect.poll(() => previewFrame(page).locator("html").evaluate(() => document.getAnimations().length), { message: "iframe animations settled" }).toBe(0)
// The browser's own serialisation of a colour, so the expectation is computed-vs-computed.
const resolveColor = (page: Page, value: string) =>
  previewFrame(page).locator("html").evaluate((_, v) => {
    const probe = document.createElement("div")
    probe.style.backgroundColor = v
    document.body.append(probe)
    const resolved = getComputedStyle(probe).backgroundColor
    probe.remove()
    return resolved
  }, value)
const storedThemes = (page: Page) => page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY)
const revision = (page: Page) => page.locator("#workbench-active-theme")

async function expectNoSeriousViolations(page: Page, label: string, testInfo: TestInfo) {
  await page.mouse.move(0, 0)
  await expect
    .poll(async () => (await page.evaluate(() => document.getAnimations().length)) + (await previewFrame(page).locator("html").evaluate(() => document.getAnimations().length)))
    .toBe(0)
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((v) => v.impact === "critical" || v.impact === "serious")
  await testInfo.attach(`axe-${label}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious, `${label}: ${JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]))}`).toEqual([])
}

for (const mode of ["light", "dark"] as const) {
  test.describe(`mutation proposal preview — ${mode}`, () => {
    test("stages a multi-operation proposal as a non-committing candidate, then Discard restores everything", async ({ page }, testInfo) => {
      await openWorkbench(page, mode)
      await previewFrame(page).locator("html").evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true))
      const storageBefore = await storedThemes(page)
      const radiusBefore = await previewStyle(page, "elevation-sample", "borderRadius")
      expect(radiusBefore).toBe("8px")
      expect(await buttonMotion(page)).toBe("0.2s")

      await stageText(page, proposal("stage-1", 1))
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await expect(page.getByTestId("proposal-error")).toHaveCount(0)

      // Four operations produce exactly one candidate revision; the active theme is untouched.
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("2")
      await expect(revision(page)).toHaveAttribute("data-revision", "1")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")

      // The candidate is visible through the existing iframe path, with no reload.
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("16px")
      await expect.poll(buttonMotion.bind(null, page)).toBe("0.32s")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "2")

      // Structured diff, sorted by path.
      const paths = await page.getByTestId("proposal-diff-list").locator("li").evaluateAll((items) => items.map((li) => li.getAttribute("data-path")))
      expect(paths).toEqual(["colors.dark.primary", "colors.light.primary", "motion.durationBase", "radius.md"])
      await expect(page.getByTestId("proposal-diff-list").locator('[data-path="radius.md"]')).toContainText('"0.5rem" → "1rem"')
      expect(await storedThemes(page)).toBe(storageBefore)
      await workspaceMode(page, "Preview")
      await expectNoSeriousViolations(page, `${mode}-proposal-staged`, testInfo)

      // Discard: candidate gone, active and persisted state byte-identical.
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Discard proposal" }).click()
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(revision(page)).toHaveAttribute("data-revision", "1")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe(radiusBefore)
      await expect.poll(buttonMotion.bind(null, page)).toBe("0.2s")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "1")
      expect(await storedThemes(page)).toBe(storageBefore)
      expect(await previewFrame(page).locator("html").evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)

      // A second command receives a fresh session id against the unchanged base.
      await stageText(page, proposal("stage-2", 1))
      await expect(page.getByTestId("proposal-staged")).toHaveAttribute("data-proposal-id", "design-command-2")
    })

    test("one staged proposal changes computed iframe styles for all six categories without reload, then Discard restores them", async ({ page }, testInfo) => {
      await openWorkbench(page, mode)
      await previewFrame(page).locator("html").evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true))
      const storageBefore = await storedThemes(page)
      await settled(page)
      const before = await categoryStyles(page)
      // Canonical default resolved values (quiet-editorial), so a "changed" assertion cannot pass against a broken baseline.
      expect(before.radius).toBe("8px")
      expect(before.density).toBe("12px")
      expect(before.typography).toMatch(/^Inter,/)
      expect(before.shadow).toContain("0px 4px 8px -2px")
      expect(before.motion).toBe("0.2s")

      const operations = [
        { op: "setColor", mode: "light", token: "primary", value: "oklch(0.4 0.1 150)" },
        { op: "setColor", mode: "dark", token: "primary", value: "oklch(0.8 0.1 150)" },
        { op: "setRadius", value: "1rem" },
        { op: "setDensity", value: 1.5 },
        { op: "setSansFamily", value: "Georgia" },
        { op: "setShadowBlur", value: "20px" },
        { op: "setMotionDuration", value: "320ms" },
      ]
      expect(operations.length).toBeLessThanOrEqual(8)
      await stageText(page, proposal("six-1", 1, { operations }))
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await expect(page.getByTestId("proposal-error")).toHaveCount(0)
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("2")
      await expect(revision(page)).toHaveAttribute("data-revision", "1")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "2")

      // Computed-style evidence per category (resolved by the browser, not CSS-variable presence).
      const expectedColor = await resolveColor(page, mode === "light" ? "oklch(0.4 0.1 150)" : "oklch(0.8 0.1 150)")
      expect(expectedColor).not.toBe(before.color)
      await expect.poll(async () => (await categoryStyles(page)).color, { message: "color" }).toBe(expectedColor)
      await expect.poll(async () => (await categoryStyles(page)).radius, { message: "radius" }).toBe("16px")
      await expect.poll(async () => (await categoryStyles(page)).density, { message: "density" }).toBe("18px")
      await expect.poll(async () => (await categoryStyles(page)).typography, { message: "typography" }).toMatch(/^Georgia,/)
      await expect.poll(async () => (await categoryStyles(page)).shadow, { message: "shadow" }).toContain("0px 4px 20px -2px")
      await expect.poll(async () => (await categoryStyles(page)).motion, { message: "motion" }).toBe("0.32s")
      const candidate = await categoryStyles(page)
      for (const key of ["color", "radius", "density", "typography", "shadow", "motion"] as const) expect(candidate[key], key).not.toBe(before[key])
      expect(candidate.shadow).not.toContain("0px 4px 8px -2px")

      // Active theme, persistence, and the iframe document are untouched.
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
      expect(await storedThemes(page)).toBe(storageBefore)
      expect(await previewFrame(page).locator("html").evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
      const paths = await page.getByTestId("proposal-diff-list").locator("li").evaluateAll((items) => items.map((li) => li.getAttribute("data-path")))
      expect(paths).toEqual([
        "colors.dark.primary",
        "colors.light.primary",
        "motion.durationBase",
        "radius.md",
        "shadow.md",
        "space.density",
        "typography.sans",
      ])
      await workspaceMode(page, "Preview")
      await expectNoSeriousViolations(page, `${mode}-six-categories-staged`, testInfo)

      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Discard proposal" }).click()
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(revision(page)).toHaveAttribute("data-revision", "1")
      await expect.poll(() => categoryStyles(page)).toEqual(before)
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "1")
      expect(await storedThemes(page)).toBe(storageBefore)
      expect(await previewFrame(page).locator("html").evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
    })

    test("keyboard activation drives Stage, Discard, second Stage, and Apply through the lifecycle", async ({ page }) => {
      await openWorkbench(page, mode)
      const storageBefore = await storedThemes(page)
      const stageWithKey = async (id: string, key: "Enter" | "Space", base: number) => {
        await stageCommand(page, JSON.parse(proposal(id, base)).operations, key)
      }

      // 1. Stage via Enter: staged candidate, active revision unchanged.
      await stageWithKey("kbd-1", "Enter", 1)
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("2")
      await expect(revision(page)).toHaveAttribute("data-revision", "1")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("16px")

      // 2. Discard via Space: candidate gone, active revision and persistence unchanged.
      const discard = page.getByRole("button", { name: "Discard proposal" })
      await workspaceMode(page, "Preview")
      await discard.focus()
      await expect(discard).toBeFocused()
      await page.keyboard.press("Space")
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(revision(page)).toHaveAttribute("data-revision", "1")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("8px")
      expect(await storedThemes(page)).toBe(storageBefore)

      // 3. Second Stage via Space with a fresh id: staged again against the unchanged base.
      await stageWithKey("kbd-2", "Space", 1)
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("2")
      await expect(revision(page)).toHaveAttribute("data-revision", "1")

      // 4. Apply via Enter: active revision moves 1 -> 2 exactly once, in memory only.
      const apply = page.getByRole("button", { name: "Apply proposal" })
      await workspaceMode(page, "Preview")
      await apply.focus()
      await expect(apply).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(revision(page)).toHaveAttribute("data-revision", "2")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("16px")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "2")
      expect(await storedThemes(page)).toBe(storageBefore)
    })

    test("Apply increments the active revision exactly once, persists only on Save, and each command gets a fresh id", async ({ page }) => {
      await openWorkbench(page, mode)
      const storageBefore = await storedThemes(page)
      await stageText(page, proposal("apply-1", 1))
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Apply proposal" }).click()

      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(revision(page)).toHaveAttribute("data-revision", "2")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("16px")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "2")
      // Apply is in-memory only; Save stays a separate action.
      expect(await storedThemes(page)).toBe(storageBefore)
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in, edited")

      // A new id against the new base works and moves the revision by exactly one more.
      await stageText(page, proposal("apply-2", 2, { operations: [{ op: "setDensity", value: 1.25 }] }))
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("3")
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Apply proposal" }).click()
      await expect(revision(page)).toHaveAttribute("data-revision", "3")

      // Save is the only step that persists, and it persists the applied revision.
      await saveTheme(page, "Applied Theme")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "custom, saved")
      expect(await storedThemes(page)).not.toBe(storageBefore)
      expect(JSON.parse((await storedThemes(page))!).themes).toMatchObject({ "applied-theme": { revision: 1, space: { density: { $value: 1.25 } } } })
    })

    // Arbitrary envelope/base/id/provenance/JSON input is deliberately no longer exposed by the UI.
    // Frozen core proposal tests and lifecycle.test.ts cover duplicate, mismatch and stale records directly.
    test("rejects invalid or oversized command operations atomically at the proposal gate", async ({ page }) => {
      await openWorkbench(page, mode)
      const before = await storedThemes(page)
      for (const [operations, rule] of [
        [[{ op: "setRadius", value: "1rem" }, { op: "setDensity", value: 99 }], "mutation.invalid-value"],
        [Array.from({ length: 9 }, () => ({ op: "setRadius", value: "1rem" })), "proposal.invalid-operations"],
        [[{ op: "setCss", value: "body { display: none }" }], "mutation.unknown-operation"],
      ] as const) {
        await stageCommand(page, operations)
        await expect(page.getByTestId("proposal-error")).toContainText(rule)
        await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
        await expect(revision(page)).toHaveAttribute("data-revision", "1")
        await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("8px")
        expect(await storedThemes(page)).toBe(before)
      }
    })

    test("disables every active-state control while a proposal is staged and re-enables them afterwards", async ({ page }, testInfo) => {
      await openWorkbench(page, mode)
      const storageBefore = await storedThemes(page)
      await assertActiveControls(page, false)

      await stageText(page, proposal("lock-1", 1))
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await assertActiveControls(page, true)
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-locked-note")).toBeVisible()

      // View controls and the proposal's own Apply and Discard stay usable.
      await expect(page.getByRole("switch", { name: "Dark mode" })).toBeEnabled()
      await expect(page.getByRole("button", { name: "Apply proposal" })).toBeEnabled()
      await expect(page.getByRole("button", { name: "Discard proposal" })).toBeEnabled()
      const other = mode === "light" ? "dark" : "light"
      await setColorMode(page, other)
      // Shell and preview stay synchronized while the candidate is staged.
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-mode", other)
      await expect(page.locator("html")).toHaveClass(other === "dark" ? /dark/ : /^(?!.*dark).*$/)
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()

      // Nothing about the active theme or persistence moved.
      await expect(revision(page)).toHaveAttribute("data-revision", "1")
      await expect(page.locator(".quiet-shell")).toHaveAttribute("data-theme-status", "built-in")
      expect(await storedThemes(page)).toBe(storageBefore)
      await workspaceMode(page, "Preview")
      await expectNoSeriousViolations(page, `${mode}-controls-locked`, testInfo)

      // Discard releases the lock.
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Discard proposal" }).click()
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await assertActiveControls(page, false)

      // Apply releases it too.
      await stageText(page, proposal("lock-2", 1))
      await workspaceMode(page, "Preview")
      await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled()
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Apply proposal" }).click()
      await expect(revision(page)).toHaveAttribute("data-revision", "2")
      await assertActiveControls(page, false)
    })
  })
}
