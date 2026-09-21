import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const STORAGE_KEY = "personal-ui-workbench/v1"
const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

const proposal = (id: string, revision: number, overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    version: "1.0",
    proposalId: id,
    base: { themeId: "quiet-editorial", revision },
    provenance: { source: "browser-test", sourceId: "spec", createdAt: "2026-09-21T10:00:00Z", intentSummary: "Rounder, calmer, warmer." },
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
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")
  await page.getByRole("radio", { name: mode === "light" ? "Light" : "Dark", exact: true }).click()
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-mode", mode)
}

const stageText = async (page: Page, text: string) => {
  await page.getByLabel("Proposal JSON").fill(text)
  await page.getByRole("button", { name: "Stage proposal" }).click()
}

const previewStyle = (page: Page, testId: string, prop: keyof CSSStyleDeclaration) =>
  previewFrame(page).getByTestId(testId).evaluate((el, p) => String(getComputedStyle(el)[p]), prop)
const buttonMotion = (page: Page) =>
  previewFrame(page).getByRole("button", { name: "default", exact: true }).evaluate((el) => getComputedStyle(el).transitionDuration)
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
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
      await expect(page.getByTestId("proposal-error")).toHaveCount(0)
      await expect(page.getByTestId("proposal-log").locator('[data-proposal-id="stage-1"]')).toHaveAttribute("data-status", "staged")

      // Four operations produce exactly one candidate revision; the active theme is untouched.
      await expect(page.getByTestId("proposal-candidate-revision")).toHaveText("2")
      await expect(revision(page)).toHaveText("1")
      await expect(page.getByTestId("theme-status")).toHaveText("unsaved")
      await expect(page.getByTestId("diff-empty")).toBeVisible()

      // The candidate is visible through the existing iframe path, with no reload.
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("16px")
      await expect.poll(buttonMotion.bind(null, page)).toBe("0.32s")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "2")

      // Structured diff, sorted by path.
      const paths = await page.getByTestId("proposal-diff-list").locator("li").evaluateAll((items) => items.map((li) => li.getAttribute("data-path")))
      expect(paths).toEqual(["modes.dark.color.primary", "modes.light.color.primary", "motion.durationBase", "radius.md"])
      await expect(page.getByTestId("proposal-diff-list").locator('[data-path="radius.md"]')).toContainText('"0.5rem" → "1rem"')
      expect(await storedThemes(page)).toBe(storageBefore)
      await expectNoSeriousViolations(page, `${mode}-proposal-staged`, testInfo)

      // Discard: candidate gone, active and persisted state byte-identical.
      await page.getByRole("button", { name: "Discard proposal" }).click()
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(page.getByTestId("proposal-log").locator('[data-proposal-id="stage-1"]')).toHaveAttribute("data-status", "discarded")
      await expect(revision(page)).toHaveText("1")
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

    test("Apply increments the active revision exactly once, persists only on Save, and consumes the id", async ({ page }) => {
      await openWorkbench(page, mode)
      const storageBefore = await storedThemes(page)
      await stageText(page, proposal("apply-1", 1))
      await expect(page.getByTestId("proposal-staged")).toBeVisible()
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
      await page.getByRole("button", { name: "Apply proposal" }).click()
      await expect(revision(page)).toHaveText("3")

      // Save is the only step that persists, and it persists the applied revision.
      await page.getByLabel("Fork id").fill("applied-fork")
      await page.getByLabel("Fork name").fill("Applied Fork")
      await page.getByRole("button", { name: "Fork theme" }).click()
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
      await expect(revision(page)).toHaveText("1")
    })

    test("goes stale on Apply when the revision changes after staging, changing nothing", async ({ page }) => {
      await openWorkbench(page, mode)
      const storageBefore = await storedThemes(page)
      await stageText(page, proposal("stale-1", 1))
      await expect(page.getByTestId("proposal-staged")).toBeVisible()

      // An unrelated edit moves the active revision to 2 while the proposal is staged.
      await page.getByLabel("Setting", { exact: true }).selectOption({ label: "Spacing density" })
      await page.getByLabel("Setting value").fill("1.25")
      await page.getByRole("button", { name: "Apply setting" }).click()
      await expect(revision(page)).toHaveText("2")
      await expect(page.getByTestId("proposal-base-moved")).toBeVisible()
      await expect(page.getByTestId("proposal-log").locator('[data-proposal-id="stale-1"]')).toHaveAttribute("data-status", "staged")

      await page.getByRole("button", { name: "Apply proposal" }).click()
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.stale at base")
      await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
      await expect(page.getByTestId("proposal-log").locator('[data-proposal-id="stale-1"]')).toHaveAttribute("data-status", "stale")
      await expect(revision(page)).toHaveText("2")
      // Only the density edit is active: the proposal's radius and motion never applied.
      await expect(page.getByTestId("diff-count")).toHaveText("1")
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("8px")
      await expect.poll(buttonMotion.bind(null, page)).toBe("0.2s")
      await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-revision", "2")
      expect(await storedThemes(page)).toBe(storageBefore)

      await stageText(page, proposal("stale-1", 2))
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.duplicate-id at proposalId")
    })

    test("goes stale on Apply when the active themeId changes after staging", async ({ page }) => {
      await openWorkbench(page, mode)
      await stageText(page, proposal("stale-2", 1))
      await expect(page.getByTestId("proposal-staged")).toBeVisible()

      await page.getByLabel("Fork id").fill("stale-fork")
      await page.getByLabel("Fork name").fill("Stale Fork")
      await page.getByRole("button", { name: "Fork theme" }).click()
      await expect(page.getByTestId("theme-id")).toHaveText("stale-fork")
      const storageBefore = await storedThemes(page)

      await page.getByRole("button", { name: "Apply proposal" }).click()
      await expect(page.getByTestId("proposal-error")).toContainText("proposal.stale at base")
      await expect(page.getByTestId("proposal-log").locator('[data-proposal-id="stale-2"]')).toHaveAttribute("data-status", "stale")
      await expect(page.getByTestId("theme-id")).toHaveText("stale-fork")
      await expect(revision(page)).toHaveText("1")
      await expect(page.getByTestId("diff-empty")).toBeVisible()
      await expect.poll(() => previewStyle(page, "elevation-sample", "borderRadius")).toBe("8px")
      expect(await storedThemes(page)).toBe(storageBefore)
    })
  })
}
