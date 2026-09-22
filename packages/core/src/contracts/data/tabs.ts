export const tabs = {
  id: "tabs",
  purpose: "Switch the visible content of one region between a small set of related panels.",
  use: [
    "Use Tabs to let a user switch between two to twelve related views of the same object without navigating away.",
    "Give every TabsTrigger a stable, unique value and a short visible label.",
    "Set one non-disabled TabsTrigger as the initially active tab.",
  ],
  avoid: [
    "Using Tabs for a linear multi-step process (use a wizard or separate route instead).",
    "Hiding required or unrelated content behind a tab a user must discover.",
    "More than about six top-level tabs in one TabsList.",
  ],
  variants: ["default"],
  responsiveBehavior:
    "TabsList sizes to its content and wraps within its container's width; it does not collapse into a select or menu at narrow viewports.",
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
  ],
  mobileReplacement: null,
  constraints: [
    { id: "tabs.unique-ids", rule: "Every tab in a Tabs composition must have a unique id." },
    { id: "tabs.active-tab", rule: "The active tab id must reference an existing, non-disabled tab." },
  ],
}
