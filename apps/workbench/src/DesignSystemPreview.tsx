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
 * PUI-114 display-only label for a swatch in its group: the background side of a semantic pair reads `Background` and
 * its `-foreground` partner `Foreground` (Base's own `background` / `foreground` pair included); an unpaired token keeps
 * its key. Token keys, editor labels and aliases are untouched: this is the reference sheet's wording only.
 */
export function swatchLabel(token: string, tokens: readonly string[]): string {
  const base = token === "foreground" ? "background" : token.endsWith("-foreground") ? token.slice(0, -"-foreground".length) : null
  if (base !== null && tokens.includes(base)) return "Foreground"
  const partner = token === "background" ? "foreground" : `${token}-foreground`
  return tokens.includes(partner) ? "Background" : token
}

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
 * A wide rectangular swatch over its display label and resolved HEX; labels and values truncate rather than overflow.
 * In the Sidebar group, where three pairs share the Background / Foreground wording, the pair name stays available to
 * assistive technology.
 */
function Swatch({ token, label, qualifier, value }: { token: string; label: string; qualifier?: string; value: string }) {
  return (
    <li className="grid min-w-0 content-start gap-1.5" data-token={token}>
      <span aria-hidden="true" className="h-10 w-full rounded-md border" data-testid="swatch" style={{ background: `var(--${token})` }} />
      <span className="grid min-w-0">
        <span className="truncate text-sm font-medium" data-testid="token-label">{qualifier && <span className="sr-only">{qualifier} </span>}{label}</span>
        <span className="truncate text-xs text-muted-foreground tabular-nums" data-testid="token-value" data-resolved={value}>{displayHex(value)}</span>
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
 * PUI-101/PUI-109/PUI-114: a read-only design-system reference sheet for the live preview theme. It holds no theme state
 * and no controls: the swatches paint from the same custom properties as every other preview surface, and each value
 * is the HEX equivalent of what the iframe CSS currently resolves. Colors and Type scale are flat padded sections, side
 * by side once the view's own container is wide enough and stacked below that. Colors mirrors the Workbench sidebar's
 * groups under their plain titles; the Sidebar group shows the effective values (base aliases while dedicated tokens
 * are off, dedicated values once on) with no alias annotations. Type scale is one descending list of the same sample
 * at each Tailwind size in the live Body role, one line each and truncated rather than overflowing, with no summary
 * line. `source` changes whenever the parent posts new CSS or mode; a class observer on the root catches the
 * light/dark switch, which the frame applies after this view's effects.
 */
export function DesignSystemPreview({ source }: { source: string }) {
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
          {DESIGN_SYSTEM_COLOR_GROUPS.map(group => (
            <SwatchGroup key={group.id} label={group.title}>
              {group.tokens.map(token => {
                const label = swatchLabel(token, group.tokens)
                const pair = label === "Foreground" ? token.replace(/-?foreground$/, "") : token
                const qualifier = group.id === "sidebar" && label !== token && pair !== "sidebar" ? `Sidebar ${pair.slice("sidebar-".length)}` : undefined
                return <Swatch key={token} token={token} label={label} qualifier={qualifier} value={rendered[`--${token}`] ?? ""} />
              })}
            </SwatchGroup>
          ))}
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
}
