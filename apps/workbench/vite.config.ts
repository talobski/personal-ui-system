import type { IncomingMessage, ServerResponse } from "node:http"
import { fileURLToPath } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import type { Plugin, ViteDevServer } from "vite"

import type { DesignCommandServerEnv } from "./src/server/designCommandHandler.ts"

const uiSrc = fileURLToPath(new URL("../../packages/ui/src", import.meta.url))

/**
 * The localhost product API middleware. It runs only inside the Vite dev-server Node process — it is never part of
 * the client bundle — and reads `process.env` only at request time, never at config-eval time, so the credential
 * is never captured into a build artifact. It reads only `TYPESAFE_PERSONAL_UI_SYSTEM_API_KEY`; see
 * `apps/workbench/src/server/designCommandHandler.ts` for the credential-isolation boundary itself.
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
      server.middlewares.use("/api/design-command/evaluate", async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== "POST") {
          res.statusCode = 405
          res.end()
          return
        }
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        const request = new Request(`http://${req.headers.host ?? "127.0.0.1"}/api/design-command/evaluate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: Buffer.concat(chunks),
        })
        const mod = await server.ssrLoadModule("/src/server/designCommandHandler.ts")
        const response: Response = await mod.handleDesignCommandEvaluate(request, process.env as DesignCommandServerEnv, fetch)
        res.statusCode = response.status
        res.setHeader("content-type", response.headers.get("content-type") ?? "application/json")
        res.end(await response.text())
      })
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
