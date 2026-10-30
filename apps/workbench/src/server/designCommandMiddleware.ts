import type { IncomingMessage, ServerResponse } from "node:http"

/** Mirrors `MAX_REQUEST_BODY_BYTES` in `./designCommandHandler.ts` (a test keeps the two equal). Duplicated, not
 * imported, because `vite.config.ts` imports this module through Vite's config loader, which cannot load the
 * handler's `@personal-ui/core` imports (see the comment on `designCommandApiPlugin` there). Bounds how much of a
 * request body this middleware buffers into memory before the handler's own (identical) size check would reject it. */
export const MAX_REQUEST_BODY_BYTES = 8 * 1024

/** Connection and framing headers describe the original transfer, not the re-buffered body, so they are not copied. */
const DROPPED_HEADERS = new Set(["connection", "content-length", "keep-alive", "proxy-connection", "te", "trailer", "transfer-encoding", "upgrade"])

export type DesignCommandMiddlewareOptions = {
  /** The Workbench origins allowed to call the endpoint. Resolved per request: the bound address exists only once
   * the dev server is listening. */
  trustedOrigins: () => readonly string[]
  handle: (request: Request, trustedOrigins: readonly string[]) => Promise<Response>
}

/**
 * The dev server's own origins: its resolved loopback URLs (`server.resolvedUrls.local`, e.g.
 * `http://127.0.0.1:5173/`), so the trusted origin follows the configured host and port. Network URLs are never
 * trusted, and an empty list (no listening server yet) trusts nothing.
 */
export function workbenchOrigins(localUrls: readonly string[]): string[] {
  return [...new Set(localUrls.map((url) => new URL(url).origin))]
}

/** The Fetch `Request` the handler sees: the buffered body with every original header except the framing ones. */
export function toFetchRequest(req: IncomingMessage, body: Buffer<ArrayBuffer>): Request {
  const headers = new Headers()
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    const name = req.rawHeaders[i]!.toLowerCase()
    if (!DROPPED_HEADERS.has(name)) headers.append(name, req.rawHeaders[i + 1]!)
  }
  return new Request(`http://${req.headers.host ?? "127.0.0.1"}/api/design-command/evaluate`, { method: "POST", headers, body })
}

/**
 * The localhost product API middleware: buffers at most `MAX_REQUEST_BODY_BYTES`, then hands the request, with its
 * headers intact, to the handler, which decides whether the caller is trusted. It never reads a credential itself.
 */
export function createDesignCommandMiddleware(options: DesignCommandMiddlewareOptions) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== "POST") {
      res.statusCode = 405
      res.end()
      return
    }
    const chunks: Buffer[] = []
    let total = 0
    for await (const chunk of req) {
      total += (chunk as Buffer).byteLength
      if (total > MAX_REQUEST_BODY_BYTES) {
        res.statusCode = 413
        res.end(JSON.stringify({ outcome: { kind: "rejected", reason: { code: "design-command.request-too-large" } } }))
        req.destroy()
        return
      }
      chunks.push(chunk as Buffer)
    }
    const response = await options.handle(toFetchRequest(req, Buffer.concat(chunks)), options.trustedOrigins())
    res.statusCode = response.status
    res.setHeader("content-type", response.headers.get("content-type") ?? "application/json")
    res.end(await response.text())
  }
}
