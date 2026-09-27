import type { Meta, StoryObj } from "@storybook/react-vite"
import { SignupForm } from "./signup-form"
export default { title: "Composition/Signup Form", component: SignupForm } satisfies Meta<typeof SignupForm>
export const Default: StoryObj<typeof SignupForm> = {}
