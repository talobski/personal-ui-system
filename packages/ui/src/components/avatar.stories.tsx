import type { Meta, StoryObj } from "@storybook/react-vite"

import { Avatar, AvatarFallback, avatarInitial } from "@personal-ui/ui/components/avatar"

const people = ["Ada Lovelace", "grace hopper", "  Émile Borel", "@katherine", "7 of Nine"]

/** Initials-style avatars: exactly one first meaningful character on the semantic muted surface. */
function Example() {
  return (
    <ul className="grid gap-3">
      {people.map((name) => (
        <li key={name} className="flex items-center gap-3 text-sm">
          <Avatar aria-hidden="true" data-avatar-name={name}>
            <AvatarFallback className="text-xs font-medium">{avatarInitial(name)}</AvatarFallback>
          </Avatar>
          <span>{name.trim()}</span>
        </li>
      ))}
    </ul>
  )
}

function Sizes() {
  return (
    <div className="flex items-center gap-3">
      {["size-6 text-xs", "size-8 text-sm", "size-10 text-base"].map((size) => (
        <Avatar key={size} className={size.split(" ")[0]} aria-label={`Ada Lovelace, ${size.split(" ")[0]}`} role="img">
          <AvatarFallback className={size.split(" ")[1]}>{avatarInitial("Ada Lovelace")}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  )
}

const meta = {
  title: "Pilot/Avatar",
  component: Example,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Example>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const SizesStory: StoryObj<typeof Sizes> = { name: "Sizes", render: () => <Sizes /> }
