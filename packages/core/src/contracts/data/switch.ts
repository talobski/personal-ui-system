export const switchContract = {
  id: "switch",
  purpose: "Toggle a single boolean setting on or off immediately, with no separate save step.",
  use: [
    "Use Switch for one setting that applies as soon as it is toggled.",
    "Pair every Switch with a visible label; compose it in Field (horizontal orientation) for a labelled settings row.",
    "Use the checked/unchecked state to reflect the current persisted value, not a pending draft.",
  ],
  avoid: [
    "Switch for an action that requires an explicit Save/Submit to take effect (use Checkbox-free form state or a Button instead).",
    "A Switch with no label, relying only on surrounding text for its accessible name.",
    "Using Switch to select one of more than two states.",
  ],
  variants: ["default", "checked", "disabled"],
  responsiveBehavior:
    "Fixed intrinsic size at every viewport; it does not resize or reflow. Always pair it with a label that can wrap in narrow containers.",
  accessibility: [
    "Built on the Radix Switch primitive with role=switch and aria-checked; do not add custom keyboard handling.",
    "Space toggles a focused Switch; Tab moves focus to and from it in document order.",
    "Requires an accessible name from a visible FieldLabel/FieldTitle, wrapping label, or aria-label — never from surrounding prose alone.",
    "Keep the visible focus-visible ring; disabled switches are natively excluded from the tab order.",
  ],
  composition: [
    "Extends the shadcn Switch source (Radix Switch primitive); adds no bespoke state machine.",
    "Compose one Switch per Field row; use FieldTitle/FieldLabel plus optional FieldDescription for the setting name and explanation.",
    "Group related Switch rows in a FieldGroup or Card for a settings panel.",
  ],
  examples: [
    '<Field orientation="horizontal"><FieldContent><FieldTitle>Email notifications</FieldTitle><FieldDescription>Get an email for account activity.</FieldDescription></FieldContent><Switch id="email-notifications" aria-labelledby="email-notifications-label" /></Field>',
  ],
  mistakes: [
    "Omitting a label and relying on nearby paragraph text for meaning.",
    "Using Switch where a two-way immediate toggle is not actually correct (e.g. a value that needs explicit confirmation).",
    "Building a custom track/thumb instead of the shadcn Switch primitive.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "switch.accessible-name", rule: "Every Switch must have a non-empty accessible name." },
    { id: "field.unsupported-composition", rule: "Switch participates in Field only as the single admitted control alongside Input, NativeSelect, and Textarea." },
  ],
}
