import type { ThemeV1 } from "./schema-v1"
import type { ThemeV2_0 } from "./schema"

/**
 * Declared defaults for the v1 -> v2 migration. Every v1 value is carried over unchanged (colours and lengths are then
 * canonicalized by the v2 schema); only tokens v1 cannot express are added, each from this closed table:
 *
 * - `colors.{light,dark}.destructive-foreground`: the built-in Default values.
 * - `typography.serif`: the built-in Default serif stack. `typography.tracking`: `0em` (v1 rendered no tracking).
 * - `radius.base`: v1 `radius.md`, because v1 rendered `--radius` from `radius.md`.
 * - `radius.xl` and shadow tiers `2xs`, `xs`, `xl`, `2xl`: v1 could not express these, so every v1 theme rendered
 *   Tailwind v4's own defaults for them (tailwindcss 4.3.3 `theme.css`). Migration writes exactly those values, so a
 *   migrated theme renders what it rendered before; they are copied here as canonical data, not read at runtime.
 * - Shadow tier `default` (the bare `shadow` utility, which v1 did not render): a copy of v1 `sm`.
 * - Shadows `sm`, `md`, `lg` keep their v1 layers; every v1 layer gains `inset: false`. An empty v1 layer list
 *   (rendered as `none`) becomes one fully transparent zero-length layer, because v2 tiers are non-empty; it renders
 *   no visible shadow.
 */
const layer = (offsetX: string, offsetY: string, blur: string, spread: string, alpha: number) =>
  Object.freeze({ inset: false, offsetX, offsetY, blur, spread, color: `oklch(0 0 0 / ${alpha})` })

export const V1_MIGRATION_DEFAULTS = Object.freeze({
  destructiveForeground: Object.freeze({ light: "oklch(1 0 0)", dark: "oklch(0.985104 0 0)" }),
  serif: Object.freeze(["ui-serif", "Georgia", "Cambria", "Times New Roman", "Times", "serif"]),
  tracking: "0em",
  radiusXl: "0.75rem",
  shadowTierDefaults: Object.freeze({
    "2xs": Object.freeze([layer("0px", "1px", "0px", "0px", 0.05)]),
    xs: Object.freeze([layer("0px", "1px", "2px", "0px", 0.05)]),
    xl: Object.freeze([layer("0px", "20px", "25px", "-5px", 0.1), layer("0px", "8px", "10px", "-6px", 0.1)]),
    "2xl": Object.freeze([layer("0px", "25px", "50px", "-12px", 0.25)]),
  }),
  emptyShadowLayer: Object.freeze({ inset: false, offsetX: "0px", offsetY: "0px", blur: "0px", spread: "0px", color: "oklch(0 0 0 / 0)" }),
})

type V1Layer = ThemeV1["shadow"]["sm"]["$value"][number]

const migrateLayers = (layers: readonly V1Layer[]) =>
  layers.length === 0 ? [{ ...V1_MIGRATION_DEFAULTS.emptyShadowLayer }] : layers.map((layer) => ({ inset: false, ...layer }))

/** Pure v1 -> v2.0 structural migration. The result is v2.0 *input*: `validateTheme` still parses it with the v2.0 schema. */
export function migrateThemeV1(v1: ThemeV1): unknown {
  // Key order is irrelevant here: the v2 schema parse emits keys in schema order.
  const colors = (mode: "light" | "dark") => ({
    ...v1.modes[mode].color,
    "destructive-foreground": { $type: "color", $value: V1_MIGRATION_DEFAULTS.destructiveForeground[mode] },
  })
  const tier = (layers: readonly object[]) => ({ $type: "shadow", $value: layers.map((l) => ({ ...l })) })
  const defaults = V1_MIGRATION_DEFAULTS.shadowTierDefaults
  const shadow = {
    "2xs": tier(defaults["2xs"]),
    xs: tier(defaults.xs),
    sm: tier(migrateLayers(v1.shadow.sm.$value)),
    default: tier(migrateLayers(v1.shadow.sm.$value)),
    md: tier(migrateLayers(v1.shadow.md.$value)),
    lg: tier(migrateLayers(v1.shadow.lg.$value)),
    xl: tier(defaults.xl),
    "2xl": tier(defaults["2xl"]),
  }
  return {
    $schema: "https://personal-ui.local/schema/theme-2.json",
    schemaVersion: "2.0",
    kind: v1.kind,
    id: v1.id,
    name: v1.name,
    revision: v1.revision,
    colors: { light: colors("light"), dark: colors("dark") },
    typography: {
      sans: v1.typography.sans,
      serif: { $type: "fontFamily", $value: [...V1_MIGRATION_DEFAULTS.serif] },
      mono: v1.typography.mono,
      tracking: { $type: "dimension", $value: V1_MIGRATION_DEFAULTS.tracking },
    },
    radius: {
      base: v1.radius.md,
      sm: v1.radius.sm,
      md: v1.radius.md,
      lg: v1.radius.lg,
      xl: { $type: "dimension", $value: V1_MIGRATION_DEFAULTS.radiusXl },
    },
    space: v1.space,
    shadow,
    motion: v1.motion,
    ...(v1.$extensions ? { $extensions: v1.$extensions } : {}),
  }
}

/** The exact base semantic each v2.1 Sidebar token is generated from (mirrors `SIDEBAR_TOKEN_ALIASES` in `schema.ts`). */
const SIDEBAR_MIGRATION_ALIASES = Object.freeze([
  ["sidebar", "background"],
  ["sidebar-foreground", "foreground"],
  ["sidebar-primary", "primary"],
  ["sidebar-primary-foreground", "primary-foreground"],
  ["sidebar-accent", "accent"],
  ["sidebar-accent-foreground", "accent-foreground"],
  ["sidebar-border", "border"],
  ["sidebar-ring", "ring"],
] as const)

/**
 * Pure v2.0 -> v2.1 migration. Every v2.0 value is carried over unchanged. Both colour modes gain the eight dedicated
 * Sidebar colours, each a copy of its base alias in that mode, and the Sidebar source state starts off and
 * uninitialized, so a migrated theme renders exactly what it rendered before. The result is v2.1 *input*.
 */
export function migrateThemeV2_0(v2: ThemeV2_0): unknown {
  const colors = (mode: "light" | "dark") => ({
    ...v2.colors[mode],
    ...Object.fromEntries(SIDEBAR_MIGRATION_ALIASES.map(([name, alias]) => [name, { $type: "color", $value: v2.colors[mode][alias].$value }])),
  })
  return {
    ...v2,
    schemaVersion: "2.1",
    colors: { light: colors("light"), dark: colors("dark") },
    sidebar: { useDedicatedTokens: { $type: "boolean", $value: false }, dedicatedValuesInitialized: false },
  }
}
