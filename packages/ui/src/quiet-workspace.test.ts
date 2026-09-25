import { existsSync, readFileSync } from "node:fs"
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
  expect(app).toContain('"--sidebar-width": "22rem"')
  expect(app).not.toMatch(/ResizablePanel|ResizableHandle|resizable-panel|<header|quiet-header|Workspace mode|mobileMode|editorBounds/)
  expect(styles).not.toMatch(/quiet-header|quiet-split|quiet-handle|quiet-mobile-tabs|quiet-modes/)
  // The public resizable-panel resource stays published.
  expect(existsSync(new URL("./components/resizable-panel.tsx", import.meta.url))).toBe(true)
})

it("scopes the subtle scrollbar to the sidebar content and the preview document only (WSSP-07)", () => {
  const styles = workbench("styles.css")
  const app = workbench("App.tsx")
  const preview = workbench("PreviewFrame.tsx")
  expect(styles).toMatch(/\.quiet-scroll \{[^}]*scrollbar-width: thin;[^}]*scrollbar-color:/)
  expect(styles).toMatch(/\.quiet-scroll:hover, \.quiet-scroll:active, \.quiet-scroll:focus-within \{/)
  expect(styles).toContain("@supports not (scrollbar-color: auto)")
  // No global or element-wide scrollbar rules: every scrollbar selector is under .quiet-scroll.
  for (const line of styles.split("\n").filter((l) => /scrollbar/.test(l) && /[{,]\s*$|\{/.test(l))) expect(line).toMatch(/\.quiet-scroll|@supports/)
  expect(globalCss()).not.toMatch(/scrollbar/)
  expect(app.match(/quiet-scroll/g)).toHaveLength(1)
  expect(app).toMatch(/<SidebarContent className="quiet-editor quiet-scroll"/)
  expect(preview).toContain('document.documentElement.classList.add("quiet-scroll")')
  // Native modalities stay intact: nothing overrides touch, overscroll, or scroll pointer behavior.
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
it("uses exactly eight shared modules and thin stories, preserving accepted fixture variants", async () => {
  const names = ["productive-week", "account-profile", "team-access", "workspace-settings", "notification-preferences", "support-request", "recent-activity", "room-to-think"]
  const gallery = readFileSync(new URL("../../../apps/workbench/src/Gallery.tsx", import.meta.url), "utf8")
  for (const name of names) {
    const implementation = await import(`./compositions/${name}.tsx`)
    const storyModule = await import(`./compositions/${name}.stories.tsx`)
    expect(Object.values(implementation)).toContain(storyModule.default.component)
    const story = readFileSync(new URL(`./compositions/${name}.stories.tsx`, import.meta.url), "utf8")
    expect(gallery).toContain(`@personal-ui/ui/compositions/${name}`)
    expect(story).toContain(`from "./${name}"`)
    expect(story).not.toMatch(/function |<Card|<Input/)
  }
  expect(gallery.match(/from "@personal-ui\/ui\/compositions\//g)).toHaveLength(8)
  const resize = readFileSync(new URL("./components/resizable-panel.tsx", import.meta.url), "utf8")
  expect(resize).toContain('from "react-resizable-panels"')
  expect(resize).not.toMatch(/onPointer|onKeyDown|addEventListener/)
})
