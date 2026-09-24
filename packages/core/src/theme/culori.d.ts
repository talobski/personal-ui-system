/**
 * Minimal local typing for the one culori entry point core uses (culori 4.0.2 ships no TypeScript declarations and
 * no `@types/culori` is installed). Only the converter call shape used by `color.ts` is declared.
 */
declare module "culori" {
  export type CuloriColor = { mode: string; alpha?: number; [channel: string]: number | string | undefined }
  export function converter(mode: "oklch"): (color: CuloriColor) => { mode: "oklch"; l: number; c: number; h?: number; alpha?: number }
  export function converter(mode: "p3" | "rgb"): (color: CuloriColor) => { mode: string; r: number; g: number; b: number; alpha?: number }
}
