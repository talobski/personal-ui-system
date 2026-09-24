export const collapsible = {
  id: "collapsible",
  purpose: "Show or hide one secondary region of related controls or content behind a single named disclosure trigger, keeping a dense panel scannable.",
  use: [
    "Use Collapsible to group related settings under a visible section name (for example Radius, Spacing, Shadow) that a person can expand or collapse.",
    "Name the trigger with the section's visible text; its expanded/collapsed state is exposed by the primitive.",
    "Keep each Collapsible independent: expanding one never collapses another (that is an accordion, which is not admitted).",
    "Open a section automatically, or keep it open, while it contains an active validation error so the error is never hidden.",
  ],
  avoid: [
    "Hiding primary actions, the only way to complete a task, or information needed to understand the current state.",
    "Mutually exclusive sections or accordion behaviour; use Tabs for switching between peer panels.",
    "Nesting Collapsibles more than one level deep.",
    "A trigger that is only an icon without an accessible name.",
  ],
  variants: ["closed", "open", "disabled"],
  responsiveBehavior:
    "Identical at every viewport: the trigger spans the section width and the content flows below it, so a collapsed section costs one row on mobile. Content inside keeps its own responsive rules.",
  accessibility: [
    "Built on the Radix Collapsible primitive: the trigger is a button with aria-expanded and, while open, aria-controls pointing at the content; do not add custom keyboard handling.",
    "Enter and Space toggle the focused trigger; Tab moves into the expanded content in document order and skips collapsed content.",
    "Collapsed content is hidden from the accessibility tree and the tab order.",
    "Keep the trigger's visible focus ring; a disabled Collapsible ignores activation.",
  ],
  composition: [
    "Extends the shadcn Collapsible source over @radix-ui/react-collapsible@1.1.20, preserved as generated.",
    "Render the trigger as a Button (asChild) whose text is the section name, optionally with a decorative aria-hidden chevron.",
    "Place Field rows, Sliders, and Inputs inside CollapsibleContent; keep section headings outside the content so they stay visible.",
  ],
  examples: [
    '<Collapsible defaultOpen><CollapsibleTrigger asChild><Button variant="ghost">Shadow</Button></CollapsibleTrigger><CollapsibleContent><Field>...</Field></CollapsibleContent></Collapsible>',
    '<Collapsible open={open || hasError} onOpenChange={setOpen}><CollapsibleTrigger asChild><Button variant="ghost">Radius</Button></CollapsibleTrigger><CollapsibleContent>...</CollapsibleContent></Collapsible>',
  ],
  mistakes: [
    "Collapsing a section while one of its fields shows a validation error, so the person cannot see why nothing changed.",
    "Using a div with onClick as the trigger instead of the primitive's button.",
    "Animating height without respecting prefers-reduced-motion.",
    "Wrapping the whole editor in one Collapsible, which hides everything behind a single click.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "collapsible.trigger-name", rule: "Every Collapsible trigger must have a non-empty accessible name." },
    { id: "collapsible.controls", rule: "An open Collapsible's trigger must reference its content through aria-controls." },
    { id: "collapsible.hidden-error", rule: "A Collapsible whose content has an active validation error must be open." },
  ],
}
