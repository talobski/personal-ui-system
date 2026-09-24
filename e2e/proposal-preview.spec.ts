import { workspaceMode, editorCategory, previewStates, openFork, assertActiveControls } from "./workbench-navigation"
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

async function openWorkbench(page: Page, mode: "light" | "dark") {
  await page.goto("/")
  await previewStates(page)
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await workspaceMode(page, "Preview")
  await page.getByRole("radio", { name: mode === "light" ? "Light" : "Dark", exact: true }).click()
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-mode", mode)
}

const stageText = async (page: Page, text: string) => {
  await editorCategory(page, "Command")
  await page.getByLabel("Proposal JSON").fill(text)
  await page.getByRole("button", { name: "Stage proposal" }).click()
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
const revision = (page: Page) => page.getByTestId("theme-revision")

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
      await expect(page.getByTestId("proposal-log").locator('[data-proposal-id="stage-1"]')).toHaveAttribute("data-status", "staged")

      // Four operations produce exactly one candidate revision; the active theme is untouched.
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("2")
      await expect(revision(page)).toHaveText("1")
      await expect(page.getByTestId("theme-status")).toHaveText("unsaved")
      await workspaceMode(page, "Controls")
      await expect(page.getByTestId("diff-empty")).toBeVisible()

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
      await expect(page.getByTestId("proposal-log").locator('[data-proposal-id="stage-1"]')).toHaveAttribute("data-status", "discarded")
      await expect(revision(page)).toHaveText("1")
      await workspaceMode(page, "Controls")
      await expect(page.getByTestId("diff-empty")).toBeVisible()
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe(radiusBefore)
      await expect.poll(buttonMotion.bind(null, page)).toBe("0.2s")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "1")
      expect(await storedThemes(page)).toBe(storageBefore)
      expect(await previewFrame(page).locator("html").evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)

      // The id stays consumed after discard.
      await stageText(page, proposal("stage-1", 1))
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.duplicate-id at proposalId")
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(page.getByLabel("Proposal JSON")).toHaveAttribute("aria-invalid", "true")
      await expectNoSeriousViolations(page, `${mode}-proposal-error`, testInfo)
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
      await expect(revision(page)).toHaveText("1")
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
      await expect(page.getByTestId("theme-status")).toHaveText("unsaved")
      await workspaceMode(page, "Controls")
      await expect(page.getByTestId("diff-empty")).toBeVisible()
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
      await expect(revision(page)).toHaveText("1")
      await expect.poll(() => categoryStyles(page)).toEqual(before)
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "1")
      expect(await storedThemes(page)).toBe(storageBefore)
      expect(await previewFrame(page).locator("html").evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)
    })

    test("keyboard activation drives Stage, Discard, second Stage, and Apply through the lifecycle", async ({ page }) => {
      await openWorkbench(page, mode)
      const storageBefore = await storedThemes(page)
      const log = (id: string) => page.getByTestId("proposal-log").locator(`[data-proposal-id="${id}"]`)
      const stageButton = page.getByRole("button", { name: "Stage proposal" })
      // Fill, then Tab from the textarea to the Stage button (it is next in the tab order) and activate with a key.
      const stageWithKey = async (id: string, key: "Enter" | "Space", base: number) => {
        const textarea = page.getByLabel("Proposal JSON")
        await editorCategory(page, "Command")
        await textarea.fill(proposal(id, base))
        await textarea.focus()
        await page.keyboard.press("Tab")
        await expect(stageButton).toBeFocused()
        await page.keyboard.press(key)
      }

      // 1. Stage via Enter: staged candidate, active revision unchanged.
      await stageWithKey("kbd-1", "Enter", 1)
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await expect(log("kbd-1")).toHaveAttribute("data-status", "staged")
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("2")
      await expect(revision(page)).toHaveText("1")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("16px")

      // 2. Discard via Space: candidate gone, active revision and persistence unchanged.
      const discard = page.getByRole("button", { name: "Discard proposal" })
      await workspaceMode(page, "Preview")
      await discard.focus()
      await expect(discard).toBeFocused()
      await page.keyboard.press("Space")
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(log("kbd-1")).toHaveAttribute("data-status", "discarded")
      await expect(revision(page)).toHaveText("1")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("8px")
      expect(await storedThemes(page)).toBe(storageBefore)

      // 3. Second Stage via Space with a fresh id: staged again against the unchanged base.
      await stageWithKey("kbd-2", "Space", 1)
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await expect(log("kbd-2")).toHaveAttribute("data-status", "staged")
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("2")
      await expect(revision(page)).toHaveText("1")

      // 4. Apply via Enter: active revision moves 1 -> 2 exactly once, in memory only.
      const apply = page.getByRole("button", { name: "Apply proposal" })
      await workspaceMode(page, "Preview")
      await apply.focus()
      await expect(apply).toBeFocused()
      await page.keyboard.press("Enter")
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(log("kbd-2")).toHaveAttribute("data-status", "applied")
      await expect(revision(page)).toHaveText("2")
      await expect(page.getByTestId("diff-count")).toHaveText("4")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("16px")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "2")
      expect(await storedThemes(page)).toBe(storageBefore)
      await expect(log("kbd-1")).toHaveAttribute("data-status", "discarded")
    })

    test("Apply increments the active revision exactly once, persists only on Save, and consumes the id", async ({ page }) => {
      await openWorkbench(page, mode)
      const storageBefore = await storedThemes(page)
      await stageText(page, proposal("apply-1", 1))
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Apply proposal" }).click()

      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(revision(page)).toHaveText("2")
      await expect(page.getByTestId("proposal-log").locator('[data-proposal-id="apply-1"]')).toHaveAttribute("data-status", "applied")
      await expect(page.getByTestId("diff-count")).toHaveText("4")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("16px")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "2")
      // Apply is in-memory only; Save stays a separate action.
      expect(await storedThemes(page)).toBe(storageBefore)
      await expect(page.getByTestId("theme-status")).toHaveText("unsaved")

      // No second application, and the applied id cannot be replayed.
      await stageText(page, proposal("apply-1", 2))
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.duplicate-id at proposalId")
      await expect(revision(page)).toHaveText("2")

      // A new id against the new base works and moves the revision by exactly one more.
      await stageText(page, proposal("apply-2", 2, { operations: [{ op: "setDensity", value: 1.25 }] }))
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("3")
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Apply proposal" }).click()
      await expect(revision(page)).toHaveText("3")

      // Save is the only step that persists, and it persists the applied revision.
      await openFork(page)
      await page.getByLabel("Fork id").fill("applied-fork")
      await page.getByLabel("Fork name").fill("Applied Fork")
      await page.getByRole("dialog").getByRole("button", { name: "Fork theme", exact: true }).click()
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Save theme" }).click()
      await expect(page.getByTestId("theme-status")).toHaveText("saved")
      expect(await storedThemes(page)).not.toBe(storageBefore)
    })

    test("rejects an initial themeId mismatch with mutation.base-mismatch and consumes the id", async ({ page }) => {
      await openWorkbench(page, mode)
      const storageBefore = await storedThemes(page)
      await stageText(page, proposal("mismatch-1", 1, { base: { themeId: "some-other-theme", revision: 1 } }))
      await expect(page.getByTestId("proposal-error")).toContainText("mutation.base-mismatch at base.themeId")
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(page.getByTestId("proposal-log").locator('[data-proposal-id="mismatch-1"]')).toHaveAttribute("data-status", "rejected")
      await expect(revision(page)).toHaveText("1")
      await workspaceMode(page, "Controls")
      await expect(page.getByTestId("diff-empty")).toBeVisible()
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("8px")
      expect(await storedThemes(page)).toBe(storageBefore)

      await stageText(page, proposal("mismatch-1", 1))
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.duplicate-id at proposalId")
    })

    test("rejects an invalid operation atomically, and unparsable or oversized input", async ({ page }) => {
      await openWorkbench(page, mode)
      await stageText(page, proposal("bad-1", 1, { operations: [{ op: "setRadius", value: "1rem" }, { op: "setDensity", value: 99 }] }))
      await expect(page.getByTestId("proposal-error")).toContainText("mutation.invalid-value at operations[1].value")
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("8px")

      await stageText(page, "{ not json")
      await expect(page.getByTestId("proposal-error")).toContainText("workbench.proposal.invalid-json")

      await stageText(page, proposal("bad-2", 1, { operations: Array.from({ length: 9 }, () => ({ op: "setRadius", value: "1rem" })) }))
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.invalid-operations at operations")

      await stageText(page, proposal("bad-3", 1, { css: "body { display: none }" }))
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.unknown-field at css")

      const legacy = JSON.parse(proposal("bad-4", 1))
      await stageText(page, JSON.stringify({ ...legacy, schemaVersion: undefined, version: "1.0" }))
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.unsupported-version at schemaVersion")
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.unknown-field at version")

      await stageText(page, proposal("bad-5", 1, { provenance: { source: "browser-test", sourceId: "spec", createdAt: "2026-09-21T10:00:00Z" } }))
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.invalid-provenance at provenance.source")
      await expect(revision(page)).toHaveText("1")
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
      await expect(page.getByRole("radio", { name: "Light", exact: true })).toBeEnabled()
      await expect(page.getByRole("radio", { name: "Dark", exact: true })).toBeEnabled()
      await expect(page.getByRole("radio", { name: "Mobile 390" })).toBeEnabled()
      await expect(page.getByRole("radio", { name: "Desktop 1024" })).toBeEnabled()
      await expect(page.getByRole("button", { name: "Apply proposal" })).toBeEnabled()
      await expect(page.getByRole("button", { name: "Discard proposal" })).toBeEnabled()
      const other = mode === "light" ? "Dark" : "Light"
      await workspaceMode(page, "Preview")
      await page.getByRole("radio", { name: other, exact: true }).click()
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-mode", other.toLowerCase())
      await workspaceMode(page, "Preview")
      await page.getByRole("radio", { name: "Desktop 1024" }).click()
      await expect(page.getByTestId("preview-frame")).toHaveAttribute("style", /width: 1024px/)
      await workspaceMode(page, "Preview")
      await expect(page.getByTestId("proposal-staged")).toBeVisible()

      // Nothing about the active theme or persistence moved.
      await expect(revision(page)).toHaveText("1")
      await workspaceMode(page, "Controls")
      await expect(page.getByTestId("diff-empty")).toBeVisible()
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
      await expect(page.getByRole("button", { name: "Save theme" })).toBeDisabled()
      await workspaceMode(page, "Preview")
      await page.getByRole("button", { name: "Apply proposal" }).click()
      await expect(revision(page)).toHaveText("2")
      await assertActiveControls(page, false)
    })
  })
}
