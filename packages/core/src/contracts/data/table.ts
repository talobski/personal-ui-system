export const table = {
  id: "table",
  purpose: "Present a small set of structured records in rows and labelled columns with native table semantics.",
  use: [
    "Use Table for a compact, fixed set of records whose columns are compared across rows.",
    "Give every column a TableHead and name the table with a TableCaption (visible or sr-only).",
    "Build app-specific data tables as recipes on Table; add sorting, filtering or pagination only when the product needs them.",
  ],
  avoid: [
    "Using Table for page layout or for a single list of items.",
    "Adding TanStack Table or a generic data-grid abstraction for a few static rows.",
    "Hiding overflow so columns are clipped instead of scrolled or wrapped.",
    "Literal border or zebra colours outside the border and muted tokens.",
  ],
  variants: ["basic", "with caption", "with footer", "selected row"],
  responsiveBehavior: "The table container scrolls horizontally when columns exceed the width; compact consumers keep cells short or truncate them so no scroll region is needed.",
  accessibility: [
    "Native table, thead, tbody, th and td elements expose row and column relationships.",
    "A caption names the table; it may be visually hidden when surrounding context is visible.",
    "Numeric columns right-align and use tabular numerals; status is conveyed in text, not colour alone.",
  ],
  composition: [
    "Official shadcn new-york-v4 Table: Table (with a horizontally scrolling table-container), TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell and TableCaption over React and cn.",
    "The official Data Table guide is a recipe on Table, not a reusable primitive; this resource ships only Table.",
    "Row borders use the border token; hover and selected rows use muted.",
  ],
  examples: [
    '<Table><TableCaption className="sr-only">Recent payments</TableCaption><TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Email</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{rows}</TableBody></Table>',
  ],
  mistakes: [
    "Using div grids that lose table semantics.",
    "Omitting column headers or the caption.",
    "Left-aligning currency so amounts do not line up.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "table.column-headers", rule: "Every column has a non-empty header." },
    { id: "table.accessible-name", rule: "The table has a non-empty caption or accessible name." },
    { id: "table.row-shape", rule: "Every row has exactly one cell per column." },
  ],
}
