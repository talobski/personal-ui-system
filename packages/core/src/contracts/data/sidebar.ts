export const sidebar = {
  id: "sidebar",
  purpose: "Frame one application as a full-height shell: a collapsible side region for navigation and controls beside a main inset.",
  use: [
    "Use Sidebar for the one persistent application shell whose side region holds navigation or editor controls for the main inset.",
    "Compose exactly one SidebarProvider around one Sidebar (SidebarHeader, SidebarContent, optional SidebarFooter) and one SidebarInset.",
    "Put the SidebarTrigger inside the inset so the side region can always be reopened, including on mobile.",
    "Put a per-row secondary action in SidebarMenuAction as a sibling of the row's primary control, never inside it.",
  ],
  avoid: [
    "Nesting a second Sidebar or SidebarProvider, or keeping a separate header or resizable split beside the shell.",
    "Hard-coded colours or non-canonical sidebar tokens such as sidebar-input or sidebar-card; the shell uses the canonical sidebar-* semantic tokens, and inputs keep the ordinary input token.",
    "Persisting sidebar open state in theme data, cookies, or storage.",
    "Building a custom mobile drawer or custom focus trap instead of the off-canvas sheet.",
  ],
  variants: ["sidebar", "floating", "inset", "offcanvas collapse", "icon collapse", "left", "right"],
  responsiveBehavior:
    "At 768px and wider the side region is fixed at --sidebar-width (default 16rem; an application sets it through that official variable on SidebarProvider, for example 28rem) and the inset fills the rest. Below 768px the side region becomes an off-canvas modal sheet (18rem) opened by SidebarTrigger, and the inset uses the full viewport when it is closed.",
  accessibility: [
    "The mobile sheet is the Base UI Dialog primitive: it moves focus in, traps it, closes on Escape or backdrop press, returns focus to the trigger, and has a screen-reader title.",
    "SidebarTrigger is a real button named Toggle Sidebar; Ctrl or Cmd+B toggles the sidebar from the keyboard.",
    "Menu buttons and menu actions are native buttons with visible focus rings; an icon-only SidebarMenuAction needs an aria-label.",
    "Mobile menu actions expand their hit area to at least 36px; reduced motion removes the slide and width transitions.",
  ],
  composition: [
    "Extends the official shadcn new-york-v4 Sidebar (radix-ui@1.6.7 Slot, class-variance-authority, lucide-react, internal Button, Input, Separator) with the Base UI Sidebar's @base-ui/react@1.8.0 Dialog sheet.",
    "Colours: the official sidebar-* utilities read the canonical Theme v2.1 Sidebar tokens, which the theme renders as their base aliases (sidebar from background, not card; foreground, primary, primary-foreground, accent, accent-foreground, border, ring) unless the theme turns on dedicated Sidebar tokens.",
    "Adaptations: an inline Base UI Dialog sheet so Base UI popups nest in it, focus returns to the trigger, no cookie, no tooltip prop, deterministic skeleton.",
    "Compose SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, and SidebarMenuAction inside SidebarContent.",
  ],
  examples: [
    '<SidebarProvider style={{ "--sidebar-width": "28rem" }}><Sidebar><SidebarHeader>…</SidebarHeader><SidebarContent>…</SidebarContent></Sidebar><SidebarInset><SidebarTrigger />…</SidebarInset></SidebarProvider>',
    '<SidebarMenuItem><SidebarMenuButton isActive>Studio</SidebarMenuButton><SidebarMenuAction aria-label="Delete Studio"><Trash2Icon /></SidebarMenuAction></SidebarMenuItem>',
  ],
  mistakes: [
    "Placing the delete or menu action inside the row's primary button, so one press does two things.",
    "Leaving no SidebarTrigger in the inset, which strands mobile users with the sheet closed.",
    "Adding a separate top header or resizable panel that duplicates the shell.",
    "Styling the sidebar with literal colours instead of the theme's semantic tokens.",
  ],
  mobileReplacement: "The official off-canvas sheet (Base UI Dialog) below 768px, opened by SidebarTrigger.",
  constraints: [
    { id: "sidebar.single-shell", rule: "Exactly one SidebarProvider and one Sidebar form the shell; no nested sidebar." },
    { id: "sidebar.inset-required", rule: "The main content is rendered in one SidebarInset beside the Sidebar." },
    { id: "sidebar.trigger-name", rule: "A SidebarTrigger with a non-empty accessible name is reachable in the inset." },
    { id: "sidebar.mobile-sheet", rule: "Below 768px the sidebar is the off-canvas modal sheet, not inline or hidden." },
    { id: "sidebar.action-sibling", rule: "A SidebarMenuAction is a sibling of its row's primary control and has an accessible name." },
    { id: "sidebar.semantic-tokens", rule: "Sidebar colours use canonical semantic theme tokens (the sidebar-* set or shared base tokens such as input); no literal colours or non-canonical sidebar tokens." },
  ],
}
