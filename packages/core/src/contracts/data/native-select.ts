export const nativeSelect = {
  id: "native-select",
  purpose: "Choose one value from a small, fixed set with the platform native select control.",
  use: [
    "Use NativeSelect for one required or optional choice with plain text options and stable values.",
    "Compose it in Field with a FieldLabel, optional description, and associated validation error.",
    "Use the default size on mobile; the control text is at least 16px below md and may use the small desktop size at md and above.",
  ],
  avoid: [
    "Search, autocomplete, async loading, multiple selection, or rich option rendering.",
    "A custom combobox or listbox when a native select supplies the needed behavior.",
    "Duplicate, blank, or presentation-only option values.",
  ],
  variants: ["default", "sm (desktop only)", "invalid (aria-invalid)", "disabled"],
  responsiveBehavior:
    "Use full available width in its Field. Below md, text is at least 16px to avoid mobile zoom-on-focus; at md and above the shadcn default or sm size is accepted.",
  accessibility: [
    "Use native single-choice select semantics and native keyboard selection; do not add custom select keyboard or focus logic.",
    "Associate a FieldLabel with id/htmlFor and reference description and error ids with aria-describedby.",
    "Expose invalid state with aria-invalid and keep the visible focus-visible ring.",
    "Disabled selects are natively unavailable and should not be the only way to convey required information.",
  ],
  composition: [
    "Extends the shadcn NativeSelect source; it wraps a native select and decorative icon only.",
    "Compose one NativeSelect in Field with FieldLabel and FieldContent.",
    "Use NativeSelectOption with a unique non-empty value for each choice.",
  ],
  examples: [
    '<Field><FieldLabel htmlFor="country">Country</FieldLabel><FieldContent><NativeSelect id="country" aria-describedby="country-error"><NativeSelectOption value="ph">Philippines</NativeSelectOption></NativeSelect><FieldError id="country-error">Choose a country.</FieldError></FieldContent></Field>',
  ],
  mistakes: [
    "Replacing the native select with a custom listbox for a simple fixed choice.",
    "Using labels as values or repeating an option value.",
    "Showing an error without connecting it through aria-describedby.",
  ],
  mobileReplacement: "Native platform select remains the mobile control; do not replace it with a custom picker.",
  constraints: [
    { id: "native-select.option-values", rule: "Each NativeSelect option needs a unique, non-empty value." },
    { id: "native-select.error-association", rule: "An invalid NativeSelect must reference its error message with aria-describedby." },
    { id: "native-select.mobile-text-size", rule: "NativeSelect text is at least 16px below the md breakpoint." },
    { id: "field.unsupported-composition", rule: "NativeSelect participates only as the single admitted control in Field." },
  ],
}
