import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BASE_COLOR_TOKENS, SIDEBAR_COLOR_TOKENS } from "@personal-ui/core"
import { AppShells } from "@personal-ui/ui/compositions/app-shells"

import { DESIGN_SYSTEM_COLOR_GROUPS, DesignSystemPreview } from "./DesignSystemPreview"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
/** Source without comments, so explanatory prose is not mistaken for an implementation. */
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/

describe("WGPE-09 Design system view (PUI-101)", () => {
  it("groups every base semantic colour exactly once and adds the eight Sidebar tokens", () => {
    const grouped = DESIGN_SYSTEM_COLOR_GROUPS.flatMap(group => [...group.tokens])
    expect([...grouped].sort()).toEqual([...BASE_COLOR_TOKENS].sort())
    expect(new Set(grouped).size).toBe(grouped.length)
    expect(DESIGN_SYSTEM_COLOR_GROUPS.map(group => group.label)).toEqual(["Base", "Surfaces", "Intent", "Boundaries", "Charts"])
    const html = renderToStaticMarkup(createElement(DesignSystemPreview, { source: "" }))
    const tokens = Array.from(html.matchAll(/data-token="([a-z0-9-]+)"/g), match => match[1])
    expect(tokens).toEqual([...grouped, ...SIDEBAR_COLOR_TOKENS])
    // Swatches paint from the live custom property of the same semantic name, never a copied value.
    for (const token of tokens) expect(html).toContain(`style="background:var(--${token})"`)
    for (const label of ["Base", "Surfaces", "Intent", "Boundaries", "Charts", "Sidebar · base aliases"]) expect(html).toContain(`>${label}</h3>`)
  })

  it("shows Heading, Body, muted Body and Mono samples on the semantic roles", () => {
    const html = renderToStaticMarkup(createElement(DesignSystemPreview, { source: "" }))
    expect(html).toContain('<h2 class="type-heading text-lg">Colors</h2>')
    expect(html).toContain('<h2 class="type-heading text-lg">Typography</h2>')
    expect(Array.from(html.matchAll(/data-role="(heading|body|mono)"/g), match => match[1])).toEqual(["heading", "body", "mono"])
    expect(html.match(/class="type-heading truncate text-(4xl|2xl|lg)"/g)).toHaveLength(3)
    expect(html).toMatch(/<p class="text-sm text-muted-foreground" data-role="muted">/)
    expect(html).toMatch(/<p class="truncate font-mono text-sm">/)
    expect(html.match(/data-testid="role-meta"/g)).toHaveLength(3)
  })

  it("is read-only and reads the rendered iframe CSS instead of holding a second theme state", () => {
    const source = code("./DesignSystemPreview.tsx")
    expect(source).not.toMatch(/<input|<button|<Button|<Input|<Slider|<Switch|<Select|onChange|onClick|ThemeOperation|applyManual|setColor|themeSchema|previewVariablesCss|renderShadcnTailwindCss|localStorage|postMessage|fetch\(/)
    expect(source).not.toMatch(/import type \{[^}]*\bTheme\b/)
    expect(source).toContain("getComputedStyle(root)")
    expect(source).toContain('document.getElementById("workbench-theme")')
    expect(source).toContain('observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })')
    expect(source).not.toMatch(rawColour)
    const frame = code("./PreviewFrame.tsx")
    expect(frame).toContain('<DesignSystemPreview source={`${state?.mode ?? ""}\\n${state?.css ?? ""}`} />')
    // The only parent-to-preview message is still the rendered CSS and mode.
    expect(read("./messages.ts")).toContain('export type PreviewState = { type: "workbench-preview-state"; css: string; mode: Mode; themeId: string; revision: number }')
  })
})

describe("WGPE-10 App shells view (PUI-102)", () => {
  const source = () => read("../../../packages/ui/src/compositions/app-shells.tsx")

  it("renders three distinct contained shells on the accepted Sidebar's non-collapsible branch", () => {
    const html = renderToStaticMarkup(createElement(AppShells))
    expect(Array.from(html.matchAll(/data-app-shell="([^"]+)"/g), match => match[1])).toEqual(["Classic workspace", "Inset project", "Compact utility"])
    expect(html.match(/data-slot="sidebar"/g)).toHaveLength(3)
    expect(html.match(/data-slot="sidebar-wrapper"/g)).toHaveLength(1)
    // Never the viewport-fixed desktop branch, its gap/container, or the mobile sheet.
    expect(html).not.toMatch(/data-slot="sidebar-(gap|container)"|data-collapsible|data-state="(collapsed|expanded)"|\bfixed\b|h-svh|min-h-svh/)
    expect(source().match(/<Sidebar collapsible="none"/g)).toHaveLength(3)
    expect(source()).not.toMatch(/SidebarTrigger|SidebarRail|SidebarInset|useSidebar|collapsible="(icon|offcanvas)"/)
    // One held-open provider serves every shell, so there is one keyboard-shortcut listener and no state to toggle.
    expect(source().match(/<SidebarProvider /g)).toHaveLength(1)
    expect(source()).toContain('<SidebarProvider open className="@container block min-h-0 min-w-0">')
  })

  it("names each navigation, marks one local active item per shell, and keeps main content abstract", () => {
    const html = renderToStaticMarkup(createElement(AppShells))
    expect(Array.from(html.matchAll(/<nav aria-label="([^"]+)"/g), match => match[1])).toEqual(["Classic workspace navigation", "Inset project navigation", "Compact utility navigation"])
    expect(html.match(/aria-current="page"/g)).toHaveLength(3)
    expect(html.match(/data-active="true"/g)).toHaveLength(3)
    expect(html.match(/data-slot="sidebar-menu-button"/g)!.length).toBeGreaterThanOrEqual(15)
    // Main areas hold only hidden neutral blocks: no forms, tables, charts or real content controls.
    expect(source()).not.toMatch(/<table|<Table|<Chart|<input|<Input|<form|<textarea|recharts/)
    expect(html.match(/<button /g)).toHaveLength(html.match(/data-slot="sidebar-menu-button"/g)!.length)
  })

  it("stays on semantic tokens and the unchanged public Sidebar API", () => {
    expect(source()).not.toMatch(rawColour)
    expect(source()).toContain('from "../components/sidebar"')
    for (const token of ["bg-sidebar", "border-sidebar-border", "bg-sidebar-primary", "text-sidebar-primary-foreground", "bg-sidebar-accent", "bg-background", "bg-card", "bg-muted", "type-heading", "shadow-sm", "rounded-"]) expect(source()).toContain(token)
    expect(source()).not.toMatch(/fetch\(|https?:\/\/|localStorage|sessionStorage|addEventListener|setTimeout|setInterval/)
  })
})
