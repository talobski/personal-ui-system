export const button = {
  id: "button",
  purpose: "Trigger a single, clearly named action or navigation.",
  use: [
    "One default-variant button per view region for the primary action.",
    "Secondary, outline, or ghost for lower-priority actions beside a primary.",
    "Destructive only for irreversible or data-losing actions, paired with confirmation.",
    "Icon sizes only with an accessible name.",
  ],
  avoid: [
    "Two default-variant buttons competing in the same region.",
    "Using a button for navigation that should be a link (use asChild with an anchor).",
    "Vague labels such as 'OK' or 'Submit' when the action can be named.",
  ],
  variants: ["default", "secondary", "outline", "ghost", "link", "destructive"],
  responsiveBehavior:
    "Height is fixed per size; label never wraps (whitespace-nowrap). Stack buttons vertically in narrow containers rather than shrinking them.",
  accessibility: [
    "Native button element: keyboard activation with Enter and Space.",
    "Visible focus ring via focus-visible.",
    "Icon-only buttons need aria-label or visually hidden text.",
    "Disabled buttons are removed from pointer interaction; explain why nearby when non-obvious.",
  ],
  composition: [
    "Extends the shadcn Button source; do not reimplement it.",
    "Use asChild to render a link with button styling.",
    "Place in DialogFooter/DrawerFooter for modal actions.",
  ],
  examples: ["<Button>Save changes</Button>", '<Button variant="outline">Cancel</Button>'],
  mistakes: [
    "Overriding colors with raw values instead of semantic tokens.",
    "Nesting an interactive element inside a button.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "button.one-primary", rule: "At most one default-variant Button per action group." },
    { id: "button.icon-name", rule: "Icon-only Buttons must expose an accessible name." },
  ],
}
