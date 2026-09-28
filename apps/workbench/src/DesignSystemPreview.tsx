import * as React from "react"

import { isSidebarColorToken, SIDEBAR_TOKEN_ALIASES } from "@personal-ui/core"

import { COLOR_GROUPS } from "./controls"

/**
 * PUI-109: the Workbench sidebar's own colour groups, in its exact order (Primary ... Sidebar), reused rather than
 * copied so the reference sheet can never drift from the editor. Every semantic token, Sidebar included, appears once.
 */
export const DESIGN_SYSTEM_COLOR_GROUPS = COLOR_GROUPS

/** The type-scale specimen sizes, largest first: Tailwind's text-5xl down to text-xs. */
export const TYPE_SCALE = ["text-5xl", "text-4xl", "text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-xs"] as const
export const TYPE_SCALE_SAMPLE = "The quick brown fox jumps over the lazy dog."

const BODY_VARIABLES = ["--font-body", "--font-weight-body", "--tracking-body"] as const

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
  const names = DESIGN_SYSTEM_COLOR_GROUPS.flatMap(group => group.tokens).map(token => `--${token}`)
  const values = Object.fromEntries([...names, ...BODY_VARIABLES].map(name => [name, computed.getPropertyValue(name).trim()]))
  const sheet = (document.getElementById("workbench-theme") as HTMLStyleElement | null)?.sheet
  const selector = root.classList.contains("dark") ? ".dark" : ":root"
  const rule = Array.from(sheet?.cssRules ?? []).find((entry): entry is CSSStyleRule => entry instanceof CSSStyleRule && entry.selectorText === selector)
  return { values, sidebarAliases: rule?.style.getPropertyValue("--sidebar").trim().startsWith("var(") ?? true }
}

/** The first family of a rendered stack, unquoted: the family the browser tries first. */
const firstFamily = (stack: string | undefined) => stack?.split(",")[0]?.trim().replace(/^["']|["']$/g, "") || "—"

/** Swatch, semantic name and resolved value; names wrap at their hyphens, values in the Body role truncate. */
function Swatch({ token, value, alias }: { token: string; value: string; alias?: string }) {
  return (
    <li className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-3" data-token={token}>
      <span aria-hidden="true" className="size-12 rounded-md border" style={{ background: `var(--${token})` }} />
      <span className="grid min-w-0">
        <span className="text-sm font-medium">{token}</span>
        {alias && <span className="truncate text-xs text-muted-foreground" data-testid="sidebar-alias">= {alias}</span>}
        <span className="truncate text-xs text-muted-foreground" data-testid="token-value" title={value}>{value || "—"}</span>
      </span>
    </li>
  )
}

/** One sidebar group. Two columns keep each background / foreground pair side by side; singletons follow in order. */
function SwatchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h3 id={id} className="text-xs font-medium text-muted-foreground uppercase">{label}</h3>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</ul>
    </section>
  )
}

/** A flat sheet section: a heading and padding only, with no card border, surface or shadow. */
function Sheet({ name, title, children }: { name: string; title: string; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} data-design-section={name} className="grid min-w-0 content-start gap-6 p-4 @xl:p-6">
      <h2 id={id} className="type-heading text-lg">{title}</h2>
      {children}
    </section>
  )
}

/**
 * PUI-101/PUI-109: a read-only design-system reference sheet for the live preview theme. It holds no theme state and no
 * controls: the swatches paint from the same custom properties as every other preview surface, and the labels are what
 * the iframe CSS currently resolves to. Colors and Type scale are flat padded sections, side by side once the view's
 * own container is wide enough and stacked below that. Colors mirrors the Workbench sidebar's groups; the Sidebar
 * group shows the effective values (base aliases while dedicated tokens are off). Type scale is one descending list of
 * the same sample at each Tailwind size in the live Body role, one line each and truncated rather than overflowing. `source` changes whenever the parent posts new CSS or
 * mode; a class observer on the root catches the light/dark switch, which the frame applies after this view's effects.
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
  const body = [firstFamily(value("--font-body")), value("--font-weight-body"), value("--tracking-body")].filter(Boolean).join(" · ")
  return (
    <div data-design-system className="@container min-w-0">
      <div className="grid min-w-0 grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Sheet name="colors" title="Colors">
          {DESIGN_SYSTEM_COLOR_GROUPS.map(group => {
            const sidebar = group.id === "sidebar"
            const label = sidebar ? `${group.title} · ${rendered.sidebarAliases ? "base aliases" : "dedicated"}` : group.title
            return (
              <SwatchGroup key={group.id} label={label}>
                {group.tokens.map(token => (
                  <Swatch key={token} token={token} value={value(`--${token}`)} alias={sidebar && rendered.sidebarAliases && isSidebarColorToken(token) ? SIDEBAR_TOKEN_ALIASES[token] : undefined} />
                ))}
              </SwatchGroup>
            )
          })}
        </Sheet>
        <Sheet name="type-scale" title="Type scale">
          <p className="-mt-4 truncate text-xs text-muted-foreground" data-testid="type-scale-meta">Body · {body}</p>
          <ul className="grid gap-5">
            {TYPE_SCALE.map(size => (
              <li key={size} data-type-size={size} className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-4">
                <span className="text-xs text-muted-foreground">{size}</span>
                <span className={`type-body min-w-0 truncate ${size}`}>{TYPE_SCALE_SAMPLE}</span>
              </li>
            ))}
          </ul>
        </Sheet>
      </div>
    </div>
  )
}
