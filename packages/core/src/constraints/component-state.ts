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

export const componentStateSchema = z.discriminatedUnion("kind", [
  buttonStateSchema,
  inputStateSchema,
  responsiveDialogStateSchema,
  fieldCompositionStateSchema,
  tabsStateSchema,
  switchStateSchema,
  singleToggleGroupStateSchema,
  cardStateSchema,
])

export type ComponentState = z.infer<typeof componentStateSchema>

export type ComponentConstraintRuleId =
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
