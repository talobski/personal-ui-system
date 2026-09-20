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

export const componentStateSchema = z.discriminatedUnion("kind", [
  buttonStateSchema,
  inputStateSchema,
  responsiveDialogStateSchema,
])

export type ComponentState = z.infer<typeof componentStateSchema>

export type ComponentConstraintRuleId =
  | "constraint.invalid-state"
  | "button.one-primary"
  | "button.icon-name"
  | "input.label"
  | "input.error-association"
  | "input.mobile-text-size"
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
