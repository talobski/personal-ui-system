/**
 * Minimal local typing for the culori entry points core uses (culori 4.0.2 ships no TypeScript declarations and no
 * `@types/culori` is installed). Only the tree-shakeable `culori/fn` members used by `color.ts` are declared.
 */
declare module "culori/fn" {
  export type CuloriColor = { mode: string; alpha?: number; [channel: string]: number | string | undefined }
  export type ModeDefinition = { mode: string }
  export const modeRgb: ModeDefinition
  export const modeLrgb: ModeDefinition
  export const modeHsl: ModeDefinition
  export const modeOklab: ModeDefinition
  export const modeXyz65: ModeDefinition
  export const modeOklch: ModeDefinition & { mode: "oklch" }
  export const modeP3: ModeDefinition & { mode: "p3" }
  export function useMode(definition: ModeDefinition & { mode: "oklch" }): (color: CuloriColor) => { mode: "oklch"; l: number; c: number; h?: number; alpha?: number }
  export function useMode(definition: ModeDefinition & { mode: "p3" }): (color: CuloriColor) => { mode: "p3"; r: number; g: number; b: number; alpha?: number }
  export function useMode(definition: ModeDefinition): (color: CuloriColor) => Record<string, number | string | undefined>
}
