export const bubble = {
  id: "bubble",
  purpose: "Present one message body as a bounded-width conversational surface with semantic colour variants.",
  use: [
    "Use Bubble inside MessageContent for the visible body of a conversational message.",
    "Choose the variant from semantic tokens: default (primary) for the local user, muted, secondary or outline for others.",
    "Stack consecutive bubbles from one sender in BubbleGroup; use BubbleContent asChild for other text elements.",
  ],
  avoid: [
    "Using Bubble as a general card, callout or notification surface.",
    "Literal or per-person colours outside the variants.",
    "Unbounded bubbles that span the whole thread width.",
    "Placing interactive controls that change bubble size in showcase contexts.",
  ],
  variants: ["default", "secondary", "muted", "outline"],
  responsiveBehavior: "Bubble takes its content width up to min(100%, 32rem) and wraps long words, so it never overflows a narrow container.",
  accessibility: [
    "Bubble text keeps its variant foreground token, which the theme pairs for legible contrast in light and dark modes.",
    "Colour and alignment are never the only indication of the sender; pair with a name.",
    "BubbleContent renders a paragraph by default so each body is announced as text.",
  ],
  composition: [
    "Official shadcn new-york-v4 Bubble: BubbleGroup, Bubble and BubbleContent with cva variants and radix-ui Slot for asChild content.",
    "Adaptation: optional reaction parts are omitted because no admitted consumer needs them; reconstructed offline from the Lead's source audit.",
    "Compose Message > MessageContent > Bubble > BubbleContent, or BubbleGroup for consecutive bubbles.",
  ],
  examples: [
    '<Bubble variant="muted"><BubbleContent>Draft is ready for review.</BubbleContent></Bubble>',
  ],
  mistakes: [
    "Using bg-blue-500 style literals instead of a variant.",
    "Pairing primary background with foreground text instead of primary-foreground.",
    "Removing the width bound so bubbles read as full-width blocks.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "bubble.semantic-variant", rule: "The bubble variant is one of default, secondary, muted or outline." },
    { id: "bubble.bounded-width", rule: "The bubble is width-bounded and wraps long content." },
    { id: "bubble.content-required", rule: "The bubble has non-empty content." },
  ],
}
