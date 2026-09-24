export const combobox = {
  id: "combobox",
  purpose: "Choose one value from a longer fixed list by typing to filter it, with full keyboard and pointer selection.",
  use: [
    "Use Combobox for one choice from a list long enough that searching is faster than scanning (for example a font catalog).",
    "Label the input from a visible FieldLabel through htmlFor and the input id.",
    "Show an empty-state message when the filter matches nothing; never leave an empty popup without text.",
    "Commit only on selection of a listed option; typed text alone never becomes the value.",
  ],
  avoid: [
    "Short lists of a few options (use Select, NativeSelect, or SingleToggleGroup).",
    "Free-form text entry or creating new values (use Input).",
    "Multiple selection or chips; only single-value Combobox is admitted.",
    "Remote/async search or any network request while filtering.",
  ],
  variants: ["default", "disabled", "with-empty-state"],
  responsiveBehavior:
    "The input fills its container width; the popup matches the input width, stays within the available viewport height with its own scrolling, and never causes horizontal overflow at 390px.",
  accessibility: [
    "Built on the Base UI Combobox primitive: the input has role=combobox with aria-expanded, aria-controls, and aria-activedescendant; options have role=option; do not add custom keyboard handling.",
    "Typing filters, ArrowDown/ArrowUp move the highlight, Enter selects, Escape closes and keeps focus in the input.",
    "The selected option is marked aria-selected and shows a check indicator.",
    "Keep the visible focus ring on the input group; a disabled Combobox is removed from interaction.",
  ],
  composition: [
    "Extends the shadcn Combobox source over @base-ui/react@1.8.0; the only adaptation renders the input group with Base UI Combobox.InputGroup because no InputGroup resource is registered.",
    "Compose Combobox (items, value, onValueChange) + ComboboxInput + ComboboxContent with ComboboxEmpty and ComboboxList of ComboboxItem.",
    "Place inside Field with FieldLabel; render option text in its own style only when the option is a visual sample, such as a font.",
  ],
  examples: [
    '<Field><FieldLabel htmlFor="sans">Sans font</FieldLabel><Combobox items={fonts} value={font} onValueChange={setFont}><ComboboxInput id="sans" placeholder="Search fonts" /><ComboboxContent><ComboboxEmpty>No fonts found.</ComboboxEmpty><ComboboxList>{(f) => <ComboboxItem key={f.value} value={f}>{f.label}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox></Field>',
  ],
  mistakes: [
    "Committing each typed keystroke as the value instead of the selected option.",
    "Leaving the input unnamed because it has a placeholder.",
    "Hiding the empty state so a no-match search looks like a broken popup.",
    "Loading options or font files from a remote service while filtering.",
  ],
  mobileReplacement: null,
  constraints: [
    { id: "combobox.accessible-name", rule: "Every Combobox input must have a non-empty accessible name." },
    { id: "combobox.option-values", rule: "Option values are unique and non-empty, and the selected value, when present, is an enabled option." },
    { id: "combobox.empty-state", rule: "A Combobox must declare a non-empty empty-state message." },
    { id: "combobox.searchable-size", rule: "A Combobox lists at least five options; shorter lists use Select, NativeSelect, or SingleToggleGroup." },
  ],
}
