export const select = {
  id: "select",
  purpose: "Choose one value from a short, fixed set when options need richer presentation or grouping than a native select allows.",
  use: [
    "Use Select for one choice whose options benefit from grouped headings, consistent themed styling, or a trigger that fills a composed region.",
    "Name the trigger from a visible FieldLabel (htmlFor on the trigger id) or aria-label when the surrounding region already labels it.",
    "Group related options with SelectGroup and a SelectLabel heading; separate groups with SelectSeparator.",
    "Keep every option value unique and non-empty; the selected value must be one of the enabled options.",
  ],
  avoid: [
    "Long or open-ended lists that need typing to find an option (use Combobox).",
    "Plain small forms where native platform behavior is preferable, such as a compact mobile category switcher (use NativeSelect).",
    "Multiple selection, free text entry, or actions inside options.",
    "Two to four always-visible peer options (use SingleToggleGroup or Tabs).",
  ],
  variants: ["default", "sm", "grouped", "disabled", "invalid (aria-invalid)"],
  responsiveBehavior:
    "The trigger fills its container width when composed into a region; the popup is portalled, scrolls within the available viewport height, and never causes horizontal overflow at 390px.",
  accessibility: [
    "Built on the Base UI Select primitive: the trigger has role=combobox with aria-expanded and aria-controls, and options have role=option inside a listbox; do not add custom keyboard handling.",
    "Enter, Space, and ArrowDown open the list; arrows move, typeahead jumps, Enter selects an enabled option, Escape closes and returns focus to the trigger.",
    "Group headings are exposed through role=group with an accessible label; disabled options may be reached but are never selected.",
    "Keep the visible focus ring on the trigger; a disabled Select is removed from interaction.",
  ],
  composition: [
    "Extends the shadcn Select source over @base-ui/react@1.8.0; the only adaptation renders the popup in place with fixed positioning, so no aria-hidden focus guards surround a portal.",
    "Compose SelectTrigger + SelectValue + SelectContent with SelectGroup, SelectLabel, SelectItem, and SelectSeparator.",
    "Place inside Field with FieldLabel and FieldError, or give the trigger an aria-label when the region itself is the label.",
  ],
  examples: [
    '<Select items={names} value={id} onValueChange={load}><SelectTrigger aria-label="Active theme" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel>Built-in</SelectLabel><SelectItem value="default">Default</SelectItem></SelectGroup></SelectContent></Select>',
  ],
  mistakes: [
    "Leaving the trigger unnamed because the selected value text looks like a label.",
    "Nesting a styled wrapper or pill around the trigger instead of sizing the trigger itself.",
    "Using a group heading as an option, or leaving a group without a heading.",
    "Replacing a native select that only needed native behavior.",
  ],
  mobileReplacement: "NativeSelect when the platform picker is preferable on small screens.",
  constraints: [
    { id: "select.accessible-name", rule: "Every Select trigger must have a non-empty accessible name." },
    { id: "select.option-values", rule: "Option values are unique and non-empty, and the selected value is an enabled option." },
    { id: "select.group-label", rule: "Every option group must have a non-empty visible label." },
  ],
}
