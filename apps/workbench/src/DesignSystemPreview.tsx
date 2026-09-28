import * as React from "react"

import { SIDEBAR_COLOR_TOKENS, SIDEBAR_TOKEN_ALIASES } from "@personal-ui/core"
import type { BaseColorToken, SidebarColorToken } from "@personal-ui/core"
import { Card, CardContent, CardHeader, CardTitle } from "@personal-ui/ui/components/card"

/** Every base semantic colour exactly once, in readable groups; the Sidebar group is added from the core token list. */
export const DESIGN_SYSTEM_COLOR_GROUPS = [
  { label: "Base", tokens: ["background", "foreground"] },
  { label: "Surfaces", tokens: ["card", "card-foreground", "popover", "popover-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground"] },
  { label: "Intent", tokens: ["primary", "primary-foreground", "accent", "accent-foreground", "destructive", "destructive-foreground"] },
  { label: "Boundaries", tokens: ["border", "input", "ring"] },
  { label: "Charts", tokens: ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] },
] as const satisfies readonly { label: string; tokens: readonly BaseColorToken[] }[]

const ROLE_VARIABLES = ["--font-heading", "--font-weight-heading", "--tracking-heading", "--font-body", "--font-weight-body", "--tracking-body", "--font-mono"] as const

/** What the preview document currently renders, read back from its own stylesheet; never a second theme object. */
type Rendered = {
  values: Readonly<Record<string, string>>
  /** Sidebar source in the current mode: true while every Sidebar token renders its base alias, false for dedicated. */
  sidebarAliases: boolean
}

/**
 * Reads the resolved custom properties from the live iframe CSS. A custom property's computed value has its `var()`
 * references substituted, so an aliased Sidebar token reports its base semantic's value. Whether the Sidebar is aliased
 * is read from the rendered `workbench-theme` rule for the active mode, the one place the source selection is expressed.
 */
function readRendered(): Rendered {
  const root = document.documentElement
  const computed = getComputedStyle(root)
  const names = [...DESIGN_SYSTEM_COLOR_GROUPS.flatMap(group => group.tokens), ...SIDEBAR_COLOR_TOKENS].map(token => `--${token}`)
  const values = Object.fromEntries([...names, ...ROLE_VARIABLES].map(name => [name, computed.getPropertyValue(name).trim()]))
  const sheet = (document.getElementById("workbench-theme") as HTMLStyleElement | null)?.sheet
  const selector = root.classList.contains("dark") ? ".dark" : ":root"
  const rule = Array.from(sheet?.cssRules ?? []).find((entry): entry is CSSStyleRule => entry instanceof CSSStyleRule && entry.selectorText === selector)
  return { values, sidebarAliases: rule?.style.getPropertyValue("--sidebar").trim().startsWith("var(") ?? true }
}

/** The first family of a rendered stack, unquoted: the family the browser tries first. */
const firstFamily = (stack: string | undefined) => stack?.split(",")[0]?.trim().replace(/^["']|["']$/g, "") || "—"

function Swatch({ token, value, alias }: { token: string; value: string; alias?: string }) {
  return (
    <li className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3" data-token={token}>
      <span aria-hidden="true" className="size-10 rounded-md border" style={{ background: `var(--${token})` }} />
      <span className="grid min-w-0">
        <span className="truncate text-sm font-medium">{token}</span>
        {alias && <span className="truncate text-xs text-muted-foreground" data-testid="sidebar-alias">= {alias}</span>}
        <span className="truncate font-mono text-xs text-muted-foreground" data-testid="token-value" title={value}>{value || "—"}</span>
      </span>
    </li>
  )
}

function SwatchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h3 id={id} className="text-xs font-medium text-muted-foreground uppercase">{label}</h3>
      <ul className="grid grid-cols-1 gap-3 @md:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4">{children}</ul>
    </section>
  )
}

/** One type role: its label, the resolved family / weight / tracking, then representative component-owned sizes. */
function Role({ role, label, family, weight, tracking, children }: { role: string; label: string; family: string; weight?: string; tracking?: string; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className="grid min-w-0 gap-2" data-role={role}>
      <h3 id={id} className="text-xs font-medium text-muted-foreground uppercase">{label}</h3>
      <p className="truncate font-mono text-xs text-muted-foreground" data-testid="role-meta">{[family, weight, tracking].filter(Boolean).join(" · ")}</p>
      {children}
    </section>
  )
}

/**
 * PUI-101: a read-only design-system reference for the live preview theme. It holds no theme state and no controls:
 * the swatches paint from the same custom properties as every other preview surface, and the labels are what the
 * iframe CSS currently resolves to. `source` changes whenever the parent posts new CSS or mode; a class observer on
 * the root catches the light/dark switch, which the frame applies after this view's effects run.
 */
export function DesignSystemPreview({ source }: { source: string }) {
  const [rendered, setRendered] = React.useState<Rendered>({ values: {}, sidebarAliases: true })
  React.useEffect(() => {
    const read = () => setRendered(readRendered())
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [source])
  const value = (name: string) => rendered.values[name] ?? ""
  const heading = { family: firstFamily(value("--font-heading")), weight: value("--font-weight-heading"), tracking: value("--tracking-heading") }
  const body = { family: firstFamily(value("--font-body")), weight: value("--font-weight-body"), tracking: value("--tracking-body") }
  return (
    <div data-design-system className="@container grid min-w-0 gap-4">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle><h2 className="type-heading text-lg">Colors</h2></CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          {DESIGN_SYSTEM_COLOR_GROUPS.map(group => (
            <SwatchGroup key={group.label} label={group.label}>
              {group.tokens.map(token => <Swatch key={token} token={token} value={value(`--${token}`)} />)}
            </SwatchGroup>
          ))}
          <SwatchGroup label={rendered.sidebarAliases ? "Sidebar · base aliases" : "Sidebar · dedicated"}>
            {SIDEBAR_COLOR_TOKENS.map((token: SidebarColorToken) => (
              <Swatch key={token} token={token} value={value(`--${token}`)} alias={rendered.sidebarAliases ? SIDEBAR_TOKEN_ALIASES[token] : undefined} />
            ))}
          </SwatchGroup>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle><h2 className="type-heading text-lg">Typography</h2></CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <Role role="heading" label="Heading" {...heading}>
            <p className="type-heading truncate text-4xl">Calm, clear titles</p>
            <p className="type-heading truncate text-2xl">Section heading</p>
            <p className="type-heading truncate text-lg">Card title</p>
          </Role>
          <Role role="body" label="Body" {...body}>
            <p className="text-base">Body text carries the reading experience: readable measure, steady rhythm.</p>
            <p className="text-sm">Smaller body text for controls, labels and dense surfaces.</p>
            <p className="text-sm text-muted-foreground" data-role="muted">Muted body text for secondary descriptions and hints.</p>
          </Role>
          <Role role="mono" label="Mono" family={firstFamily(value("--font-mono"))}>
            <p className="truncate font-mono text-sm">const revision = 12 // tabular 0123456789</p>
          </Role>
        </CardContent>
      </Card>
    </div>
  )
}
