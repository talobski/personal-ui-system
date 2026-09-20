import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const uiSrc = fileURLToPath(new URL("../../packages/ui/src", import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Mirrors the tsconfig path mapping, as in the Storybook config.
    alias: [{ find: /^@personal-ui\/ui\/(.*)$/, replacement: `${uiSrc}/$1` }],
  },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 5173, strictPort: true },
})
