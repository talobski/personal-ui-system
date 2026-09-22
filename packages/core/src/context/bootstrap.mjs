#!/usr/bin/env node
// Entry point for `pnpm context`. Registers the extension-resolution hook before importing the TypeScript CLI, so
// the hook is in effect for the CLI's own static imports and everything they reach. No network, no filesystem
// write, no output-path option: this process only parses argv, evaluates one request in-process, and writes one
// line of JSON to stdout or stderr.
import { register } from "node:module"

register("./resolve-hook.mjs", import.meta.url)
await import("./cli.ts")
