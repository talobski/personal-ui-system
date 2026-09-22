export const field = {
  id: "field",
  purpose: "Compose a label, control, description, and validation message as one accessible form field.",
  use: [
    "Use Field with FieldLabel and FieldContent around one Input or NativeSelect.",
    "Use vertical, horizontal, or container-responsive orientation for a labelled field.",
    "Keep the label, optional description, control, and error in the same Field so their relationships remain clear.",
  ],
  avoid: [
    "Using Field as a generic layout wrapper for unrelated controls.",
    "Separating an invalid control from its associated error message.",
    "Composing custom selects, listboxes, or multiple controls as one Field.",
  ],
  variants: ["vertical", "horizontal", "responsive (vertical until the FieldGroup container reaches md)", "invalid", "disabled"],
  responsiveBehavior:
    "Vertical is the safe default. Responsive orientation stacks in a narrow FieldGroup and becomes horizontal at its md container query; controls remain usable at full available width.",
  accessibility: [
    "FieldLabel must associate with the Input or NativeSelect id using htmlFor.",
    "Use FieldDescription and FieldError as referenced descriptions; an invalid control must reference its error id with aria-describedby.",
    "Keep the native control's visible focus ring; Field adds grouping and layout, not keyboard behavior.",
    "Disabled state belongs on the native control and is reflected by Field styling without replacing native semantics.",
  ],
  composition: [
    "Compose exactly one supported Input or NativeSelect control in a Field state.",
    "Use FieldContent for the control, description, and FieldError; pair FieldLabel htmlFor with the control id.",
    "Field is shadcn-derived and composes the existing Label and Separator foundations; do not reimplement form semantics.",
  ],
  examples: [
    '<Field><FieldLabel htmlFor="country">Country</FieldLabel><FieldContent><NativeSelect id="country">...</NativeSelect><FieldError id="country-error">Choose a country.</FieldError></FieldContent></Field>',
  ],
  mistakes: [
    "Using a FieldLabel whose htmlFor does not match the control id.",
    "Marking a control invalid without rendering and associating its error.",
    "Using responsive orientation to hide labels or descriptions on mobile.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "field.label", rule: "A Field composition must include a visible or programmatic label." },
    { id: "field.label-association", rule: "The Field label htmlFor value must equal the composed control id." },
    { id: "field.invalid-error", rule: "An invalid Field control must have an associated error message." },
    { id: "field.unsupported-composition", rule: "A Field may compose only one admitted Input or NativeSelect control." },
  ],
}
