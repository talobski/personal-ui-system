export const textarea = {
  id: "textarea",
  purpose: "Capture multiple lines of free-form user-entered text.",
  use: [
    "Use Textarea for messages, notes, or descriptions longer than one line.",
    "Pair every Textarea with a visible label; compose it in Field with FieldLabel, optional FieldDescription, and an associated FieldError.",
    "Let it grow with content rather than forcing an internal scrollbar for short entries.",
  ],
  avoid: [
    "Textarea for a single short value that belongs in Input.",
    "Placeholder text as the only label.",
    "Clearing entered content on a validation error.",
  ],
  variants: ["default", "invalid (aria-invalid)", "disabled"],
  responsiveBehavior:
    "Full width of its Field. Below the md breakpoint, text is at least 16px to avoid mobile zoom-on-focus; from md it may use the shadcn default 14px.",
  accessibility: [
    "Native textarea semantics; label association via FieldLabel htmlFor/id is required.",
    "Invalid state exposed via aria-invalid and described by aria-describedby referencing the FieldError id.",
    "Keep the visible focus-visible ring; do not add custom keyboard handling.",
    "Disabled textareas are not focusable and must not be the only way to convey required information.",
  ],
  composition: [
    "Extends the shadcn Textarea source; do not reimplement resizing or focus behavior.",
    "Compose one Textarea in Field with FieldLabel and FieldContent, matching the Input and NativeSelect pattern.",
  ],
  examples: [
    '<Field><FieldLabel htmlFor="message">Message</FieldLabel><FieldContent><Textarea id="message" aria-describedby="message-error" /><FieldError id="message-error">Enter a message.</FieldError></FieldContent></Field>',
  ],
  mistakes: [
    "Using Textarea for a one-line value that Input already handles.",
    "Showing an invalid Textarea without associating its error through aria-describedby.",
    "Setting mobile text below 16px, causing iOS to zoom on focus.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "textarea.error-association", rule: "An invalid Textarea must reference its error message with aria-describedby." },
    { id: "textarea.mobile-text-size", rule: "Textarea text is at least 16px below the md breakpoint." },
    { id: "field.unsupported-composition", rule: "Textarea participates in Field only as the single admitted control alongside Input, NativeSelect, and Switch." },
  ],
}
