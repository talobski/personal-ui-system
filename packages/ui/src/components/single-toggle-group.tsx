import * as React from "react"

import { ToggleGroup, ToggleGroupItem } from "@personal-ui/ui/components/toggle-group"

type Option<T extends string> = { value: T; label: React.ReactNode }

/** Single-select shadcn ToggleGroup that always keeps one value selected. */
function SingleToggleGroup<T extends string>({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string
  value: T
  onValueChange: (value: T) => void
  options: readonly Option<T>[]
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (next) onValueChange(next as T)
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export { SingleToggleGroup }
