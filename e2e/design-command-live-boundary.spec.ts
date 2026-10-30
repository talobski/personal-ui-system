import { workspaceMode, editorCategory, previewStates, assertActiveControls } from "./workbench-navigation"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const previewFrame = (page: Page) => page.frameLocator('[data-testid="preview-frame"]')

test("the real localhost product API middleware (vite dev) fails closed with transport.missing-credential and never reaches TypeSafe", async ({ page }) => {
  const outboundToTypeSafe: string[] = []
  page.on("request", (req) => {
    if (req.url().includes("api.typesafe.ai")) outboundToTypeSafe.push(req.url())
  })

  await page.goto("/workbench")
  await previewStates(page)
  await editorCategory(page, "Command")
  await expect(previewFrame(page).getByTestId("preview")).toHaveAttribute("data-ready", "true")

  await page.getByTestId("design-command-input").click()
  await page.keyboard.type("make it denser")
  await page.getByTestId("design-command-evaluate").click()

  const outcome = page.getByTestId("design-command-outcome")
  await expect(outcome).toHaveAttribute("data-outcome-kind", "rejected")
  // The origin check runs before the credential check, so reaching missing-credential also proves the Workbench's
  // own browser request (its real Origin, fetch metadata and JSON media type) passed through the middleware as trusted.
  await expect(page.getByTestId("design-command-rejected")).toContainText("transport.missing-credential")

  // Fail-closed: no proposal staged, no theme mutation, and the real product API never even attempted the one
  // outbound TypeSafe call this command would otherwise have made.
  await expect(page.getByTestId("proposal-staged")).toHaveCount(0)
  await expect(page.locator("#workbench-active-theme")).toHaveAttribute("data-revision", "1")
  expect(outboundToTypeSafe).toEqual([])

  // The rejected outcome and page never contain a credential sentinel — including the generic sentinel this
  // config deliberately sets to prove the handler doesn't read them either.
  const bodyText = await page.locator("body").innerText()
  expect(bodyText).not.toContain("generic-sentinel-must-never-be-read")
})

const ROUTE = "/api/design-command/evaluate"
const COMMAND = JSON.stringify({ commandText: "make it denser", activeMode: "light" })

test.describe("cross-origin requests to the real dev-server middleware", () => {
  /** Another origin on this machine: the same server reached as `localhost`, which Vite's host check and CORS allow. */
  const foreignOrigin = (baseURL: string | undefined) => {
    const url = new URL(baseURL!)
    url.hostname = "localhost"
    return url.origin
  }

  test("a page on another origin cannot get a no-preflight text/plain post past the endpoint", async ({ page, baseURL }) => {
    await page.goto(`${foreignOrigin(baseURL)}/workbench`)
    const response = page.waitForResponse((r) => r.url() === `${baseURL}${ROUTE}` && r.request().method() === "POST")
    await page.evaluate(
      ([url, body]) => fetch(url, { method: "POST", mode: "no-cors", headers: { "content-type": "text/plain" }, body }).catch(() => undefined),
      [`${baseURL}${ROUTE}`, COMMAND] as const
    )
    // The page itself only sees an opaque response; the network log shows the endpoint refused it.
    expect((await response).status()).toBe(403)
  })

  test("a page on another origin gets JSON requests refused by origin", async ({ page, baseURL }) => {
    await page.goto(`${foreignOrigin(baseURL)}/workbench`)
    const result = await page.evaluate(
      async ([url, body]) => {
        const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body })
        return { status: response.status, outcome: (await response.json()).outcome }
      },
      [`${baseURL}${ROUTE}`, COMMAND] as const
    )
    expect(result).toEqual({ status: 403, outcome: { kind: "rejected", reason: { code: "design-command.untrusted-origin" } } })
  })

  test("conflicting or missing request headers are refused before the credential is consulted", async ({ request, baseURL }) => {
    const origin = new URL(baseURL!).origin
    const cases: { headers: Record<string, string>; status: number; code: string }[] = [
      { headers: { origin, "sec-fetch-site": "cross-site", "content-type": "application/json" }, status: 403, code: "design-command.cross-site-request" },
      { headers: { origin: "https://attacker.example", "sec-fetch-site": "same-origin", "content-type": "application/json" }, status: 403, code: "design-command.untrusted-origin" },
      { headers: { "content-type": "application/json" }, status: 403, code: "design-command.missing-origin" },
      { headers: { origin, "sec-fetch-site": "same-origin", "content-type": "text/plain" }, status: 415, code: "design-command.unsupported-media-type" },
    ]
    for (const { headers, status, code } of cases) {
      const response = await request.post(ROUTE, { headers, data: COMMAND })
      expect(response.status(), code).toBe(status)
      expect((await response.json()).outcome, code).toEqual({ kind: "rejected", reason: { code } })
    }
    // The same request with trusted headers reaches the credential check (forced empty in this config).
    const trusted = await request.post(ROUTE, { headers: { origin, "sec-fetch-site": "same-origin", "content-type": "application/json" }, data: COMMAND })
    expect((await trusted.json()).outcome).toEqual({ kind: "rejected", reason: { code: "transport.missing-credential" } })
  })
})
