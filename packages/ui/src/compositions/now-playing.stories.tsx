import type { Meta, StoryObj } from "@storybook/react-vite"
import { NowPlaying } from "./now-playing"
export default { title: "Composition/Now Playing", component: NowPlaying } satisfies Meta<typeof NowPlaying>
export const Default: StoryObj<typeof NowPlaying> = {}
