import type { Theme, ThemeOperation } from "@personal-ui/core"

export type SettingId = "radius" | "density" | "font" | "shadow" | "motion"

/** One editable representative target per non-color category, mirroring core's fixed-target operations. */
export type Setting = {
  label: string
  hint: string
  read: (theme: Theme) => string
  build: (raw: string) => ThemeOperation
}

// Density is the only numeric value. Non-numeric text is passed through as a string so core rejects it.
const toNumber = (raw: string) => (raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : raw)

export const SETTINGS: Record<SettingId, Setting> = {
  radius: {
    label: "Radius (md)",
    hint: "Expected a non-negative length such as 0.5rem.",
    read: (theme) => theme.radius.md.$value,
    build: (value) => ({ op: "setRadius", value }),
  },
  density: {
    label: "Spacing density",
    hint: "Expected a number from 0.5 to 2.",
    read: (theme) => String(theme.space.density.$value),
    build: (raw) => ({ op: "setDensity", value: toNumber(raw) as number }),
  },
  font: {
    label: "Sans font family",
    hint: "Expected one font name: letters, digits, spaces, hyphens.",
    read: (theme) => theme.typography.sans.$value[0] ?? "",
    build: (value) => ({ op: "setSansFamily", value }),
  },
  shadow: {
    label: "Shadow blur (md)",
    hint: "Expected a non-negative length such as 8px.",
    read: (theme) => theme.shadow.md.$value[0]?.blur ?? "",
    build: (value) => ({ op: "setShadowBlur", value }),
  },
  motion: {
    label: "Base motion duration",
    hint: "Expected a duration such as 200ms or 0.2s.",
    read: (theme) => theme.motion.durationBase.$value,
    build: (value) => ({ op: "setMotionDuration", value }),
  },
}

export const SETTING_IDS = Object.keys(SETTINGS) as SettingId[]
