import type { Meta, StoryObj } from "@storybook/react-vite"
import { LocalWeather } from "./local-weather"
export default { title: "Composition/Local Weather", component: LocalWeather } satisfies Meta<typeof LocalWeather>
export const Default: StoryObj<typeof LocalWeather> = {}
