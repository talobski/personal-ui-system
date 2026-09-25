export const scrollArea = {
  id: "scroll-area",
  purpose: "Contain persistent application content in a bounded viewport with overlay scrollbars and native scrolling.",
  use: [
    "Use for persistent application panels or horizontal navigation with a bounded available size.",
    "Give the viewport a region name and tabIndex=0 when it needs independent keyboard scrolling.",
    "Set orientation to horizontal or both only when that axis contains overflow.",
  ],
  avoid: [
    "Replacing browser or embedded preview document scrolling.",
    "Wrapping Select or Combobox listboxes, code overflow, or transient dialog surfaces.",
    "Nested competing scrollers on the same axis or custom wheel, pointer, touch, and keyboard handlers.",
  ],
  variants: ["vertical (default)", "horizontal", "both"],
  responsiveBehavior: "Constrain the root inside a min-height:0 or min-width:0 layout. Overlay scrollbars reserve no content width. The same viewport works inside a mobile sidebar sheet.",
  accessibility: [
    "Name independently focusable regions; preserve a visible viewport focus ring.",
    "Keep native wheel, trackpad, keyboard, touch, focus scrolling and Radix pointer dragging.",
    "Ensure every overflowing control is reachable without a scroll trap.",
  ],
  composition: [
    "Official shadcn new-york-v4 ScrollArea composition over radix-ui@1.6.7 ScrollArea Root, Viewport, ScrollAreaScrollbar, ScrollAreaThumb and Corner.",
    "Adaptations: viewportProps forwards region naming and focus attributes; orientation selects the composed scrollbar axes. No custom input handlers.",
    "ScrollArea supplies the viewport and bars; ScrollBar remains exported for composition. Bound the root height or width in the consumer.",
  ],
  examples: [
    '<ScrollArea className="h-64 w-80" viewportProps={{ role: "region", "aria-label": "Activity", tabIndex: 0 }}><ActivityList /></ScrollArea>',
    '<ScrollArea orientation="horizontal" className="w-64"><div className="w-max">Navigation</div></ScrollArea>',
  ],
  mistakes: ["Unbounded roots that expand to content height.", "Putting the region name on a non-focusable root instead of the viewport.", "Intercepting wheel or touch events to simulate scrolling."],
  mobileReplacement: null,
  constraints: [
    { id: "scroll-area.bounded", rule: "The scrolling axis has a bounded viewport." },
    { id: "scroll-area.accessible-viewport", rule: "The viewport is keyboard reachable, visibly focusable and has a non-empty accessible name." },
    { id: "scroll-area.native-input", rule: "Native input is preserved; no custom scrolling handlers or competing same-axis scroller." },
  ],
}
