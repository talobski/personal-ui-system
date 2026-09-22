export const singleToggleGroup = {
  id: "single-toggle-group",
  purpose: "Choose exactly one option from a small, bounded, always-visible set.",
  use: [
    "Use SingleToggleGroup for two to eight mutually exclusive, always-visible options where a NativeSelect would hide the choices unnecessarily.",
    "Give the group an accessible label describing what is being chosen.",
    "Always keep exactly one option selected; do not allow deselecting the active option.",
  ],
  avoid: [
    "More than about eight options (use NativeSelect instead).",
    "Multi-select behavior; use a different pattern when more than one value can be active.",
    "Duplicate or empty option values.",
  ],
  variants: ["default"],
  responsiveBehavior:
    "Sizes to its content (`w-fit`) and does not reflow into a stacked layout; options remain in one row at every viewport width covered by this system.",
  accessibility: [
    "Built on the shadcn ToggleGroup (Radix ToggleGroup, type=\"single\") primitive; adds no bespoke keyboard state machine.",
    "Exposes an accessible group name via aria-label; each option is a native toggle button in the roving tab-index sequence.",
    "Arrow keys move focus between options; Enter/Space activates the focused option; do not override this.",
    "Keep the visible focus-visible ring on the focused option.",
  ],
  composition: [
    "Extends the shadcn ToggleGroup/ToggleGroupItem sources; SingleToggleGroup is the single admitted public entry point for a bounded exclusive choice.",
    "Pass a stable, unique value and label for each option.",
    "Use it directly in a Card or form region for a bounded choice that should stay always visible, rather than composing it inside Field.",
  ],
  examples: [
    '<SingleToggleGroup label="Plan" value={plan} onValueChange={setPlan} options={[{ value: "monthly", label: "Monthly" }, { value: "yearly", label: "Yearly" }]} />',
  ],
  mistakes: [
    "Omitting the label prop, leaving the group unnamed for assistive technology.",
    "Passing duplicate or empty values across options.",
    "Allowing the value to become null after the initial selection.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "single-toggle-group.label", rule: "A SingleToggleGroup must have a non-empty accessible label." },
    { id: "single-toggle-group.option-values", rule: "Every SingleToggleGroup option needs a unique, non-empty value." },
    { id: "single-toggle-group.value-required", rule: "A SingleToggleGroup must always have exactly one selected value from its options." },
  ],
}
