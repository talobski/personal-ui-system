import type { Preview } from "@storybook/react-vite"

import "../src/styles/globals.css"

const preview: Preview = {
  parameters: { a11y: { test: "off" } },
}

export default preview
