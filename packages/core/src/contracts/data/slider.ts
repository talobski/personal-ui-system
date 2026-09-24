export const slider = {
  id: "slider",
  purpose: "Adjust one bounded numeric value by dragging or with the keyboard, when the relative position within a known range matters more than typing an exact figure.",
  use: [
    "Use Slider for one continuous or finely stepped value with a declared min, max, and step (for example a length, opacity, or offset).",
    "Always show the current value with its unit as visible text next to the Slider; the thumb position alone is not a value.",
    "Pair it with a numeric Input bound to the same value when an exact figure matters; both edit one value, and an invalid Input draft never moves the Slider or the committed value.",
    "Give it an accessible name from a visible FieldLabel through aria-labelledby, and an aria-valuetext that includes the unit.",
  ],
  avoid: [
    "Choosing one of a few discrete named options (use SingleToggleGroup or NativeSelect).",
    "Unbounded or very large ranges where precision matters more than position (use a numeric Input).",
    "Range (two-thumb) selection; only single-thumb Slider is admitted.",
    "Hiding the numeric value or unit, or showing a value that disagrees with the thumb.",
  ],
  variants: ["default", "disabled", "with-numeric-input"],
  responsiveBehavior:
    "Fills its container width at every viewport; the thumb keeps a pointer target of at least 16px and the track stays horizontal. On narrow screens keep the label, value, and optional numeric Input on their own row above the track.",
  accessibility: [
    "Built on the Radix Slider primitive: the thumb has role=slider with aria-valuemin, aria-valuemax, and aria-valuenow; do not add custom keyboard handling.",
    "Arrow keys step by one step, Page Up/Page Down by larger steps, Home/End jump to min/max; pointer drag and track click set the value.",
    "The accessible name and aria-valuetext are forwarded to the thumb, the focusable element, so the name and unit are announced.",
    "Keep the visible focus ring on the thumb; a disabled Slider is removed from the tab order and ignores pointer input.",
  ],
  composition: [
    "Extends the shadcn Slider source over @radix-ui/react-slider@1.4.7; the only adaptation forwards aria-label/labelledby/describedby/valuetext to the thumb.",
    "Compose inside Field: FieldLabel (with an id) + visible value/unit text + Slider + optional numeric Input + FieldDescription/FieldError.",
    "Group related Sliders under a Collapsible or Card section heading; never nest a Slider inside another interactive control.",
  ],
  examples: [
    '<Field><FieldLabel id="radius-label">Radius</FieldLabel><Slider aria-labelledby="radius-label" aria-valuetext="0.5 rem" min={0} max={2.5} step={0.025} value={[0.5]} /><span>0.5 rem</span></Field>',
    '<Field><FieldLabel id="blur-label" htmlFor="blur">Blur</FieldLabel><Slider aria-labelledby="blur-label" aria-valuetext="3 px" min={0} max={64} step={1} value={[3]} /><Input id="blur" inputMode="decimal" value="3" /><span>px</span></Field>',
  ],
  mistakes: [
    "Putting aria-label on a wrapper instead of letting the Slider forward it to the thumb, leaving the focusable slider unnamed.",
    "Committing every intermediate text keystroke of a paired Input even when it is not a valid number in range.",
    "Showing a unitless number next to a Slider that edits a length.",
    "Building a custom track or thumb with pointer/key listeners instead of the Radix primitive.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "slider.accessible-name", rule: "Every Slider thumb must have a non-empty accessible name." },
    { id: "slider.range", rule: "min < max, 0 < step <= max - min, and the value lies within [min, max] on the step grid." },
    { id: "slider.visible-value", rule: "The current value and its unit must be visible as text and exposed as aria-valuetext." },
  ],
}
