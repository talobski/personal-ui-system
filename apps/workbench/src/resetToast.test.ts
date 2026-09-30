import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
/** Source without comments, so explanatory prose is not mistaken for an implementation. */
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "")

describe("WPIP-06 reset toast (PUI-115)", () => {
  const app = () => code("./App.tsx")

  it("uses the installed Base UI Toast primitive through a re-export-only bridge, with no new dependency or registry item", () => {
    expect(read("../../../packages/ui/src/lib/toast.ts").replace(/^\/\/.*\n/gm, "")).toBe('export { Toast } from "@base-ui/react/toast"\n')
    expect(app()).toContain('import { Toast } from "@personal-ui/ui/lib/toast"')
    expect(app()).not.toMatch(/sonner|react-hot-toast|react-toastify|notistack/i)
    const registry = JSON.parse(read("../../../registry.json")) as { items: { name: string }[] }
    expect(registry.items).toHaveLength(23)
    expect(registry.items.some(item => /toast|sonner/.test(item.name))).toBe(false)
    for (const manifest of ["../package.json", "../../../packages/ui/package.json"]) expect(read(manifest)).not.toMatch(/sonner/)
  })

  it("replaces reset's inline notice; the notice channel remains for save and delete errors (PUI-136 moves routine success to toasts)", () => {
    const source = app()
    expect(source).not.toMatch(/Undo restores your edits/)
    const reset = source.slice(source.indexOf("const resetToBaseline = () => {"), source.indexOf("undoResetRef.current = () => {"))
    expect(reset).not.toContain("setNotice(")
    expect(reset).toContain("toasts.add({")
    expect(reset).toContain("id: RESET_TOAST_ID")
    expect(reset).toContain('actionProps: { children: "Undo", onClick: () => undoResetRef.current() }')
    for (const message of ["setNotice(`Not saved:", "setNotice(`Not deleted:"]) expect(source).toContain(message)
    for (const message of ["setNotice(`Saved", "setNotice(`Deleted"]) expect(source).not.toContain(message)
    expect(source).toContain("{notice && <div className=\"px-4 py-2\"><Notice>{notice}</Notice></div>}")
  })

  it("reuses the existing history Undo, guarded to the exact post-reset state, and closes a stale toast", () => {
    const source = app()
    const undoReset = source.slice(source.indexOf("undoResetRef.current = () => {"), source.indexOf("React.useEffect(", source.indexOf("undoResetRef.current = () => {")))
    expect(undoReset).toContain("stepHistory(undo)")
    expect(undoReset).toMatch(/!locked && now\.id === target\.themeId && now\.revision === target\.revision/)
    expect(undoReset.match(/stepHistory\(/g)).toHaveLength(1)
    // One history model: no second track, stack or snapshot for the toast.
    expect(source.match(/HistoryTrack/g)!.length).toBeLessThanOrEqual(read("./App.tsx").match(/HistoryTrack/g)!.length)
    expect(source).not.toMatch(/resetSnapshot|toastHistory|undoStack/)
    expect(source).toMatch(/if \(target && \(locked \|\| current\.id !== target\.themeId \|\| current\.revision !== target\.revision\)\) \{\s*resetUndo\.current = null\s*toasts\.close\(RESET_TOAST_ID\)/)
    expect(source).toContain("}, [current.id, current.revision, locked, toasts])")
  })

  it("floats in a fixed, portalled viewport on semantic tokens with an always-reachable Undo and Dismiss", () => {
    const source = app()
    expect(source).toContain("<Toast.Portal>")
    expect(source).toMatch(/<Toast\.Viewport data-testid="toast-viewport" className="fixed right-4 bottom-4 [^"]*"/)
    expect(source).toMatch(/className="rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg [^"]*motion-reduce:transition-none"/)
    expect(source).toContain("<Toast.Action ")
    expect(source).not.toContain("<Toast.Close")
    expect(source).toContain('onClick={() => close(toast.id)}>Dismiss</Button>')
    expect(source).toContain("<Toast.Provider toastManager={toasts}><WorkbenchToasts /></Toast.Provider>")
    expect(source).not.toMatch(/priority: "high"/)
  })
})
