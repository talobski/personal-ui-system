import type { Mode } from "./lifecycle"

/** Parent -> preview iframe. Only rendered variable CSS and the mode cross the boundary. */
export type PreviewState = { type: "workbench-preview-state"; css: string; mode: Mode; themeId: string; revision: number }
export type PreviewReady = { type: "workbench-preview-ready" }
