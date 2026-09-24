import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"

import { Field, FieldDescription, FieldLabel } from "@personal-ui/ui/components/field"
import { Slider } from "@personal-ui/ui/components/slider"

function Example({ disabled = false, initial = 0.3 }: { disabled?: boolean; initial?: number }) {
  const [value, setValue] = React.useState(initial)
  return (
    <Field className="w-80">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel id="spacing-label">Spacing base</FieldLabel>
        <output data-testid="slider-value" aria-labelledby="spacing-label" className="text-sm tabular-nums text-muted-foreground">
          {value} rem
        </output>
      </div>
      <Slider
        aria-labelledby="spacing-label"
        aria-valuetext={`${value} rem`}
        min={0.1}
        max={0.5}
        step={0.005}
        value={[value]}
        onValueChange={([next]) => setValue(Number(next!.toFixed(3)))}
        disabled={disabled}
      />
      <FieldDescription>Base length of the spacing scale.</FieldDescription>
    </Field>
  )
}

const meta = {
  title: "Pilot/Slider",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Disabled: Story = { args: { disabled: true } }
