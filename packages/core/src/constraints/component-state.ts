import { z } from "zod"

const buttonStateSchema = z.strictObject({
  kind: z.literal("button-group"),
  buttons: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(80),
        variant: z.enum(["default", "secondary", "outline", "ghost", "link", "destructive"]),
        iconOnly: z.boolean(),
        accessibleName: z.string().min(1).max(200).nullable(),
      })
    )
    .min(1)
    .max(12),
})

const inputStateSchema = z.strictObject({
  kind: z.literal("input-field"),
  id: z.string().min(1).max(80),
  label: z
    .strictObject({ kind: z.enum(["visible", "programmatic"]), text: z.string().min(1).max(200) })
    .nullable(),
  invalid: z.boolean(),
  error: z.strictObject({ id: z.string().min(1).max(80), message: z.string().min(1).max(400) }).nullable(),
  ariaDescribedBy: z.array(z.string().min(1).max(80)).max(12),
  mobileTextPx: z.number().finite().positive(),
})

const responsiveDialogStateSchema = z.strictObject({
  kind: z.literal("responsive-dialog"),
  viewportWidth: z.number().int().positive(),
  rendered: z.enum(["dialog", "drawer"]),
  hasTitle: z.boolean(),
  hasDescription: z.boolean(),
  focusManagement: z.enum(["primitive", "custom"]),
})

const fieldCompositionStateSchema = z.strictObject({
  kind: z.literal("field-composition"),
  orientation: z.enum(["vertical", "horizontal", "responsive"]),
  label: z
    .strictObject({ kind: z.enum(["visible", "programmatic"]), text: z.string().min(1).max(200), htmlFor: z.string().min(1).max(80) })
    .nullable(),
  descriptionId: z.string().min(1).max(80).nullable(),
  control: z.discriminatedUnion("kind", [
    z.strictObject({
      kind: z.literal("input"),
      id: z.string().min(1).max(80),
      disabled: z.boolean(),
      invalid: z.boolean(),
      error: z.strictObject({ id: z.string().min(1).max(80), message: z.string().min(1).max(400) }).nullable(),
      ariaDescribedBy: z.array(z.string().min(1).max(80)).max(12),
      mobileTextPx: z.number().finite().positive(),
    }),
    z.strictObject({
      kind: z.literal("native-select"),
      id: z.string().min(1).max(80),
      disabled: z.boolean(),
      invalid: z.boolean(),
      error: z.strictObject({ id: z.string().min(1).max(80), message: z.string().min(1).max(400) }).nullable(),
      ariaDescribedBy: z.array(z.string().min(1).max(80)).max(12),
      mobileTextPx: z.number().finite().positive(),
      options: z.array(z.strictObject({ label: z.string().min(1).max(200), value: z.string().max(200) })).min(1).max(50),
      value: z.string().min(1).max(200).nullable(),
    }),
    z.strictObject({
      kind: z.literal("textarea"),
      id: z.string().min(1).max(80),
      disabled: z.boolean(),
      invalid: z.boolean(),
      error: z.strictObject({ id: z.string().min(1).max(80), message: z.string().min(1).max(400) }).nullable(),
      ariaDescribedBy: z.array(z.string().min(1).max(80)).max(12),
      mobileTextPx: z.number().finite().positive(),
    }),
    z.strictObject({
      kind: z.literal("switch"),
      id: z.string().min(1).max(80),
      disabled: z.boolean(),
      checked: z.boolean(),
    }),
  ]),
})

const tabsStateSchema = z.strictObject({
  kind: z.literal("tabs"),
  tabs: z.array(z.strictObject({ id: z.string().min(1).max(80), label: z.string().min(1).max(200), disabled: z.boolean() })).min(1).max(12),
  activeTabId: z.string().min(1).max(80),
})

const switchStateSchema = z.strictObject({
  kind: z.literal("switch"),
  id: z.string().min(1).max(80),
  accessibleName: z.string().min(1).max(200).nullable(),
  checked: z.boolean(),
  disabled: z.boolean(),
})

const singleToggleGroupStateSchema = z.strictObject({
  kind: z.literal("single-toggle-group"),
  label: z.string().min(1).max(200).nullable(),
  options: z.array(z.strictObject({ label: z.string().min(1).max(200), value: z.string().max(200), disabled: z.boolean() })).min(2).max(8),
  value: z.string().max(200).nullable(),
})

const cardStateSchema = z.strictObject({
  kind: z.literal("card"),
  hasTitle: z.boolean(),
  actionCount: z.number().int().nonnegative().max(12),
})

const sliderStateSchema = z.strictObject({
  kind: z.literal("slider"),
  accessibleName: z.string().min(1).max(200).nullable(),
  min: z.number().finite(),
  max: z.number().finite(),
  step: z.number().finite(),
  value: z.number().finite(),
  disabled: z.boolean(),
  valueText: z.string().min(1).max(80).nullable(),
})

const collapsibleStateSchema = z.strictObject({
  kind: z.literal("collapsible"),
  triggerName: z.string().min(1).max(200).nullable(),
  open: z.boolean(),
  disabled: z.boolean(),
  contentId: z.string().min(1).max(80),
  triggerControls: z.string().min(1).max(80).nullable(),
  contentHasError: z.boolean(),
})

const choiceOptionSchema = z.strictObject({ value: z.string().max(200), label: z.string().min(1).max(200), disabled: z.boolean() })

const selectStateSchema = z.strictObject({
  kind: z.literal("select"),
  accessibleName: z.string().min(1).max(200).nullable(),
  groups: z.array(z.strictObject({ label: z.string().max(200).nullable(), options: z.array(choiceOptionSchema).min(1).max(50) })).min(1).max(12),
  value: z.string().max(200).nullable(),
  disabled: z.boolean(),
})

const comboboxStateSchema = z.strictObject({
  kind: z.literal("combobox"),
  accessibleName: z.string().min(1).max(200).nullable(),
  options: z.array(choiceOptionSchema).min(1).max(200),
  value: z.string().max(200).nullable(),
  emptyMessage: z.string().max(200).nullable(),
  disabled: z.boolean(),
})

const chartStateSchema = z.strictObject({
  kind: z.literal("chart"),
  textSummary: z.string().max(1000).nullable(),
  accessibilityLayer: z.boolean(),
  series: z.array(z.strictObject({ key: z.string().min(1).max(80), label: z.string().max(200), color: z.string().min(1).max(80) })).min(1).max(12),
})

const sidebarStateSchema = z.strictObject({
  kind: z.literal("sidebar"),
  providerCount: z.number().int().nonnegative().max(12),
  sidebarCount: z.number().int().nonnegative().max(12),
  insetPresent: z.boolean(),
  triggerName: z.string().max(200).nullable(),
  mobilePresentation: z.enum(["off-canvas-sheet", "inline", "hidden"]),
  menuActions: z.array(z.strictObject({ accessibleName: z.string().max(200).nullable(), insidePrimaryControl: z.boolean() })).max(50),
  colorTokens: z.array(z.string().min(1).max(80)).max(24),
})

const avatarStateSchema = z.strictObject({
  kind: z.literal("avatar"),
  displayName: z.string().min(1).max(200),
  fallbackText: z.string().max(40),
  fallbackBackground: z.string().min(1).max(80),
  fallbackForeground: z.string().min(1).max(80),
  decorative: z.boolean(),
  accessibleName: z.string().max(200).nullable(),
})

/** Semantic theme colour tokens a sidebar may use; sidebar-specific tokens and literal colours are not admitted. */
const SIDEBAR_COLOR_TOKENS = new Set(["background", "foreground", "card", "card-foreground", "accent", "accent-foreground", "border", "ring", "primary", "primary-foreground", "muted", "muted-foreground"])

/** The one-character avatar initial: the first letter or digit, upper-cased when that stays one character. */
export function avatarInitial(name: string): string {
  const first = name.match(/[\p{L}\p{N}]/u)?.[0]
  if (!first) return "?"
  const upper = first.toLocaleUpperCase()
  return [...upper].length === 1 ? upper : first
}

export const componentStateSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("resizable-panel"),
    minPx: z.number().finite().positive(),
    defaultPx: z.number().finite().positive(),
    maxPx: z.number().finite().positive(),
    separatorName: z.string().min(1).max(200).nullable(),
    primitiveSeparator: z.boolean(),
    visibleFocus: z.boolean(),
  }),
  buttonStateSchema,
  inputStateSchema,
  responsiveDialogStateSchema,
  fieldCompositionStateSchema,
  tabsStateSchema,
  switchStateSchema,
  singleToggleGroupStateSchema,
  cardStateSchema,
  sliderStateSchema,
  collapsibleStateSchema,
  selectStateSchema,
  comboboxStateSchema,
  chartStateSchema,
  sidebarStateSchema,
  avatarStateSchema,
])

export type ComponentState = z.infer<typeof componentStateSchema>

export type ComponentConstraintRuleId =
  | "resizable-panel.bounds"
  | "resizable-panel.accessible-separator"
  | "constraint.invalid-state"
  | "button.one-primary"
  | "button.icon-name"
  | "input.label"
  | "input.error-association"
  | "input.mobile-text-size"
  | "field.label"
  | "field.label-association"
  | "field.invalid-error"
  | "field.unsupported-composition"
  | "native-select.option-values"
  | "native-select.error-association"
  | "native-select.mobile-text-size"
  | "textarea.error-association"
  | "textarea.mobile-text-size"
  | "switch.accessible-name"
  | "tabs.unique-ids"
  | "tabs.active-tab"
  | "single-toggle-group.label"
  | "single-toggle-group.option-values"
  | "single-toggle-group.value-required"
  | "card.single-action"
  | "card.titled"
  | "responsive-dialog.breakpoint"
  | "responsive-dialog.no-custom-focus"
  | "responsive-dialog.titled"
  | "slider.accessible-name"
  | "slider.range"
  | "slider.visible-value"
  | "collapsible.trigger-name"
  | "collapsible.controls"
  | "collapsible.hidden-error"
  | "select.accessible-name"
  | "select.option-values"
  | "select.group-label"
  | "combobox.accessible-name"
  | "combobox.option-values"
  | "combobox.empty-state"
  | "combobox.searchable-size"
  | "chart.text-summary"
  | "chart.accessibility-layer"
  | "chart.theme-colors"
  | "chart.series-labels"
  | "sidebar.single-shell"
  | "sidebar.inset-required"
  | "sidebar.trigger-name"
  | "sidebar.mobile-sheet"
  | "sidebar.action-sibling"
  | "sidebar.semantic-tokens"
  | "avatar.single-initial"
  | "avatar.semantic-colors"
  | "avatar.accessible-name"

export type ComponentConstraintIssue = { ruleId: ComponentConstraintRuleId; path: string }

export type ComponentStateValidation =
  | { ok: true; state: ComponentState }
  | { ok: false; issues: ComponentConstraintIssue[] }

const pathOf = (path: readonly PropertyKey[]) =>
  path.reduce<string>((out, part) => (typeof part === "number" ? `${out}[${part}]` : out ? `${out}.${String(part)}` : String(part)), "")

/**
 * Deterministic component admissibility over compact structured state. This is
 * intentionally not a DOM parser: agents and future design commands must
 * submit state through this closed schema before a composition becomes active.
 */
export function validateComponentState(input: unknown): ComponentStateValidation {
  if (
    typeof input === "object" &&
    input !== null &&
    !Array.isArray(input) &&
    (input as Record<string, unknown>).kind === "field-composition" &&
    (!isSupportedFieldControl((input as Record<string, unknown>).control))
  ) {
    return { ok: false, issues: [{ ruleId: "field.unsupported-composition", path: "control.kind" }] }
  }
  const parsed = componentStateSchema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({ ruleId: "constraint.invalid-state", path: pathOf(issue.path) })),
    }
  }

  const issues: ComponentConstraintIssue[] = []
  const state = parsed.data
  if (state.kind === "resizable-panel") {
    if (state.minPx > state.defaultPx || state.defaultPx > state.maxPx) issues.push({ ruleId: "resizable-panel.bounds", path: "defaultPx" })
    if (!state.separatorName?.trim() || !state.primitiveSeparator || !state.visibleFocus) issues.push({ ruleId: "resizable-panel.accessible-separator", path: "separatorName" })
  }
  if (state.kind === "button-group") {
    if (state.buttons.filter((button) => button.variant === "default").length > 1) {
      issues.push({ ruleId: "button.one-primary", path: "buttons" })
    }
    state.buttons.forEach((button, index) => {
      if (button.iconOnly && button.accessibleName === null) {
        issues.push({ ruleId: "button.icon-name", path: `buttons[${index}].accessibleName` })
      }
    })
  }

  if (state.kind === "input-field") {
    if (state.label === null) issues.push({ ruleId: "input.label", path: "label" })
    if (state.invalid && (state.error === null || !state.ariaDescribedBy.includes(state.error.id))) {
      issues.push({ ruleId: "input.error-association", path: "ariaDescribedBy" })
    }
    if (state.mobileTextPx < 16) issues.push({ ruleId: "input.mobile-text-size", path: "mobileTextPx" })
  }

  if (state.kind === "field-composition") {
    const { control, label } = state
    if (label === null) issues.push({ ruleId: "field.label", path: "label" })
    else if (label.htmlFor !== control.id) issues.push({ ruleId: "field.label-association", path: "label.htmlFor" })

    if (control.kind !== "switch") {
      if (control.invalid && (control.error === null || !control.ariaDescribedBy.includes(control.error.id))) {
        issues.push({ ruleId: "field.invalid-error", path: "control.ariaDescribedBy" })
        if (control.kind === "native-select") issues.push({ ruleId: "native-select.error-association", path: "control.ariaDescribedBy" })
        if (control.kind === "textarea") issues.push({ ruleId: "textarea.error-association", path: "control.ariaDescribedBy" })
      }
      if (control.mobileTextPx < 16) {
        const ruleId =
          control.kind === "native-select" ? "native-select.mobile-text-size" : control.kind === "textarea" ? "textarea.mobile-text-size" : "input.mobile-text-size"
        issues.push({ ruleId, path: "control.mobileTextPx" })
      }
    }

    if (control.kind === "native-select") {
      const values = control.options.map((option) => option.value)
      if (values.some((value) => value.length === 0) || new Set(values).size !== values.length || (control.value !== null && !values.includes(control.value))) {
        issues.push({ ruleId: "native-select.option-values", path: "control.options" })
      }
    }
  }

  if (state.kind === "switch") {
    if (state.accessibleName === null) issues.push({ ruleId: "switch.accessible-name", path: "accessibleName" })
  }

  if (state.kind === "tabs") {
    const ids = state.tabs.map((tab) => tab.id)
    if (new Set(ids).size !== ids.length) issues.push({ ruleId: "tabs.unique-ids", path: "tabs" })
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId)
    if (!activeTab || activeTab.disabled) issues.push({ ruleId: "tabs.active-tab", path: "activeTabId" })
  }

  if (state.kind === "single-toggle-group") {
    if (state.label === null) issues.push({ ruleId: "single-toggle-group.label", path: "label" })
    const values = state.options.map((option) => option.value)
    if (values.some((value) => value.length === 0) || new Set(values).size !== values.length) {
      issues.push({ ruleId: "single-toggle-group.option-values", path: "options" })
    }
    if (state.value === null || !values.includes(state.value)) {
      issues.push({ ruleId: "single-toggle-group.value-required", path: "value" })
    }
  }

  if (state.kind === "card") {
    if (!state.hasTitle) issues.push({ ruleId: "card.titled", path: "hasTitle" })
    if (state.actionCount > 1) issues.push({ ruleId: "card.single-action", path: "actionCount" })
  }

  if (state.kind === "slider") {
    if (state.accessibleName === null || !state.accessibleName.trim()) issues.push({ ruleId: "slider.accessible-name", path: "accessibleName" })
    const span = state.max - state.min
    const steps = (state.value - state.min) / state.step
    const onGrid = Math.abs(steps - Math.round(steps)) < 1e-6
    if (span <= 0 || state.step <= 0 || state.step > span) issues.push({ ruleId: "slider.range", path: "step" })
    else if (state.value < state.min || state.value > state.max || !onGrid) issues.push({ ruleId: "slider.range", path: "value" })
    if (state.valueText === null || !state.valueText.trim()) issues.push({ ruleId: "slider.visible-value", path: "valueText" })
  }

  if (state.kind === "collapsible") {
    if (state.triggerName === null || !state.triggerName.trim()) issues.push({ ruleId: "collapsible.trigger-name", path: "triggerName" })
    if (state.open && state.triggerControls !== state.contentId) issues.push({ ruleId: "collapsible.controls", path: "triggerControls" })
    if (state.contentHasError && !state.open) issues.push({ ruleId: "collapsible.hidden-error", path: "open" })
  }

  if (state.kind === "select") {
    if (state.accessibleName === null || !state.accessibleName.trim()) issues.push({ ruleId: "select.accessible-name", path: "accessibleName" })
    const options = state.groups.flatMap((group) => group.options)
    if (!choiceValuesAdmissible(options, state.value, true)) issues.push({ ruleId: "select.option-values", path: "groups" })
    // A lone ungrouped list needs no heading; once options are grouped, every group is named.
    if (state.groups.length > 1 && state.groups.some((group) => group.label === null || !group.label.trim())) issues.push({ ruleId: "select.group-label", path: "groups" })
  }

  if (state.kind === "combobox") {
    if (state.accessibleName === null || !state.accessibleName.trim()) issues.push({ ruleId: "combobox.accessible-name", path: "accessibleName" })
    if (!choiceValuesAdmissible(state.options, state.value, false)) issues.push({ ruleId: "combobox.option-values", path: "options" })
    if (state.emptyMessage === null || !state.emptyMessage.trim()) issues.push({ ruleId: "combobox.empty-state", path: "emptyMessage" })
    if (state.options.length < 5) issues.push({ ruleId: "combobox.searchable-size", path: "options" })
  }

  if (state.kind === "chart") {
    if (state.textSummary === null || !state.textSummary.trim()) issues.push({ ruleId: "chart.text-summary", path: "textSummary" })
    if (!state.accessibilityLayer) issues.push({ ruleId: "chart.accessibility-layer", path: "accessibilityLayer" })
    if (state.series.some((series) => !/^var\(--chart-[1-5]\)$/.test(series.color))) issues.push({ ruleId: "chart.theme-colors", path: "series" })
    const keys = state.series.map((series) => series.key)
    if (state.series.length > 5 || new Set(keys).size !== keys.length || state.series.some((series) => !series.label.trim())) issues.push({ ruleId: "chart.series-labels", path: "series" })
  }

  if (state.kind === "sidebar") {
    if (state.providerCount !== 1 || state.sidebarCount !== 1) issues.push({ ruleId: "sidebar.single-shell", path: state.providerCount !== 1 ? "providerCount" : "sidebarCount" })
    if (!state.insetPresent) issues.push({ ruleId: "sidebar.inset-required", path: "insetPresent" })
    if (state.triggerName === null || !state.triggerName.trim()) issues.push({ ruleId: "sidebar.trigger-name", path: "triggerName" })
    if (state.mobilePresentation !== "off-canvas-sheet") issues.push({ ruleId: "sidebar.mobile-sheet", path: "mobilePresentation" })
    if (state.menuActions.some((action) => action.insidePrimaryControl || action.accessibleName === null || !action.accessibleName.trim())) issues.push({ ruleId: "sidebar.action-sibling", path: "menuActions" })
    if (state.colorTokens.some((token) => !SIDEBAR_COLOR_TOKENS.has(token))) issues.push({ ruleId: "sidebar.semantic-tokens", path: "colorTokens" })
  }

  if (state.kind === "avatar") {
    if ([...state.fallbackText].length !== 1 || state.fallbackText !== avatarInitial(state.displayName)) issues.push({ ruleId: "avatar.single-initial", path: "fallbackText" })
    if (state.fallbackBackground !== "muted" || state.fallbackForeground !== "muted-foreground") issues.push({ ruleId: "avatar.semantic-colors", path: state.fallbackBackground !== "muted" ? "fallbackBackground" : "fallbackForeground" })
    if (!state.decorative && (state.accessibleName === null || !state.accessibleName.trim())) issues.push({ ruleId: "avatar.accessible-name", path: "accessibleName" })
  }

  if (state.kind === "responsive-dialog") {
    const expected = state.viewportWidth <= 640 ? "drawer" : "dialog"
    if (state.rendered !== expected) issues.push({ ruleId: "responsive-dialog.breakpoint", path: "rendered" })
    if (state.focusManagement !== "primitive") {
      issues.push({ ruleId: "responsive-dialog.no-custom-focus", path: "focusManagement" })
    }
    if (!state.hasTitle) issues.push({ ruleId: "responsive-dialog.titled", path: "hasTitle" })
    if (!state.hasDescription) issues.push({ ruleId: "responsive-dialog.titled", path: "hasDescription" })
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, state }
}

const isSupportedFieldControl = (control: unknown): boolean =>
  typeof control === "object" &&
  control !== null &&
  !Array.isArray(control) &&
  ["input", "native-select", "textarea", "switch"].includes((control as Record<string, unknown>).kind as string)

/** Unique non-empty option values; a selected value (required when `valueRequired`) must be an enabled option. */
function choiceValuesAdmissible(options: readonly { value: string; disabled: boolean }[], value: string | null, valueRequired: boolean): boolean {
  const values = options.map((option) => option.value)
  if (values.some((entry) => entry.length === 0) || new Set(values).size !== values.length) return false
  if (value === null) return !valueRequired
  return options.some((option) => option.value === value && !option.disabled)
}
