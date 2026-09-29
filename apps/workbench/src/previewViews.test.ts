import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { BASE_COLOR_TOKENS, normalizeColor, SIDEBAR_COLOR_TOKENS } from "@personal-ui/core"
import { AppShells } from "@personal-ui/ui/compositions/app-shells"

import { COLOR_GROUPS } from "./controls"
import { DESIGN_SYSTEM_COLOR_GROUPS, DesignSystemPreview, displayHex, swatchLabel, titleCaseLabel, TYPE_SCALE, TYPE_SCALE_SAMPLE } from "./DesignSystemPreview"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
/** Source without comments, so explanatory prose is not mistaken for an implementation. */
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
const rawColour = /#[0-9a-fA-F]{3,8}\b|\b(rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\(|\b(bg|text|border|fill|stroke|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone|black|white)\b|\[(#|rgb|hsl|oklch)/

describe("WGPE-09/WBDS-05/06/WPIP-05 Design system view (PUI-101, PUI-109, PUI-114)", () => {
  const html = () => renderToStaticMarkup(createElement(DesignSystemPreview, { source: "" }))

  it("mirrors the Workbench sidebar's colour groups exactly, every semantic token once, with effective Sidebar values", () => {
    // PUI-109: the single order source is the sidebar editor's own COLOR_GROUPS, not a Design-system-only grouping.
    expect(DESIGN_SYSTEM_COLOR_GROUPS).toBe(COLOR_GROUPS)
    expect(DESIGN_SYSTEM_COLOR_GROUPS.map(group => group.title)).toEqual(["Primary", "Secondary", "Accent", "Base", "Card", "Popover", "Muted", "Destructive", "Border, Input & Ring", "Charts", "Sidebar"])
    const grouped = DESIGN_SYSTEM_COLOR_GROUPS.flatMap(group => [...group.tokens])
    expect([...grouped].sort()).toEqual([...BASE_COLOR_TOKENS, ...SIDEBAR_COLOR_TOKENS].sort())
    expect(new Set(grouped).size).toBe(grouped.length)
    const markup = html()
    const tokens = Array.from(markup.matchAll(/data-token="([a-z0-9-]+)"/g), match => match[1])
    expect(tokens).toEqual(grouped)
    // Swatches paint from the live custom property of the same semantic name, never a copied value.
    for (const token of tokens) expect(markup).toContain(`style="background:var(--${token})"`)
    // PUI-114: every group, Sidebar included, is headed by its plain title with no source suffix. PUI-126 (ADSR-05) /
    // PUI-131: uppercase text-sm, base foreground.
    const labels = DESIGN_SYSTEM_COLOR_GROUPS.map(group => group.title.replace("&", "&amp;"))
    expect(Array.from(markup.matchAll(/<h3 [^>]*>([^<]+)<\/h3>/g), match => match[1])).toEqual(labels)
    expect(Array.from(markup.matchAll(/<h3 [^>]*class="([^"]+)"/g), match => match[1])).toEqual(Array(labels.length).fill("text-sm font-medium text-foreground uppercase"))
    expect(markup).not.toMatch(/base aliases|dedicated|sidebar-alias|= (background|foreground|primary|accent|border|ring)/)
    // Local display labels: each pair reads Background / Foreground, unpaired tokens keep their key; PUI-122 names the
    // Sidebar pairs by role and its border/ring as Sidebar Border / Sidebar Ring. PUI-126: shown in title case.
    const shown = Array.from(markup.matchAll(/data-token="([a-z0-9-]+)"[\s\S]*?data-testid="token-label">([^<]+)</g), match => [match[1], match[2]])
    expect(shown).toHaveLength(32)
    const expected: Record<string, string> = { border: "Border", input: "Input", ring: "Ring", "sidebar-primary": "Primary Background", "sidebar-primary-foreground": "Primary Foreground", "sidebar-accent": "Accent Background", "sidebar-accent-foreground": "Accent Foreground", "sidebar-border": "Sidebar Border", "sidebar-ring": "Sidebar Ring", "chart-1": "Chart-1", "chart-2": "Chart-2", "chart-3": "Chart-3", "chart-4": "Chart-4", "chart-5": "Chart-5" }
    for (const [token, label] of shown) expect(label, token).toBe(expected[token!] ?? (token === "foreground" || token!.endsWith("-foreground") ? "Foreground" : "Background"))
  })

  it("pairs background and foreground side by side, with wide rectangular swatches and values in the Body role", () => {
    const markup = html()
    // Two columns per group: each pair occupies one row; singletons (Border / Input / Ring, charts) follow in order.
    expect(markup.match(/<ul class="grid grid-cols-2 gap-x-4 gap-y-3">/g)).toHaveLength(DESIGN_SYSTEM_COLOR_GROUPS.length)
    for (const group of DESIGN_SYSTEM_COLOR_GROUPS) {
      const pairs = group.tokens.filter(token => token.endsWith("-foreground"))
      for (const foreground of pairs) expect(group.tokens.indexOf(foreground) % 2, `${group.id} ${foreground}`).toBe(1)
    }
    // PUI-114: wider-than-tall rectangular swatches (2.5rem tall) replace the square tiles, keeping the rounded border;
    // the specimen stacks swatch, label and value inside its own column. PUI-122: modestly narrower, four fifths of it.
    expect(markup.match(/<span aria-hidden="true" class="h-10 w-4\/5 rounded-md border" data-testid="swatch"/g)).toHaveLength(32)
    expect(markup).not.toMatch(/size-1[02] rounded-md border/)
    expect(markup.match(/<li class="grid min-w-0 content-start gap-1.5" data-token=/g)).toHaveLength(32)
    // Values: Body role (no Mono) and still muted, compact and truncated.
    expect(markup.match(/<span class="truncate text-xs text-muted-foreground tabular-nums" data-testid="token-value"/g)).toHaveLength(32)
    // PUI-126 labels: the HEX size (unchanged), title case with no uppercase transform, normal weight, base foreground.
    expect(markup.match(/<span class="truncate text-xs font-normal text-foreground" data-testid="token-label">/g)).toHaveLength(32)
    expect(markup).not.toMatch(/data-testid="token-label"[^>]*uppercase|uppercase[^"]*" data-testid="token-label"/)
    // Groups sit slightly further apart (gap-7) than a group's heading and pairs (gap-3, gap-y-3).
    expect(markup).toContain('<div class="grid min-w-0 gap-7" data-testid="color-groups">')
    expect(markup.match(/<section aria-labelledby="[^"]+" class="grid gap-3">/g)).toHaveLength(DESIGN_SYSTEM_COLOR_GROUPS.length)
    expect(code("./DesignSystemPreview.tsx")).not.toMatch(/font-mono|--font-mono/)
  })

  it("renames Typography to Type scale: one descending text-5xl to text-xs list of the live Body sample", () => {
    const markup = html()
    expect(Array.from(markup.matchAll(/<h2 [^>]*>([^<]+)<\/h2>/g), match => match[1])).toEqual(["Colors", "Type scale"])
    // PUI-122: both section headings are one step larger (text-lg to text-xl) and keep the Heading role.
    expect(Array.from(markup.matchAll(/<h2 [^>]*class="([^"]+)"/g), match => match[1])).toEqual(["type-heading text-xl", "type-heading text-xl"])
    expect(markup).not.toContain(">Typography<")
    expect(TYPE_SCALE).toEqual(["text-5xl", "text-4xl", "text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-xs"])
    expect(Array.from(markup.matchAll(/data-type-size="([a-z0-9-]+)"/g), match => match[1])).toEqual([...TYPE_SCALE])
    for (const size of TYPE_SCALE) {
      // Label left (small, muted), specimen right at that size in the Body role, one line, truncated rather than overflowing.
      expect(markup).toContain(`<li data-type-size="${size}" class="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-4"><span class="text-xs text-muted-foreground">${size}</span><span class="type-body min-w-0 truncate ${size}">The quick brown fox jumps over the lazy dog.</span></li>`)
    }
    expect(TYPE_SCALE_SAMPLE).toBe("The quick brown fox jumps over the lazy dog.")
    // No former role groups or role-specific samples (the Colors section keeps its own "Muted" colour group).
    expect(markup).not.toMatch(/data-role=|role-meta|type-heading truncate text-4xl|font-mono/)
    const typeScale = markup.slice(markup.indexOf('data-design-section="type-scale"'))
    expect(typeScale).not.toMatch(/<h3|>Heading<|>Body<|>Mono<|>Muted<|text-muted-foreground" data-role/)
    // PUI-114: no summary line beneath the heading, and the metadata is not moved elsewhere in the view.
    expect(markup).not.toMatch(/type-scale-meta|>Body · |ui-sans-serif · /)
    expect(typeScale).toMatch(/^data-design-section="type-scale"[^>]*><h2 [^>]*>Type scale<\/h2><ul class="grid gap-5">/)
  })

  it("maps pairs to Background / Foreground by position in the group only, never renaming a token (PUI-114)", () => {
    const sidebar = [...SIDEBAR_COLOR_TOKENS]
    // PUI-122 supersedes the positional Sidebar wording with contextual display labels.
    expect(sidebar.map(token => swatchLabel(token, sidebar))).toEqual(["Background", "Foreground", "Primary Background", "Primary Foreground", "Accent Background", "Accent Foreground", "Sidebar Border", "Sidebar Ring"])
    expect(["background", "foreground"].map(token => swatchLabel(token, ["background", "foreground"]))).toEqual(["Background", "Foreground"])
    expect(["primary", "primary-foreground"].map(token => swatchLabel(token, ["primary", "primary-foreground"]))).toEqual(["Background", "Foreground"])
    // Without its partner in the same group a token is not a pair.
    expect(swatchLabel("primary", ["primary"])).toBe("primary")
    expect(swatchLabel("card-foreground", ["card-foreground"])).toBe("card-foreground")
    // PUI-126 casing is display-only and changes nothing but letter case.
    expect(["border", "chart-1", "Primary Background", "Sidebar Ring", "Background"].map(titleCaseLabel)).toEqual(["Border", "Chart-1", "Primary Background", "Sidebar Ring", "Background"])
    // The contextual Sidebar labels are distinguishable on their own, so no duplicate screen-reader qualifier remains.
    const markup = html()
    expect(markup).not.toContain('<span class="sr-only">')
    const sidebarLabels = sidebar.map(token => swatchLabel(token, sidebar))
    expect(new Set(sidebarLabels).size).toBe(sidebarLabels.length)
  })

  it("shows display-only uppercase HEX equivalents of canonical OKLCH values, with alpha only when translucent (PUI-114)", () => {
    const canonical = (input: string) => { const result = normalizeColor(input); if (!result.ok) throw new Error(input); return result.value }
    expect(displayHex(canonical("#1a73e8"))).toBe("#1A73E8")
    expect(displayHex(canonical("#ffffff"))).toBe("#FFFFFF")
    expect(displayHex(canonical("#000000"))).toBe("#000000")
    expect(displayHex(canonical("rgb(255 255 255 / 0.1)"))).toBe("#FFFFFF1A")
    expect(displayHex("")).toBe("—")
    expect(displayHex("var(--background)")).toBe("—")
    // The unrendered default has no resolved values: every specimen shows the placeholder, never OKLCH text.
    const markup = html()
    expect(markup.match(/data-testid="token-value" data-resolved="">—</g)).toHaveLength(32)
    expect(markup).not.toMatch(/oklch\(/)
  })

  it("lays Colors and Type scale out as flat padded sections, side by side only when the view's container is wide", () => {
    const source = code("./DesignSystemPreview.tsx")
    expect(source).not.toMatch(/<Card|CardContent|CardHeader|components\/card|shadow-|bg-card/)
    expect(source).toContain('<div data-design-system className="@container min-w-0">')
    expect(source).toContain('<div className="grid min-w-0 grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">')
    expect(source).toContain('className="grid min-w-0 content-start gap-6 p-4 @xl:p-6"')
    const markup = html()
    expect(Array.from(markup.matchAll(/data-design-section="([a-z-]+)"/g), match => match[1])).toEqual(["colors", "type-scale"])
    // Each section is an ordinary element: no card slot, border, background or shadow of its own.
    for (const section of markup.matchAll(/<section [^>]*data-design-section="[a-z-]+"[^>]*>/g)) expect(section[0]).not.toMatch(/\b(border|bg-|shadow|rounded|ring)/)
    expect(markup).not.toContain('data-slot="card')
  })

  it("is read-only and reads the rendered iframe CSS instead of holding a second theme state", () => {
    const source = code("./DesignSystemPreview.tsx")
    expect(source).not.toMatch(/<input|<button|<Button|<Input|<Slider|<Switch|<Select|onChange|onClick|ThemeOperation|applyManual|setColor|themeSchema|previewVariablesCss|renderShadcnTailwindCss|localStorage|postMessage|fetch\(/)
    expect(source).not.toMatch(/import type \{[^}]*\bTheme\b/)
    // Values are the computed custom properties of the live preview document (aliases substituted), never a copy.
    expect(source).toContain("getComputedStyle(document.documentElement)")
    expect(source).toContain("computed.getPropertyValue(name)")
    expect(source).toContain('observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })')
    expect(source).not.toMatch(rawColour)
    const frame = code("./PreviewFrame.tsx")
    expect(frame).toContain('<DesignSystemPreview source={`${state?.mode ?? ""}\\n${state?.css ?? ""}`} />')
    // The only parent-to-preview message is still the rendered CSS and mode.
    expect(read("./messages.ts")).toContain('export type PreviewState = { type: "workbench-preview-state"; css: string; mode: Mode; themeId: string; revision: number }')
  })
})

describe("WGPE-10/WBDS-07 App shells view (PUI-102, PUI-110)", () => {
  const source = () => read("../../../packages/ui/src/compositions/app-shells.tsx")
  /** Markup without the Select's own hidden positioner and native mirror input (inline `position:fixed` by design). */
  const html = () => renderToStaticMarkup(createElement(AppShells)).replace(/<style data-precedence="base-ui[^]*?<\/style>/g, "").replace(/ style="[^"]*position:fixed[^"]*"/g, "")
  const shell = (markup: string, title: string) => markup.slice(markup.indexOf(`data-app-shell="${title}"`), markup.indexOf("</section>", markup.indexOf(`data-app-shell="${title}"`)))

  it("renders three distinct contained shells on the accepted Sidebar's in-flow branch, stacked vertically", () => {
    const markup = html()
    expect(Array.from(markup.matchAll(/data-app-shell="([^"]+)"/g), match => match[1])).toEqual(["Classic workspace", "Inset project", "Compact utility"])
    expect(Array.from(markup.matchAll(/data-shell-variant="([^"]+)"/g), match => match[1])).toEqual(["classic", "inset", "compact"])
    expect(markup.match(/data-slot="sidebar"/g)).toHaveLength(3)
    // PUI-116: one preview-local provider per shell (the shell frame), never one shared by all three.
    expect(markup.match(/data-slot="sidebar-wrapper"/g)).toHaveLength(3)
    // Never the viewport-fixed desktop branch, its gap/container, or the mobile sheet; each rests expanded.
    expect(markup).not.toMatch(/data-slot="sidebar-(gap|container)"|data-collapsible="(icon|offcanvas)"|\bfixed\b|h-svh|min-h-svh/)
    expect(markup.match(/<div data-slot="sidebar" [^>]*data-state="expanded" data-collapsible="">/g)).toHaveLength(3)
    expect(markup.match(/data-shell-state="expanded"/g)).toHaveLength(3)
    expect(source().match(/<Sidebar\s+collapsible="none"/g)).toHaveLength(1)
    expect(source()).not.toMatch(/SidebarRail|<SidebarInset|useSidebar|collapsible="(icon|offcanvas)"/)
    expect(source().match(/<SidebarProvider /g)).toHaveLength(1)
    expect(source()).toContain('<SidebarProvider open={open} onOpenChange={ignoreProviderToggle} onKeyDown={onShortcut} className="block h-[clamp(30rem,58cqw,44rem)] min-h-0 min-w-0 overflow-hidden rounded-xl border shadow-sm"')
    // PUI-110: one vertical sequence (no side-by-side columns), each shell narrower than the panel once it is wide,
    // centred, with one shared landscape height. PUI-127 (ADSR-05): about 90% of a wide panel, with a height
    // proportional to the container width between the accepted 30rem (h-120) floor and 44rem.
    expect(source()).toContain('<div data-app-shells className="@container min-h-0 min-w-0">')
    expect(source()).toContain('<div className="grid min-w-0 gap-8">')
    expect(source()).not.toMatch(/grid-cols-2|col-span|@3xl:grid-cols/)
    expect(source()).toContain('className="mx-auto grid w-full min-w-0 gap-2 @3xl:w-[90%]"')
    expect(markup.match(/data-slot="sidebar-wrapper"[^>]*class="[^"]*\bh-\[clamp\(30rem,58cqw,44rem\)\][^"]*"/g)).toHaveLength(3)
    expect(source()).not.toContain("w-[72%]")
    expect(markup).not.toContain("h-108")
  })

  it("gives every shell its own named trigger that controls only its own Sidebar (PUI-116)", () => {
    const markup = html()
    const ids = Array.from(markup.matchAll(/<div data-slot="sidebar" [^>]*id="([^"]+)"/g), match => match[1])
    for (const [index, title] of ["Classic workspace", "Inset project", "Compact utility"].entries()) {
      const one = shell(markup, title)
      const trigger = one.match(/<button [^>]*data-slot="sidebar-trigger"[^>]*>/g)!
      expect(trigger, title).toHaveLength(1)
      expect(trigger[0]).toContain(`aria-label="Toggle ${title} sidebar"`)
      expect(trigger[0]).toContain('aria-expanded="true"')
      const controls = trigger[0]!.match(/aria-controls="([^"]+)"/)![1]!
      expect(one).toContain(`id="${controls}"`)
      expect(ids.filter(id => id === controls), title).toHaveLength(1)
      expect(markup.indexOf(`aria-controls="${controls}"`)).toBe(markup.lastIndexOf(`aria-controls="${controls}"`))
      expect(ids[index]).toBe(controls)
    }
    // The scoped shortcut: provider-originated toggles are ignored, and the shell's own handler stops the event from
    // reaching any document-wide listener. No listener, persistence or shared state of its own.
    const code = source().replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
    expect(code).toContain("const ignoreProviderToggle = () => {}")
    expect(code).toMatch(/event\.preventDefault\(\)\s*event\.stopPropagation\(\)\s*toggle\(\)/)
    expect(code).toMatch(/const isSidebarShortcut = \(event: KeyboardEvent\) => event\.key === "b" && \(event\.metaKey \|\| event\.ctrlKey\)/)
    expect(code).not.toMatch(/addEventListener|localStorage|sessionStorage|document\.cookie|createContext|window\./)
  })

  it("shares one Sidebar pattern: workspace switcher, grouped icon navigation with one active item, profile footer", () => {
    const markup = html()
    expect(Array.from(markup.matchAll(/<nav aria-label="([^"]+)"/g), match => match[1])).toEqual(["Classic workspace navigation", "Inset project navigation", "Compact utility navigation"])
    expect(markup.match(/aria-current="page"/g)).toHaveLength(3)
    expect(markup.match(/data-active="true"/g)).toHaveLength(3)
    for (const [title, workspace, page] of [["Classic workspace", "Northwind", "Home"], ["Inset project", "Atlas", "Documents"], ["Compact utility", "Harbor", "Inbox"]] as const) {
      const one = shell(markup, title)
      // Header: the accepted Select as a named workspace switcher, never a static logo/name.
      expect(one, title).toMatch(new RegExp(`data-slot="sidebar-header"[\\s\\S]*?data-slot="select-trigger"[^>]*aria-label="${title} workspace"`))
      expect(one.match(/data-slot="select-trigger"/g), title).toHaveLength(1)
      expect(one, title).toContain(`<span class="truncate font-medium">${workspace}</span>`)
      // Grouped navigation: the same two labelled groups and five icon items in every shell.
      expect(Array.from(one.matchAll(/data-slot="sidebar-group-label"[^>]*>([^<]+)</g), match => match[1]), title).toEqual(["Workspace", "Team"])
      expect(one.match(/data-slot="sidebar-menu-button"/g), title).toHaveLength(5)
      expect(one.match(/data-slot="sidebar-menu-button"[^>]*>(<svg[^>]*aria-hidden="true")/g), title).toHaveLength(5)
      expect(one, title).toMatch(new RegExp(`aria-current="page"[^>]*>[\\s\\S]*?<span>${page}</span>`))
      // Footer: the accepted Avatar profile.
      expect(one, title).toMatch(/data-slot="sidebar-footer"[\s\S]*data-slot="avatar"[\s\S]*Maya Chen/)
      // The shared abstract main panel: a breadcrumb row, three muted blocks and one larger muted block.
      expect(one, title).toMatch(new RegExp(`data-shell-header="true"><span class="truncate text-muted-foreground">${workspace}</span><span aria-hidden="true" class="text-muted-foreground">/</span><span class="truncate font-medium">${page}</span>`))
      const content = one.slice(one.indexOf("data-shell-content"))
      expect(content.match(/rounded-lg bg-muted"/g), title).toHaveLength(4)
      expect(content.match(new RegExp(`${title === "Compact utility" ? "h-16" : "h-24"} rounded-lg bg-muted"`, "g")), title).toHaveLength(3)
    }
    // Only the three switchers, the navigation and (PUI-116) one SidebarTrigger per shell are interactive; main areas
    // are abstract.
    expect(markup.match(/<button /g)).toHaveLength(3 + 3 + markup.match(/data-slot="sidebar-menu-button"/g)!.length)
    expect(markup.match(/data-slot="sidebar-trigger"/g)).toHaveLength(3)
    expect(source()).not.toMatch(/<table|<Table|<Chart|<Input|<form|<textarea|recharts/)
  })

  it("stays on semantic tokens and the unchanged public Sidebar, Select and Avatar APIs", () => {
    expect(source()).not.toMatch(rawColour)
    for (const module of ["../components/sidebar", "../components/select", "../components/avatar"]) expect(source()).toContain(`from "${module}"`)
    for (const token of ["bg-sidebar", "border-sidebar-border", "bg-sidebar-primary", "text-sidebar-primary-foreground", "hover:bg-sidebar-accent", "bg-background", "bg-muted", "text-muted-foreground", "type-heading", "shadow-sm", "rounded-"]) expect(source()).toContain(token)
    expect(source()).not.toMatch(/fetch\(|https?:\/\/|localStorage|sessionStorage|addEventListener|setTimeout|setInterval/)
    // PUI-127: only Inset sets its sidebar and connected body on muted, with the restrained shadow-2xs inset panel.
    const markup = html()
    const inset = shell(markup, "Inset project")
    expect(inset).toMatch(/data-slot="sidebar"[^>]*class="[^"]*\bbg-muted\b/)
    expect(inset).toMatch(/<div class="flex h-full min-w-0 gap-2 bg-muted p-2" data-shell-body="true">/)
    expect(inset).toMatch(/<div class="flex min-w-0 flex-1 rounded-lg border bg-background shadow-2xs" data-shell-inset="true">/)
    expect(inset).not.toMatch(/shadow-sm" data-shell-inset|bg-sidebar p-2/)
    for (const title of ["Classic workspace", "Compact utility"]) {
      const one = shell(markup, title)
      expect(one, title).not.toMatch(/data-shell-body|data-shell-inset|data-slot="sidebar"[^>]*class="[^"]*\bbg-muted\b/)
      expect(one, title).toMatch(/data-slot="sidebar"[^>]*class="[^"]*border-r border-sidebar-border/)
    }
    // Desktop-app chrome: the main header matches the h-16 Sidebar header (h-12 compact) with a px-4 inset.
    expect(source()).toContain('density === "compact" ? "h-12 px-3" : "h-16 px-4"')
    expect(source()).toContain('classic: "clamp(10rem, 30%, 16rem)", inset: "clamp(10rem, 30%, 16rem)", compact: "clamp(9rem, 26%, 13.5rem)"')
    // Distinct treatments without separate sidebar architectures: one Shell renders all three.
    expect(source().match(/function Shell\(/g)).toHaveLength(1)
    expect(source().match(/<Shell /g)).toHaveLength(3)
  })
})
