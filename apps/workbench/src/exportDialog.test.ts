import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { renderPortableThemeCss, toPortableTheme } from "@personal-ui/core"

import { buildUiEffectsOperation } from "./controls"
import { editTheme, exportThemeCss, exportThemeJson, loadBuiltInThemes } from "./lifecycle"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
/** Source without comments, so explanatory prose is not mistaken for an implementation. */
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
const app = () => code("./App.tsx")
const between = (source: string, start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)))

const builtIns = loadBuiltInThemes()

describe("TAED-01/02, TCHS-01/02 Theme code dialog (PUI-134, PUI-138)", () => {
  it("CSS export is exactly core's portable render, with light, dark and UI Effects blocks and no header", () => {
    for (const theme of builtIns) {
      const { filename, css } = exportThemeCss(theme)
      expect(css).toBe(renderPortableThemeCss(theme))
      expect(css.startsWith(":root {")).toBe(true)
      expect(filename).toBe(`${theme.id}.theme.css`)
      expect(css).toContain(":root {")
      expect(css).toContain(".dark {")
      expect(css).toContain("@theme inline {")
      expect(css).toContain(`--primary: ${theme.colors.dark.primary.$value};`)
    }
    const tactile = editTheme(builtIns[0]!, buildUiEffectsOperation(builtIns[0]!, { effect: "tactile" }))
    expect(tactile.ok).toBe(true)
    if (!tactile.ok) return
    expect(exportThemeCss(tactile.theme).css).toBe(renderPortableThemeCss(tactile.theme))
    expect(exportThemeCss(tactile.theme).css).toContain("UI effects: tactile")
  })

  it("JSON export is core's portable theme: design tokens only, no schema, identity or revision", () => {
    for (const theme of builtIns) {
      const { filename, json } = exportThemeJson(theme)
      expect(filename).toBe(`${theme.id}.theme.json`)
      expect(json).toBe(`${JSON.stringify(toPortableTheme(theme), null, 2)}\n`)
      for (const key of ["$schema", "schemaVersion", "kind", "id", "name", "revision", "$extensions"]) expect(JSON.parse(json)).not.toHaveProperty(key)
    }
  })

  it("Code opens the Theme code Dialog; one generated value per format feeds preview and Copy, and nothing downloads (PUI-138)", () => {
    const source = app()
    expect(source).toContain('from "@personal-ui/ui/components/dialog"')
    const dialog = between(source, "function ThemeCodeDialog(", "function ReviewChangesButton(")
    expect(dialog).toContain("<DialogTrigger asChild>")
    expect(dialog).toContain('title="Code"')
    expect(dialog).toContain('<Code2 aria-hidden="true" className="size-3.5" />')
    expect(dialog).toContain('<span className="max-sm:sr-only">Code</span>')
    expect(dialog).toContain('<span className="type-heading">Theme code</span>')
    expect(dialog).toContain("<DialogDescription>Copy your theme as JSON or Tailwind CSS.</DialogDescription>")
    expect(dialog).toContain('<TabsList aria-label="Code format"')
    expect(dialog).toContain("const file = React.useMemo(() => (open ? exportFile(theme, format) : null), [open, theme, format])")
    expect(dialog).toContain("<code>{file.content}</code>")
    expect(dialog).toContain("navigator.clipboard.writeText(file.content)")
    // Copy lives in the code panel's toolbar, above the shared ScrollArea viewport, with its icon and visible label.
    const panel = between(dialog, 'data-testid="export-code-toolbar"', "</ScrollArea>")
    expect(panel).toMatch(/<Copy aria-hidden="true" className="size-3\.5" \/>\s*Copy\s*<\/Button>/)
    expect(panel.indexOf("<ScrollArea")).toBeGreaterThan(panel.indexOf("onClick={copy}"))
    expect(panel).toContain('orientation="both"')
    expect(dialog).toContain("whitespace-pre")
    expect(dialog).not.toContain("overflow-auto")
    // No Download: no button, footer, handler, Blob or file flow anywhere in the Workbench.
    expect(dialog).not.toMatch(/Download|DialogFooter|download/)
    expect(source).not.toMatch(/\bdownload\(|createObjectURL|new Blob|\.download =|\bDownload\b|Export theme/)
    const exporter = between(source, "function exportFile(", "function Notice(")
    expect(exporter).toContain("exportThemeCss(theme)")
    expect(exporter).toContain("exportThemeJson(theme)")
    expect(exporter).not.toMatch(/renderShadcnTailwindCss|JSON\.stringify/)
    // No syntax-highlighting, tooltip or toast dependency.
    for (const manifest of ["../package.json", "../../../packages/ui/package.json"]) expect(read(manifest)).not.toMatch(/prism|shiki|highlight|sonner|tooltip/i)
  })

  it("the previewed and copied value is exactly the portable JSON or CSS, and never depends on theme identity", () => {
    const custom = editTheme(builtIns[0]!, buildUiEffectsOperation(builtIns[0]!, { effect: "tactile" }))
    expect(custom.ok).toBe(true)
    if (!custom.ok) return
    for (const theme of [...builtIns, { ...custom.theme, id: "my-theme", name: "My Theme" }]) {
      const renamed = { ...theme, id: "client-copy", name: "Client Copy", revision: theme.revision + 41 }
      expect(exportThemeJson(renamed).json).toBe(exportThemeJson(theme).json)
      expect(exportThemeCss(renamed).css).toBe(exportThemeCss(theme).css)
      expect(exportThemeCss(theme).css).toBe(renderPortableThemeCss(theme))
    }
  })
})

describe("TAED-03 Delete placement (PUI-135)", () => {
  it("Delete leads the right cluster before the dark-mode Switch, behind the semantic divider; the sidebar no longer has it", () => {
    const source = app()
    const header = between(source, "<SidebarHeader", "</SidebarHeader>")
    expect(header).not.toContain("delete-theme")
    expect(source).not.toContain("SidebarMenuAction")
    const cluster = between(source, 'className="ml-auto flex items-center gap-2"', 'id="color-mode-switch"')
    expect(cluster).toContain("{activeCustom && (")
    expect(cluster).toContain('<Button variant="ghost" size="icon" aria-label="Delete theme" data-testid="delete-theme" disabled={locked}')
    expect(cluster).toContain('<Trash aria-hidden="true" className="size-3.5" />')
    expect(cluster).toContain('<Button variant="destructive" className="cursor-pointer" onClick={deleteActive}>Delete theme</Button>')
    expect(cluster).toMatch(/<\/ResponsiveDialog>\s*<ToolbarSeparator \/>\s*<\/>\s*\)\}\s*(?:\{\}\s*)?<WorkbenchTooltip label="Toggle dark mode">\s*<Switch/)
    expect(source).toContain("const activeCustom = !builtInCopy && Object.hasOwn(saved.themes, current.id)")
    expect(source).toContain("if (locked || builtInCopy || !Object.hasOwn(saved.themes, current.id)) return")
  })
})

describe("TAED-04/05 routine success toasts (PUI-136)", () => {
  it("Save, Save As and Delete successes use the shared toast; errors keep their inline notice or field error", () => {
    const source = app()
    const save = between(source, "const save = (event", "const saveAs = (event")
    expect(save).toContain('showSuccess("Theme saved")')
    expect(save).toContain("setNotice(`Not saved: ${describeIssues(result.issues)}`)")
    const saveAs = between(source, "const saveAs = (event", "const deleteActive = () =>")
    expect(saveAs).toContain('showSuccess("Theme saved as custom theme")')
    expect(saveAs).toContain("return setSaveAsIssues(copy.issues)")
    const remove = between(source, "const deleteActive = () =>", "const load = (id")
    expect(remove).toContain('showSuccess("Theme deleted"')
    expect(remove).toContain("setNotice(`Not deleted: ${describeIssues(result.issues)}`)")
    expect(source).not.toMatch(/as a custom theme\. \$\{|locally\.`\)|setNotice\(`Saved|setNotice\(`Deleted/)
    expect(source).toContain("const showSuccess = (title: string, description?: string) => toasts.add({ id: SUCCESS_TOAST_ID, title, description })")
    // Opening Theme code adds no feedback; only one toast manager exists.
    expect(between(source, "function ThemeCodeDialog(", "function ReviewChangesButton(")).not.toContain("toasts.add")
    expect(source.match(/Toast\.createToastManager\(\)/g)).toHaveLength(1)
  })

  it("every toast shares one semantic popover surface with an explicit border", () => {
    const source = app()
    expect(source.match(/<Toast\.Root\b/g)).toHaveLength(1)
    expect(source).toContain('className="rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg')
    expect(source).not.toMatch(/bg-white|bg-background p-4/)
  })
})

describe("TCHS-03 header icon system (PUI-139)", () => {
  it("Delete joins the sibling icon treatment: ghost size-8 Button, size-3.5 Lucide glyph, resting foreground, destructive only on interaction", () => {
    const source = app()
    const del = between(source, 'data-testid="delete-theme"', "</Button>")
    expect(del).toContain('<Trash aria-hidden="true" className="size-3.5" />')
    expect(del).not.toMatch(/text-muted-foreground|size-4|\[\d+px\]|<svg/)
    expect(del).toContain("className=\"size-8 enabled:cursor-pointer hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive focus-visible:text-destructive")
    expect(del).toContain("aria-expanded:text-destructive")
    expect(source).not.toContain("function TrashIcon")
    for (const name of ["Undo", "Redo", "Reset"]) expect(between(source, `aria-label="${name}"`, "</Button>")).toContain('className="size-3.5"')
  })

  it("every icon-only header control has a shadcn tooltip beside its own accessible name; Code and Save do not", () => {
    const source = app()
    expect(read("../../../packages/ui/src/lib/workbench-tooltip.ts").replace(/^\/\/.*\n/gm, "")).toBe('export { Tooltip as TooltipPrimitive } from "radix-ui"\n')
    const tooltip = code("./WorkbenchTooltip.tsx")
    expect(tooltip).toContain('import { TooltipPrimitive } from "@personal-ui/ui/lib/workbench-tooltip"')
    expect(tooltip).toContain("<TooltipPrimitive.Trigger asChild>")
    expect(tooltip).toContain("bg-foreground px-3 py-1.5 text-xs text-balance text-background")
    expect(tooltip).not.toMatch(/tabIndex|aria-label|title=/)
    expect(source.match(/<WorkbenchTooltipProvider>/g)).toHaveLength(1)
    const toolbar = between(source, 'data-testid="workbench-toolbar"', "<ThemeCodeDialog ")
    expect(Array.from(toolbar.matchAll(/<WorkbenchTooltip label="([^"]+)">/g), (m) => m[1])).toEqual(["Toggle sidebar", "Delete theme", "Toggle dark mode", "Undo", "Redo", "Reset theme"])
    // Names are independent of the tooltips; the icon-only controls drop the duplicate native title.
    for (const name of ["Delete theme", "Toggle dark mode", "Undo", "Redo", "Reset"]) expect(toolbar).toContain(`aria-label="${name}"`)
    expect(toolbar).not.toMatch(/title="(Undo|Redo|Reset|Delete theme)"/)
    // Disabled semantics stay on the Buttons themselves.
    expect(toolbar).toContain("disabled={locked || track.past.length === 0}")
    expect(toolbar).toContain("disabled={locked || track.future.length === 0}")
    // Visible-text Code and Save are not tooltipped.
    expect(between(source, "function ThemeCodeDialog(", "function ReviewChangesButton(")).not.toContain("WorkbenchTooltip")
    expect(between(source, "<ThemeCodeDialog ", 'title="Save"')).not.toContain("WorkbenchTooltip")
  })
})
