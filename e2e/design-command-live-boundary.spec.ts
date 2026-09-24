import { workspaceMode, editorCategory, previewStates, assertActiveControls } from "./workbench-navigation"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

test("the real localhost product API middleware (vite dev) fails closed with transport.missing-credential and never reaches TypeSafe", async ({ page }) => {
  const outboundToTypeSafe: string[] = []
  page.on("request", (req) => {
    if (req.url().includes("api.typesafe.ai")) outboundToTypeSafe.push(req.url())
  })

  await page.goto("/")
  await previewStates(page)
  await editorCategory(page, "Command")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")

  await page.getByTestId("design-command-input").click()
  await page.keyboard.type("make it denser")
  await page.getByTestId("design-command-evaluate").click()

  const outcome = page.getByTestId("design-command-outcome")
  await expect(outcome).toHaveAttribute("data-outcome-kind", "rejected")
  await expect(page.getByTestId("design-command-rejected")).toContainText("transport.missing-credential")

  // Fail-closed: no proposal staged, no theme mutation, and the real product API never even attempted the one
  // outbound TypeSafe call this command would otherwise have made.
  await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
  await expect(page.getByTestId("theme-revision")).toHaveText("1")
  expect(outboundToTypeSafe).toEqual([])

  // The rejected outcome and page never contain a credential sentinel — including the Loop/generic sentinels this
  // config deliberately sets to prove the handler doesn't read them either.
  const bodyText = await page.locator("body").innerText()
  expect(bodyText).not.toContain("loop-sentinel-must-never-be-read")
  expect(bodyText).not.toContain("generic-sentinel-must-never-be-read")
})
