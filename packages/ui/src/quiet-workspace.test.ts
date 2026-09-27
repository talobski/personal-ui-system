import { existsSync, readdirSync, readFileSync } from "node:fs"
import { expect, it } from "vitest"
import { validateComponentState, evaluateContextRequest, getContract } from "@personal-ui/core"

const workbench = (name: string) => readFileSync(new URL(`../../../apps/workbench/src/${name}`, import.meta.url), "utf8")

it("has no fixed preview width: the preview fills the Sidebar inset and follows the real viewport (WTEP-02, WSSP-03)", () => {
  const app = workbench("App.tsx")
  expect(app).not.toMatch(/WIDTHS|Preview width|Mobile 390|Desktop 1024|width: \d+px|height: 720/)
  expect(existsSync(new URL("../../../apps/workbench/src/layout.ts", import.meta.url))).toBe(false)
})

it("renders the Workbench as one Sidebar shell with no header, resizable split, or mobile mode tabs (WSSP-03, WSSP-04)", () => {
  const app = workbench("App.tsx")
  const styles = workbench("styles.css")
  for (const part of ["<SidebarProvider", "<Sidebar>", "<SidebarHeader", "<SidebarContent", "<SidebarInset", "<SidebarTrigger"]) expect(app).toContain(part)
  expect(app.match(/<SidebarProvider\b/g)).toHaveLength(1)
  expect(app.match(/<Sidebar\b/g)).toHaveLength(1)
  // WSTP-11: the one official desktop width variable on the provider.
  expect(app).toContain('"--sidebar-width": "28rem"')
  expect(app.match(/--sidebar-width/g)).toHaveLength(1)
  expect(app).not.toMatch(/ResizablePanel|ResizableHandle|resizable-panel|<header|quiet-header|Workspace mode|mobileMode|editorBounds/)
  expect(styles).not.toMatch(/quiet-header|quiet-split|quiet-handle|quiet-mobile-tabs|quiet-modes/)
  // The public resizable-panel resource stays published.
  expect(existsSync(new URL("./components/resizable-panel.tsx", import.meta.url))).toBe(true)
})

it("uses ScrollArea for persistent app regions and exactly one embedded preview-document root (WCN-04/05, WSPF-09)", () => {
  const styles = workbench("styles.css")
  const app = workbench("App.tsx")
  const preview = workbench("PreviewFrame.tsx")
  expect(styles).not.toMatch(/scrollbar-width|scrollbar-color|::-webkit-scrollbar/)
  // WSTP-10: Workbench regions inherit the shared ScrollArea thumb states; no Workbench-only thumb colours remain.
  expect(styles).not.toContain("scroll-area-thumb")
  expect(globalCss()).not.toMatch(/scrollbar/)
  expect(app.match(/<ScrollArea /g)).toHaveLength(3)
  expect(app).toMatch(/<SidebarContent className="quiet-editor overflow-hidden"/)
  // WSPF-09 supersedes native preview scrolling: one vertical root ScrollArea inside the iframe document, none outside it.
  expect(preview.match(/<ScrollArea /g)).toHaveLength(1)
  expect(app.slice(app.indexOf('<div className="quiet-preview-body">'))).not.toContain("<ScrollArea")
  expect(app).toContain('orientation="horizontal"')
  expect(app).toContain('aria-label": "Theme editor", tabIndex: 0')
  expect(app).toContain('aria-label": "Workbench status and proposal", tabIndex: 0')
  expect(styles).not.toMatch(/touch-action|overscroll-behavior|pointer-events/)
})

const globalCss = () => readFileSync(new URL("./styles/globals.css", import.meta.url), "utf8")

it("rejects unordered panel bounds and inaccessible separators with stable rules", () => {
  const valid = { kind: "resizable-panel", minPx: 352, defaultPx: 352, maxPx: 480, separatorName: "Resize editor", primitiveSeparator: true, visibleFocus: true }
  expect(validateComponentState(valid).ok).toBe(true)
  for (const patch of [{ defaultPx: 600 }, { maxPx: 300 }]) expect(validateComponentState({ ...valid, ...patch })).toMatchObject({ ok: false, issues: [{ ruleId: "resizable-panel.bounds" }] })
  for (const patch of [{ separatorName: null }, { primitiveSeparator: false }, { visibleFocus: false }]) expect(validateComponentState({ ...valid, ...patch })).toMatchObject({ ok: false, issues: [{ ruleId: "resizable-panel.accessible-separator" }] })
  expect(validateComponentState({ ...valid, minPx: Infinity }).ok).toBe(false)
  expect(validateComponentState({ ...valid, customHandler: true }).ok).toBe(false)
})
it("retrieves the sole new resource deterministically with provenance", async () => {
  const request = { version: "personal-ui-context/1", operation: "get", theme: "quiet-editorial", resource: "resizable-panel" }
  expect(await evaluateContextRequest(request)).toEqual(await evaluateContextRequest(request))
  expect((await getContract("resizable-panel"))?.composition.join(" ")).toContain("react-resizable-panels@4.13.2")
  const result = await evaluateContextRequest(request)
  expect(result.ok).toBe(true)
  expect(JSON.stringify(result)).toContain("packages/core/src/contracts/data/resizable-panel.ts")
})
it("keeps nineteen shared modules and thin stories; the Cards gallery consumes exactly the eleven current ones (CGS-07, WSCG-11)", async () => {
  // Every composition module is shared with Storybook through a thin story.
  const names = ["productive-week", "account-profile", "team-access", "workspace-settings", "notification-preferences", "support-request", "recent-activity", "room-to-think", "revenue-overview", "upcoming-schedule", "plan-usage", "launch-board", "quick-find", "team-chat", "recent-payments", "signup-form", "offsite-calendar", "now-playing", "local-weather"]
  // PUI-83 and PUI-88/90/91 remove cards from the gallery only; their standalone modules and stories remain independently used.
  const removed = ["account-profile", "team-access", "workspace-settings", "notification-preferences", "room-to-think", "upcoming-schedule", "launch-board", "support-request"]
  const gallery = readFileSync(new URL("../../../apps/workbench/src/Gallery.tsx", import.meta.url), "utf8")
  for (const name of names) {
    const implementation = await import(`./compositions/${name}.tsx`)
    const storyModule = await import(`./compositions/${name}.stories.tsx`)
    expect(Object.values(implementation)).toContain(storyModule.default.component)
    const story = readFileSync(new URL(`./compositions/${name}.stories.tsx`, import.meta.url), "utf8")
    expect(gallery.includes(`@personal-ui/ui/compositions/${name}"`), name).toBe(!removed.includes(name))
    expect(story).toContain(`from "./${name}"`)
    expect(story).not.toMatch(/function |<Card|<Input/)
  }
  expect(gallery.match(/from "@personal-ui\/ui\/compositions\//g)).toHaveLength(11)
  expect(readdirSync(new URL("./compositions", import.meta.url)).filter(file => !file.endsWith(".stories.tsx")).map(file => file.replace(/\.tsx$/, "")).sort()).toEqual([...names].sort())
  const resize = readFileSync(new URL("./components/resizable-panel.tsx", import.meta.url), "utf8")
  expect(resize).toContain('from "react-resizable-panels"')
  expect(resize).not.toMatch(/onPointer|onKeyDown|addEventListener/)
})
