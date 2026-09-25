import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page, TestInfo } from "@playwright/test"

const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`
const colorModes = ["light", "dark"] as const

async function setColorMode(page: Page, mode: (typeof colorModes)[number]) {
  await page.locator("html").evaluate((element, nextMode) => element.classList.toggle("dark", nextMode === "dark"), mode)
  expect(await page.locator("html").evaluate((element) => element.classList.contains("dark"))).toBe(mode === "dark")
  // Let colour transitions settle before sampling colours or running axe.
  await page.waitForTimeout(250)
}

async function assertNoSeriousOrCritical(page: Page, testInfo: TestInfo, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const serious = violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")
  await testInfo.attach(`axe-critical-serious-${label}.json`, { body: JSON.stringify(serious, null, 2), contentType: "application/json" })
  expect(serious).toEqual([])
}

/** The resolved muted and muted-foreground colours in the current mode, for comparing against computed styles. */
const semanticColors = (page: Page) =>
  page.evaluate(() => {
    const probe = document.createElement("span")
    document.body.append(probe)
    probe.style.color = "var(--muted-foreground)"
    probe.style.backgroundColor = "var(--muted)"
    const result = { fg: getComputedStyle(probe).color, bg: getComputedStyle(probe).backgroundColor }
    probe.remove()
    return result
  })

const avatars = (page: Page) =>
  page.locator('[data-slot="avatar"]').evaluateAll((nodes) =>
    nodes.map((node) => {
      const fallback = node.querySelector('[data-slot="avatar-fallback"]')!
      return { name: node.getAttribute("data-avatar-name"), text: fallback.textContent, bg: getComputedStyle(fallback).backgroundColor, fg: getComputedStyle(fallback).color, radius: getComputedStyle(node).borderRadius, hidden: node.getAttribute("aria-hidden") }
    })
  )

test("Avatar shows exactly one meaningful initial on the semantic muted tokens (WSSP-08)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      await page.goto(story("pilot-avatar--default"))
      await setColorMode(page, mode)
      const found = await avatars(page)
      expect(found.map((a) => a.text)).toEqual(["A", "G", "É", "K", "7"])
      const colors = await semanticColors(page)
      for (const avatar of found) {
        expect([...avatar.text!]).toHaveLength(1)
        expect(avatar.bg).toBe(colors.bg)
        expect(avatar.fg).toBe(colors.fg)
        expect(avatar.hidden).toBe("true")
      }
      await assertNoSeriousOrCritical(page, testInfo, `avatar-${mode}`)

      await page.goto(story("pilot-avatar--sizes-story"))
      await setColorMode(page, mode)
      await expect(page.getByRole("img", { name: /^Ada Lovelace, size-/ })).toHaveCount(3)
      const sizes = await page.locator('[data-slot="avatar"]').evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().width))
      expect(sizes[0]).toBeLessThan(sizes[1]!)
      expect(sizes[1]).toBeLessThan(sizes[2]!)
      await assertNoSeriousOrCritical(page, testInfo, `avatar-sizes-${mode}`)
    })
  }
})

test("accepted compositions use Avatar with one initial and semantic muted colours (WSSP-08)", async ({ page }, testInfo) => {
  for (const mode of colorModes) {
    await test.step(mode, async () => {
      for (const [id, expected] of [["composition-team-access--default", [["Ada Lovelace", "A"], ["Grace Hopper", "G"]]], ["composition-account-profile--quiet-workspace", [["Ada Lovelace", "A"]]]] as const) {
        await page.goto(story(id))
        await setColorMode(page, mode)
        const found = await avatars(page)
        const colors = await semanticColors(page)
        expect(found.map((a) => [a.name, a.text])).toEqual(expected)
        for (const avatar of found) {
          expect(avatar.bg).toBe(colors.bg)
          expect(avatar.fg).toBe(colors.fg)
          expect(avatar.radius).not.toBe("0px")
        }
        // No two-letter initials anywhere in the composition.
        await expect(page.getByText(/^(AL|GH)$/)).toHaveCount(0)
        await assertNoSeriousOrCritical(page, testInfo, `${id}-${mode}`)
      }
    })
  }
})
