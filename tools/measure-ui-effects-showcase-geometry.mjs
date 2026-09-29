#!/usr/bin/env node
/**
 * ui-effects-showcase-polish-v1-001 producer geometry probe (IESP-07). Measures the compact collapsible section
 * triggers and the Create account GitHub/Google Buttons against a running Workbench preview build, at 390x844 and
 * 1440x900 in light mode, so a before/after pair can be compared exactly.
 *
 * Usage: node tools/measure-ui-effects-showcase-geometry.mjs <baseURL> <out.json>
 * Localhost only; it never contacts another host.
 */
import { writeFileSync } from "node:fs"
import { chromium } from "@playwright/test"

const [baseURL = "http://127.0.0.1:5173", out] = process.argv.slice(2)
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/.test(baseURL)) throw new Error(`localhost only: ${baseURL}`)

const SECTIONS = ["colors-primary", "colors-secondary", "colors-accent", "colors-base", "colors-card", "colors-sidebar"]

const probe = (el) => {
  const s = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  const svg = el.querySelector("svg")
  const sr = svg?.getBoundingClientRect()
  const parent = el.parentElement.getBoundingClientRect()
  return {
    width: r.width, height: r.height, offsetX: r.left - parent.left, offsetY: r.top - parent.top,
    paddingTop: s.paddingTop, paddingRight: s.paddingRight, paddingBottom: s.paddingBottom, paddingLeft: s.paddingLeft,
    fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, textTransform: s.textTransform, letterSpacing: s.letterSpacing,
    borderRadius: s.borderRadius, borderTopWidth: s.borderTopWidth, gap: s.columnGap, justifyContent: s.justifyContent, alignItems: s.alignItems,
    iconWidth: sr?.width ?? null, iconHeight: sr?.height ?? null,
    text: el.textContent.trim(),
  }
}

/** Waits until no CSS transition or animation is running in the document (Buttons use `transition-all`). */
const settle = (target) => target.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))))

const browser = await chromium.launch()
const result = { baseURL, measuredAt: new Date().toISOString(), viewports: {} }
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const page = await browser.newPage({ viewport })
    await page.route(/^(?!http:\/\/(127\.0\.0\.1|localhost)[:/]).*/, (route) => route.abort())
    await page.goto(baseURL)
    const frame = page.frameLocator('[data-testid="preview-frame"]')
    await frame.getByTestId("preview").and(frame.locator('[data-ready="true"]')).waitFor()
    const key = `${viewport.width}x${viewport.height}`
    const entry = { triggers: {}, social: {} }
    // Social Buttons in the Cards gallery.
    await frame.getByRole("button", { name: "GitHub", exact: true }).scrollIntoViewIfNeeded()
    await page.mouse.move(0, 0)
    await settle(frame.locator("body"))
    for (const name of ["GitHub", "Google"]) entry.social[name] = await frame.getByRole("button", { name, exact: true }).evaluate(probe)
    // Collapsible triggers live in the sidebar (an off-canvas sheet below 768px).
    if (viewport.width < 768) {
      await page.getByRole("button", { name: "Toggle Sidebar", exact: true }).click()
      await page.getByRole("dialog", { name: "Sidebar", exact: true }).waitFor()
      await page.waitForTimeout(400)
    }
    await settle(page.locator("body"))
    for (const id of SECTIONS) entry.triggers[id] = await page.getByTestId(`section-${id}`).locator('[data-slot="collapsible-trigger"]').first().evaluate(probe)
    // Collapse/expand still toggles via the trigger.
    const trigger = page.getByTestId("section-colors-primary").locator('[data-slot="collapsible-trigger"]').first()
    await trigger.click()
    entry.collapse = { afterClick: await trigger.getAttribute("aria-expanded") }
    await trigger.click()
    entry.collapse.afterSecondClick = await trigger.getAttribute("aria-expanded")
    result.viewports[key] = entry
    await page.close()
  }
} finally {
  await browser.close()
}
const json = JSON.stringify(result, null, 2)
if (out) writeFileSync(out, `${json}\n`)
else process.stdout.write(`${json}\n`)
