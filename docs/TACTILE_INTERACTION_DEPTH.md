# Tactile interaction depth

Tactile is the `uiEffects` effect that gives interactive controls subtle depth. Static surfaces stay flat. `renderUiEffectsCss` in `packages/core/src/theme/render.ts` renders it as one `@layer components` block. The live preview and the exported Theme Code CSS append the same text, so they always match.

## Roles

| Role | Controls | Depth |
| --- | --- | --- |
| Raised | Secondary and Outline Buttons, outline Toggles and ToggleGroup items | 1px inner top highlight, 1px inner lower shade. Secondary also keeps its wash and faint edge |
| Filled | Primary Buttons; checked Checkboxes, Radios and Switches | Fill-aware top highlight and lower shade over the unchanged semantic fill |
| Recessed | Input, Textarea, Select and NativeSelect, field groups, the surface TabsList track, unchecked Checkboxes, Radios and Switches | Shallow 2px inset |
| Pressed | `:active`, `aria-pressed`, open Outline Buttons, selected outline Toggles | Inset; the outer elevation is removed |
| Flat | Disabled controls, or `data-tactile="flat"` on a control or an ancestor | Every tactile layer removed |

Primary and Secondary Buttons and the Switch thumb take `--ui-tactile-elevation` as their outer elevation. It is built from the theme's own `xs` shadow. Controls that already carry `shadow-xs` keep it.

These are never targets: ghost, link and destructive Buttons, cards, tables, lists, avatars, badges, labels, overlays, Sidebar, Slider, line Tabs and Tabs triggers. The active surface tab keeps shadcn's own raised look (`bg-background` and `shadow-sm`) above the recessed track. An inner lower shade would sit inside its transparent 1px border, above `shadow-sm`, and stack a dark, light, dark band along its bottom edge.

## Tokens and strength

The palette is defined on `:root` and `.dark` as `--ui-tactile-{highlight, shade, edge, recess, press, fill-highlight, fill-shade, wash-top, wash-bottom}`. Each token is a `color-mix()` of `--background` or `--foreground` with `transparent`; dark mode swaps which of the two lights and which shades. The roles are composed from the palette as `--ui-tactile-{raised, filled, recessed, pressed}`.

Hover moves an Outline or field border, or the Primary fill, toward `--foreground` through `--ui-tactile-hover-{border, input, primary}`.

Strength (0 to 100) scales every palette alpha and the hover mix linearly; it never changes a semantic colour.

Two contributions come from theme tokens: the surface TabsList edge (`--ui-tactile-track-edge`) and the outer elevation (`--ui-tactile-elevation`). Each fades in linearly and reaches the theme's own value at the default strength (50): the edge becomes `inset-ring-border/80` and the elevation becomes `var(--shadow-layers-xs)`. Above 50 they hold at that value. Below 50 the elevation keeps the theme's own `xs` layers and fades only their alpha.

Strength 0 renders nothing, exactly like Off.

## State precedence

Every rule uses zero specificity, so source order decides: resting, then hover, then checked or selected, then pressed or open, then Flat.

Focus and invalid styling is never touched. Rings live in Tailwind's ring slot, and the `focus-visible:` and `aria-invalid:` border utilities sit above this layer, so they always win over hover and depth. Tactile adds no press translation. Button-like controls use `--motion-duration-fast`; fields keep the base duration. The theme's reduced-motion rule zeroes both.

## Requirements for consuming projects

- Use shadcn components with their standard `data-slot` attributes. Buttons also need `data-variant` and `data-size`, which shadcn v4's Button emits. Radix or Base UI state attributes (`data-state`, `aria-checked`, `aria-pressed`, `aria-expanded`, `disabled`) drive the states.
- Standalone `Toggle` needs `data-variant` for its outline variant to be recognised; this repo's Toggle emits it, while stock shadcn's does not. ToggleGroup items already carry it.
- In a field group, the wrapper owns the recess. Give the nested field `data-slot="input-group-control"`, as shadcn's `InputGroupInput` does, so its depth is not doubled. Any parent of such a control counts as a group.
- Line Tabs need `data-variant="line"` on the TabsList.
- Mark a borderless or menu-style control, or a whole region, with `data-tactile="flat"` to opt out.
- Tailwind v4 is expected: the block fills Tailwind's `--tw-inset-shadow`, `--tw-shadow` and `--tw-duration` slots, so utilities such as `shadow-*`, `ring-*` and `duration-*` still override it.
