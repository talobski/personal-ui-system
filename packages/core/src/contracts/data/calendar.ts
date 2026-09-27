export const calendar = {
  id: "calendar",
  purpose: "Show a month grid of days for choosing a single date, several dates, or a date range with full keyboard support.",
  use: [
    "Use Calendar to pick or display a date or a start-to-end range inside a card, popover or form.",
    'Pass mode="single", "multiple" or "range" with a controlled selected value; set defaultMonth so the selection is visible.',
    "Keep the default one-month view in compact surfaces; set numberOfMonths only where space allows.",
  ],
  avoid: [
    "Building a custom date grid or day buttons instead of Calendar.",
    "Multi-month calendars or booking flows inside compact gallery cards.",
    "Nondeterministic dates (such as today) in fixtures and tests; pass explicit dates and defaultMonth.",
    "Styling days with literal colours instead of primary and accent tokens.",
  ],
  variants: ["single", "multiple", "range", "label caption", "dropdown caption", "week numbers"],
  responsiveBehavior: "Day cells size from --cell-size (spacing 8 by default); one month stays a fixed-width grid, and several months stack below md and sit side by side from md.",
  accessibility: [
    "The month is a native grid table; arrow keys, Home/End and PageUp/PageDown move focus between days and months (react-day-picker).",
    "Each day button has an accessible date label with selection state; navigation buttons are labelled.",
    "The focused day shows the shared ring focus treatment; range ends use primary and middles use accent tokens.",
  ],
  composition: [
    "Official shadcn new-york-v4 Calendar over react-day-picker@10.0.1 DayPicker with getDefaultClassNames and the month_grid key.",
    "CalendarDayButton renders the existing Button (ghost, icon) with range data attributes; navigation uses buttonVariants.",
    "No direct date-fns import; date-fns@4.4.0 and @date-fns/tz@1.5.0 are transitive through react-day-picker only.",
  ],
  examples: [
    '<Calendar mode="range" defaultMonth={new Date(2026, 9, 1)} selected={{ from: new Date(2026, 9, 12), to: new Date(2026, 9, 16) }} onSelect={setRange} />',
  ],
  mistakes: [
    "Letting a range start after its end.",
    "Omitting defaultMonth so the selected range is off screen.",
    "Replacing day buttons with plain divs that lose keyboard focus.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "calendar.valid-range", rule: "A range selection has a start not after its end." },
    { id: "calendar.keyboard-grid", rule: "Days are keyboard-focusable buttons in the react-day-picker grid with visible focus." },
    { id: "calendar.month-count", rule: "A calendar shows between one and twelve months." },
  ],
}
