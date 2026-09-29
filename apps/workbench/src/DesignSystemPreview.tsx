import * as React from "react"

import { parseCanonicalOklch } from "@personal-ui/core"

import { COLOR_GROUPS, pickerHex } from "./controls"

/**
 * PUI-109: the Workbench sidebar's own colour groups, in its exact order (Primary ... Sidebar), reused rather than
 * copied so the reference sheet can never drift from the editor. Every semantic token, Sidebar included, appears once.
 */
export const DESIGN_SYSTEM_COLOR_GROUPS = COLOR_GROUPS

/** The type-scale specimen sizes, largest first: Tailwind's text-5xl down to text-xs. */
export const TYPE_SCALE = ["text-5xl", "text-4xl", "text-3xl", "text-2xl", "text-xl", "text-lg", "text-base", "text-sm", "text-xs"] as const
export const TYPE_SCALE_SAMPLE = "The quick brown fox jumps over the lazy dog."

/**
 * PUI-122 display-only Sidebar wording: the three Sidebar pairs are named by their role within the Sidebar group, and the
 * unpaired border and ring read as Sidebar Border / Sidebar Ring. Keys, CSS variables, editor labels and aliases are
 * unchanged; this is the reference sheet's wording only.
 */
export const SIDEBAR_SWATCH_LABELS: Readonly<Record<string, string>> = Object.freeze({
  sidebar: "Background",
  "sidebar-foreground": "Foreground",
  "sidebar-primary": "Primary Background",
  "sidebar-primary-foreground": "Primary Foreground",
  "sidebar-accent": "Accent Background",
  "sidebar-accent-foreground": "Accent Foreground",
  "sidebar-border": "Sidebar Border",
  "sidebar-ring": "Sidebar Ring",
})

/**
 * PUI-114 display-only label for a swatch in its group: the background side of a semantic pair reads `Background` and
 * its `-foreground` partner `Foreground` (Base's own `background` / `foreground` pair included); an unpaired token keeps
 * its key. Token keys, editor labels and aliases are untouched: this is the reference sheet's wording only.
 */
export function swatchLabel(token: string, tokens: readonly string[]): string {
  const sidebar = SIDEBAR_SWATCH_LABELS[token]
  if (sidebar !== undefined) return sidebar
  const base = token === "foreground" ? "background" : token.endsWith("-foreground") ? token.slice(0, -"-foreground".length) : null
  if (base !== null && tokens.includes(base)) return "Foreground"
  const partner = token === "background" ? "foreground" : `${token}-foreground`
  return tokens.includes(partner) ? "Background" : token
}

/**
 * PUI-126 display casing for a swatch label: each word's first letter upper-cased (`border` -> `Border`, `chart-1` ->
 * `Chart-1`), wording otherwise unchanged. `swatchLabel`'s mapping and every token key stay as they are.
 */
export const titleCaseLabel = (label: string) => label.replace(/(^|[\s-])([a-z])/g, (_, lead: string, letter: string) => `${lead}${letter.toUpperCase()}`)

/**
 * PUI-114 display-only HEX for a resolved token value: the nearest sRGB `#RRGGBB` (the editor's own picker conversion),
 * with a trailing alpha byte only when the token is translucent. Stored, edited and exported colours stay OKLCH.
 */
export function displayHex(value: string): string {
  const parsed = parseCanonicalOklch(value)
  if (!parsed) return "—"
  const hex = pickerHex(value)
  return (parsed.alpha < 1 ? `${hex}${Math.round(parsed.alpha * 255).toString(16).padStart(2, "0")}` : hex).toUpperCase()
}

/**
 * Reads the resolved custom properties from the live iframe CSS: what the preview document currently renders, never a
 * second theme object. A custom property's computed value has its `var()` references substituted, so an aliased Sidebar
 * token reports its base semantic's value and a dedicated one its own.
 */
function readRendered(): Readonly<Record<string, string>> {
  const computed = getComputedStyle(document.documentElement)
  const names = DESIGN_SYSTEM_COLOR_GROUPS.flatMap(group => group.tokens).map(token => `--${token}`)
  return Object.fromEntries(names.map(name => [name, computed.getPropertyValue(name).trim()]))
}

/**
 * A rectangular swatch (PUI-122: four fifths of its column, still wider than tall) over its display label and resolved
 * HEX; labels and values truncate rather than overflow. PUI-126: the label is a supporting title-case line at the HEX
 * size in the base foreground; the HEX stays muted. Labels are contextual, so no extra screen-reader qualifier is added.
 */
function Swatch({ token, label, value }: { token: string; label: string; value: string }) {
  return (
    <li className="grid min-w-0 content-start gap-1.5" data-token={token}>
      <span aria-hidden="true" className="h-10 w-4/5 rounded-md border" data-testid="swatch" style={{ background: `var(--${token})` }} />
      <span className="grid min-w-0">
        <span className="truncate text-xs font-normal text-foreground" data-testid="token-label">{titleCaseLabel(label)}</span>
        <span className="truncate text-xs text-muted-foreground tabular-nums" data-testid="token-value" data-resolved={value}>{displayHex(value)}</span>
      </span>
    </li>
  )
}

/**
 * One sidebar group. Two columns keep each background / foreground pair side by side; singletons follow in order.
 * PUI-126/PUI-131: the group heading is the uppercase anchor at text-sm, one step above its labels, in the base foreground.
 */
function SwatchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <h3 id={id} className="text-sm font-medium text-foreground uppercase">{label}</h3>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</ul>
    </section>
  )
}

/** A flat sheet section: a heading and padding only, with no card border, surface or shadow. */
function Sheet({ name, title, children }: { name: string; title: string; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} data-design-section={name} className="grid min-w-0 content-start gap-6 p-4 @xl:p-6">
      <h2 id={id} className="type-heading text-xl">{title}</h2>
      {children}
    </section>
  )
}

/**
 * PUI-101/PUI-109/PUI-114: a read-only design-system reference sheet for the live preview theme. It holds no theme state
 * and no controls: the swatches paint from the same custom properties as every other preview surface, and each value
 * is the HEX equivalent of what the iframe CSS currently resolves. PUI-126 hierarchy: section heading, then uppercase
 * group heading, then the title-case supporting label, then the muted HEX. Colors and Type scale are flat padded sections, side
 * by side once the view's own container is wide enough and stacked below that. Colors mirrors the Workbench sidebar's
 * groups under their plain titles; the Sidebar group shows the effective values (base aliases while dedicated tokens
 * are off, dedicated values once on) with no alias annotations. Type scale is one descending list of the same sample
 * at each Tailwind size in the live Body role, one line each and truncated rather than overflowing, with no summary
 * line. `source` changes whenever the parent posts new CSS or mode; a class observer on the root catches the
 * light/dark switch, which the frame applies after this view's effects. Memoized on `source` (PUI-118): a preview view
 * switch or a value-identical repost does not re-render the sheet.
 */
export const DesignSystemPreview = React.memo(function DesignSystemPreview({ source }: { source: string }) {
  const [rendered, setRendered] = React.useState<Readonly<Record<string, string>>>({})
  React.useEffect(() => {
    const read = () => setRendered(readRendered())
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [source])
  return (
    <div data-design-system className="@container min-w-0">
      <div className="grid min-w-0 grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Sheet name="colors" title="Colors">
          {/* PUI-122: slightly more space between groups (gap-7) than within them (gap-3). */}
          <div className="grid min-w-0 gap-7" data-testid="color-groups">
            {DESIGN_SYSTEM_COLOR_GROUPS.map(group => (
              <SwatchGroup key={group.id} label={group.title}>
                {group.tokens.map(token => <Swatch key={token} token={token} label={swatchLabel(token, group.tokens)} value={rendered[`--${token}`] ?? ""} />)}
              </SwatchGroup>
            ))}
          </div>
        </Sheet>
        <Sheet name="type-scale" title="Type scale">
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
})
