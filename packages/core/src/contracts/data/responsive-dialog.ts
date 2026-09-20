export const responsiveDialog = {
  id: "responsive-dialog",
  purpose: "Present focused, blocking content as a centered Dialog on wide viewports and a bottom Drawer on narrow ones.",
  use: [
    "Short confirmations, focused forms, and details that must be resolved before continuing.",
    "One public entry point (ResponsiveDialog*) instead of choosing Dialog or Drawer per call site.",
    "Always provide a Title and a Description.",
  ],
  avoid: [
    "Long multi-step flows or full pages (use a route).",
    "Importing Dialog and Drawer directly to build a bespoke responsive switch.",
    "Non-dismissible modals without a clear completion action.",
  ],
  variants: ["dialog (viewport > 640px)", "drawer (viewport <= 640px)"],
  responsiveBehavior:
    "Hard switch at 640px: viewport widths up to and including 640px render the Drawer; widths above render the Dialog. No intermediate layout.",
  accessibility: [
    "Focus is trapped while open and restored to the trigger on close (delegated to Radix/Vaul).",
    "Escape and overlay press dismiss; do not override dismissal.",
    "Title and Description supply the accessible name and description.",
    "Content outside the modal is inert to assistive technology while open.",
  ],
  composition: [
    "Built on the shadcn Dialog and Drawer primitives; adds only the breakpoint selection.",
    "Compose ResponsiveDialogHeader/Title/Description/Footer inside ResponsiveDialogContent.",
    "Put actions in the Footer; primary action first in reading order on mobile.",
  ],
  examples: [
    "<ResponsiveDialog><ResponsiveDialogTrigger asChild><Button>Open</Button></ResponsiveDialogTrigger><ResponsiveDialogContent>...</ResponsiveDialogContent></ResponsiveDialog>",
  ],
  mistakes: [
    "Implementing focus trapping or Escape handling locally.",
    "Placing tall scrolling content in the Drawer without a max height.",
    "Assuming Dialog-only layout (e.g. close button position) inside the Drawer.",
  ],
  mobileReplacement: "Drawer (bottom sheet) at viewport width <= 640px.",
  constraints: [
    { id: "responsive-dialog.breakpoint", rule: "The Drawer replaces the Dialog at viewport width <= 640px." },
    { id: "responsive-dialog.no-custom-focus", rule: "Focus trapping and dismissal must come from the shadcn primitives." },
    { id: "responsive-dialog.titled", rule: "Content must include a Title and a Description." },
  ],
}
