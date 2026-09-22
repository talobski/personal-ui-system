export const tabs = {
  id: "tabs",
  purpose: "Switch the visible content of one region between a small set of related panels.",
  use: [
    "Use Tabs to let a user switch between two to five related views of the same object without navigating away.",
    "Give every TabsTrigger a short (roughly one word) visible label and a stable, unique value.",
    "Set one non-disabled TabsTrigger as the initially active tab.",
    "Keep the tab count and label lengths short enough that TabsList's single row fits the narrowest supported viewport without horizontal overflow.",
  ],
  avoid: [
    "Using Tabs for a linear multi-step process (use a wizard or separate route instead).",
    "Hiding required or unrelated content behind a tab a user must discover.",
    "More than about five top-level tabs, or any long-label tabs, in one TabsList intended for narrow viewports.",
  ],
  variants: ["default"],
  responsiveBehavior:
    "TabsList is a single, non-wrapping row (shadcn default: inline-flex, no flex-wrap) sized to its content; it does not reflow to multiple rows and does not collapse into a select or menu at narrow viewports. This is only safe at narrow viewports for a small tab count with short labels that the row's intrinsic width stays within the viewport; TabsList itself does not scroll or clip overflow.",
  accessibility: [
    "Built on Radix Tabs: TabsList exposes role=tablist, TabsTrigger role=tab, and TabsContent role=tabpanel with the correct aria-selected/aria-controls wiring.",
    "Arrow-key navigation moves focus between tabs; Home/End move to the first/last enabled tab; do not add a custom keyboard handler.",
    "Disabled tabs are skipped by keyboard navigation and cannot become active.",
    "Keep the visible focus-visible ring on the active TabsTrigger.",
  ],
  composition: [
    "Extends the shadcn Tabs source (Radix Tabs primitive); do not reimplement tab/list/panel semantics.",
    "Compose exactly one TabsList of TabsTrigger elements per Tabs, and one TabsContent per TabsTrigger sharing the same value.",
    "Panel content commonly includes Card, Field, or SingleToggleGroup; keep unrelated global actions outside the Tabs.",
  ],
  examples: [
    '<Tabs defaultValue="profile"><TabsList><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="billing">Billing</TabsTrigger></TabsList><TabsContent value="profile">...</TabsContent><TabsContent value="billing">...</TabsContent></Tabs>',
  ],
  mistakes: [
    "Reusing the same value for two TabsTrigger elements.",
    "Setting the active tab to a value with no matching TabsContent.",
    "Making the initially active tab a disabled one.",
    "Using enough tabs or long enough labels that the non-wrapping TabsList row overflows the narrowest supported viewport.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "tabs.unique-ids", rule: "Every tab in a Tabs composition must have a unique id." },
    { id: "tabs.active-tab", rule: "The active tab id must reference an existing, non-disabled tab." },
  ],
}
