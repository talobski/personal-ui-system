/** Layout-only pixels; never part of a theme or its persistence. */
export function editorBounds(viewportWidth: number) {
  const max = Math.max(0, Math.min(480, viewportWidth - 640))
  return { min: Math.min(352, max), max, defaultSize: Math.min(352, max) }
}
