export const resizablePanel = {
  id: "resizable-panel",
  purpose: "Divide a desktop workspace into bounded panels with an accessible pointer and keyboard separator.",
  use: ["Compose ResizablePanelGroup, two ResizablePanel children and a ResizableHandle between them.", "Provide stable panel ids, a separator accessible name, and explicit minimum and maximum sizes."],
  avoid: ["Squeezing desktop panels side by side on mobile.", "Implementing custom pointer or keyboard resize handlers.", "Saving layout dimensions in theme tokens."],
  variants: ["horizontal", "vertical"],
  responsiveBehavior: "Use full-width Tabs on narrow screens. Preserve mounted content and drafts. Clamp desktop widths when the container changes; numeric v4 sizes are pixels and percentage strings require explicit units.",
  accessibility: ["The react-resizable-panels Separator supplies focusability, separator role, value bounds and keyboard behavior.", "Give the handle an accessible name and visible focus. Arrow keys resize; Home and End reach bounds.", "Keep panels and separators as direct DOM children of Group and preserve DOM reading order."],
  composition: ["Shadcn-derived Resizable composition backed by pinned react-resizable-panels@4.13.2 Group, Panel and Separator.", "Use accepted Tabs for mobile replacement; ordinary semantic layout contains each panel's content."],
  examples: ['<ResizablePanelGroup orientation="horizontal"><ResizablePanel id="editor" minSize={352} defaultSize={352} maxSize={480}>Editor</ResizablePanel><ResizableHandle aria-label="Resize editor"/><ResizablePanel id="preview">Preview</ResizablePanel></ResizablePanelGroup>'],
  mistakes: ["Using numeric 30 expecting 30 percent: v4 treats it as pixels.", "Hiding the focus ring or removing the Separator.", "Setting a minimum greater than the maximum."],
  mobileReplacement: "Full-width Controls and Preview Tabs, with inactive content retained.",
  constraints: [
    { id: "resizable-panel.bounds", rule: "Minimum <= default <= maximum, all positive finite pixel sizes." },
    { id: "resizable-panel.accessible-separator", rule: "Use the library separator with an accessible name and visible focus." },
  ],
}
