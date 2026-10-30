import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { Plugin, ViteDevServer } from "vite"

import type { DesignCommandServerEnv } from "./src/server/designCommandHandler.ts"
import { createDesignCommandMiddleware, workbenchOrigins } from "./src/server/designCommandMiddleware"

const uiSrc = fileURLToPath(new URL("../../packages/ui/src", import.meta.url))

/**
 * The localhost product API middleware. It runs only inside the Vite dev-server Node process — it is never part of
 * the client bundle — and reads `process.env` only at request time, never at config-eval time, so the credential
 * is never captured into a build artifact. It reads only `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY`; see
 * `apps/workbench/src/server/designCommandHandler.ts` for the credential-isolation boundary itself. The only trusted
 * caller is the Workbench on this dev server's own loopback origin, derived from the address it is listening on, and
 * the handler enforces that from the request's original headers.
 *
 * The handler module is loaded through Vite's own SSR module graph (`server.ssrLoadModule`), not a plain Node
 * `import`, because `vite.config.ts` itself is evaluated by Vite's config loader, which does not bundle across
 * workspace package boundaries (`@personal-ui/core`'s extensionless relative source imports are only resolvable by
 * a bundler, not raw Node ESM resolution). `ssrLoadModule` runs the file through the real Vite resolver instead.
 */
function designCommandApiPlugin(): Plugin {
  return {
    name: "personal-ui-design-command-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        "/api/design-command/evaluate",
        createDesignCommandMiddleware({
          trustedOrigins: () => workbenchOrigins(server.resolvedUrls?.local ?? []),
          handle: async (request, trustedOrigins) => {
            const mod = await server.ssrLoadModule("/src/server/designCommandHandler.ts")
            return mod.handleDesignCommandEvaluate(request, process.env as DesignCommandServerEnv, fetch, trustedOrigins)
          },
        })
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), designCommandApiPlugin()],
  resolve: {
    // Mirrors the tsconfig path mapping, as in the Storybook config.
    alias: [{ find: /^@personal-ui\/ui\/(.*)$/, replacement: `${uiSrc}/$1` }],
  },
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 5173, strictPort: true },
})
