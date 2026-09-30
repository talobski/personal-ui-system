# PUI-141 producer selection diagnosis (TCHS-05)

Producer self-check, not acceptance evidence. Diagnosed before any source edit, on base
`9f0037190eeef6589d1f05b1d1ca8215bcbc01e4`, Workbench Vite dev server, Chromium (Playwright 1.63),
1440×900 at device scale 3, Default theme, light mode. Geometry Radius set through the Radius textbox
to `0`, `0.5` and `2.5` rem (min, medium, max of `radiusBase` 0–2.5 rem).

## Observation

| Surface | Radius 0 | 0.5 rem | 2.5 rem |
| --- | --- | --- | --- |
| Quick find search (Cards) | square | ends rounded (6 px) | ends fully rounded (pill caps) |
| Team chat composer (Cards) | square | ends rounded | ends fully rounded |
| States "With value" Input | square | square | square |
| Workbench Design command Textarea | square | square | square |

At every radius `getComputedStyle(input, "::selection")` reports `border-radius: 0px` and the same
background/foreground (`--primary` / `--primary-foreground` through Input's `selection:` utilities).

## Cause

There is no `::selection` radius rule in core's renderer, `globals.css`, Workbench `styles.css` or any
component. The rounding is Chromium clipping an `<input>`'s inner editor (computed `overflow: clip`)
to the input's own rounded border box. The shared Input primitive carries `rounded-md` (theme radius).
Quick find and Team chat both embed that Input borderless, transparent and padless (`h-auto px-0 py-0`,
20 px tall) inside an input-styled row that owns the visible border and radius. The inner radius is
invisible (no border, background or ring), but with zero padding the full-height selection highlight
meets the corners and is clipped: 6 px at medium, clamped to 10 px (half height) at max. Standalone
Inputs and Textareas are unaffected because their padding keeps the highlight inside the straight edges.
Every visible surface (rows, inputs, textareas) is square at 0 and follows the radius elsewhere.

## Correction

The shared pattern (borderless Input embedded in a framed row) occurs exactly twice:
`packages/ui/src/compositions/quick-find.tsx` and `team-chat.tsx`. Both embedded Inputs now add
`rounded-none`, as shadcn's InputGroupInput does. The Input primitive, its public contract, the
visible row radius, the core renderer, selection colours and native selection are unchanged; no custom
selection is introduced. After the change both surfaces measure `border-radius: 0px` and show a square
highlight at 0, 0.5 and 2.5 rem, with identical selection colours. The Combobox input has no own
radius and was not involved.
