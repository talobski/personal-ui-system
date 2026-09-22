export const switchContract = {
  id: "switch",
  purpose: "Toggle a single boolean setting on or off. The visible on/off state always updates immediately; whether that change is persisted immediately or held for an explicit Save is one commit model declared for the whole surface.",
  use: [
    "Use Switch for one boolean setting per row; its own checked/unchecked state always flips immediately on interaction.",
    "Pair every Switch with a visible label; compose it in Field (horizontal orientation) for a labelled settings row.",
    "Pick one commit model per surface and keep it consistent: either every Switch row persists as soon as it is toggled (no surrounding Save), or every row in that Card/section is held as pending until an explicit Save Button submits the whole group.",
  ],
  avoid: [
    "Mixing commit models within one surface — some Switch rows persisting instantly while sibling rows in the same Card wait for Save.",
    "A Save Button that silently no-ops for some already-auto-persisted rows and actually commits others.",
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
    '<Field orientation="horizontal"><FieldContent><FieldTitle id="email-notifications-label">Email notifications</FieldTitle><FieldDescription>Get an email for account activity.</FieldDescription></FieldContent><Switch id="email-notifications" aria-labelledby="email-notifications-label" /></Field>',
    '<Card><CardHeader><CardTitle>Notification preferences</CardTitle></CardHeader><CardContent><Field orientation="horizontal"><FieldContent><FieldTitle id="push-label">Push notifications</FieldTitle></FieldContent><Switch id="push" aria-labelledby="push-label" /></Field></CardContent><CardFooter><Button>Save preferences</Button></CardFooter></Card>',
  ],
  mistakes: [
    "Omitting a label and relying on nearby paragraph text for meaning.",
    "Declaring a FieldTitle/FieldLabel id in aria-labelledby that the markup never actually assigns.",
    "Toggling a Switch immediately but leaving a surface-level Save Button whose meaning is ambiguous (does it commit already-applied changes, or is it a no-op).",
    "Building a custom track/thumb instead of the shadcn Switch primitive.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "switch.accessible-name", rule: "Every Switch must have a non-empty accessible name." },
    { id: "field.unsupported-composition", rule: "Switch participates in Field only as the single admitted control alongside Input, NativeSelect, and Textarea." },
  ],
}
