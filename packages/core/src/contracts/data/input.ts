export const input = {
  id: "input",
  purpose: "Capture a single line of user-entered text or a native input type.",
  use: [
    "Pair every Input with a visible label; associate with htmlFor/id.",
    "Set the native type and autocomplete for the data being collected.",
    "Show validation state with aria-invalid and an adjacent, associated message.",
  ],
  avoid: [
    "Placeholder text as the only label.",
    "Using Input for multi-line content (use a textarea).",
    "Clearing the field on validation error.",
  ],
  variants: ["default", "invalid (aria-invalid)", "disabled", "file"],
  responsiveBehavior:
    "Full width of its container; 16px text below the md breakpoint to prevent mobile zoom-on-focus, 14px from md.",
  accessibility: [
    "Native input semantics; label association is required.",
    "Invalid state exposed via aria-invalid and described by aria-describedby.",
    "Focus ring uses the ring token and must remain visible.",
    "Disabled inputs are not focusable; do not rely on them to convey required information.",
  ],
  composition: [
    "Extends the shadcn Input source; do not reimplement it.",
    "Group label, input, and message in a single field wrapper.",
  ],
  examples: ['<label htmlFor="email">Email</label><Input id="email" type="email" autoComplete="email" />'],
  mistakes: [
    "Omitting the label because a placeholder is present.",
    "Using type=text for email, phone, or numeric data.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "input.label", rule: "Every Input must have an associated visible or programmatic label." },
    { id: "input.error-association", rule: "An invalid Input must reference its error message with aria-describedby." },
    { id: "input.mobile-text-size", rule: "Input text is at least 16px below the md breakpoint." },
  ],
}
