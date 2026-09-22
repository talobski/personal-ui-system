export const card = {
  id: "card",
  purpose: "Group related panel content — a title, description, body, and actions — inside one bordered surface.",
  use: [
    "Use Card to contain one coherent unit of settings, summary, or form content on a page.",
    "Compose CardHeader with CardTitle and optional CardDescription and CardAction above CardContent.",
    "Use CardFooter for the panel's primary and secondary actions.",
  ],
  avoid: [
    "Nesting Card inside Card for the same content region.",
    "Using Card as the page's only layout primitive for unrelated content.",
    "Placing interactive controls in CardHeader other than a single CardAction.",
  ],
  variants: ["default"],
  responsiveBehavior:
    "Card is a block container with no fixed width; it fills its parent and reflows content at any viewport. CardHeader becomes a two-column grid only when a CardAction is present.",
  accessibility: [
    "Card itself carries no interactive or landmark semantics; label the region with a heading (CardTitle) rather than an ARIA role.",
    "Do not add a generic ARIA role to Card; the containing page structure supplies landmarks.",
    "Keep focus order following the DOM order of header, content, and footer.",
  ],
  composition: [
    "Extends the shadcn Card source unchanged; composes CardHeader, CardTitle, CardDescription, CardAction, CardContent, and CardFooter only.",
    "Compose one or more Field, Input, NativeSelect, Textarea, Switch, or Tabs inside CardContent for settings and form panels.",
    "Do not reimplement border, radius, or shadow with raw CSS; the panel surface comes from the theme's card tokens.",
  ],
  examples: [
    '<Card><CardHeader><CardTitle>Profile</CardTitle><CardDescription>Update your public profile.</CardDescription></CardHeader><CardContent>...</CardContent><CardFooter><Button>Save</Button></CardFooter></Card>',
  ],
  mistakes: [
    "Using CardTitle for body copy instead of a heading for the panel.",
    "Putting more than one CardAction in a CardHeader.",
    "Styling Card's border, radius, or shadow with inline or arbitrary CSS instead of the theme tokens it already consumes.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "card.single-action", rule: "A CardHeader admits at most one CardAction." },
    { id: "card.titled", rule: "A Card intended as a labelled panel must include a CardTitle." },
  ],
}
