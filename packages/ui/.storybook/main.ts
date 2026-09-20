import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import type { StorybookConfig } from "@storybook/react-vite"

const uiSrc = fileURLToPath(new URL("../src", import.meta.url))

const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [...(viteConfig.plugins ?? []), tailwindcss()],
    resolve: {
      ...viteConfig.resolve,
      // Mirrors the tsconfig path mapping for the package's own alias.
      alias: [
        ...(Array.isArray(viteConfig.resolve?.alias) ? viteConfig.resolve.alias : []),
        { find: /^@personal-ui\/ui\/(.*)$/, replacement: `${uiSrc}/$1` },
      ],
    },
  }),
}

export default config
