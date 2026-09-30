import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { renderShadcnTailwindCss, THEME_SCHEMA_VERSION, validateTheme } from "@personal-ui/core"

import { buildUiEffectsOperation } from "./controls"
import { editTheme, exportThemeCss, exportThemeJson, loadBuiltInThemes } from "./lifecycle"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
/** Source without comments, so explanatory prose is not mistaken for an implementation. */
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
const app = () => code("./App.tsx")
const between = (source: string, start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)))

const builtIns = loadBuiltInThemes()

describe("TAED-01/02 Export dialog (PUI-134)", () => {
  it("CSS export is exactly core's renderShadcnTailwindCss, with light, dark and UI Effects blocks", () => {
    for (const theme of builtIns) {
      const { filename, css } = exportThemeCss(theme)
      expect(css).toBe(renderShadcnTailwindCss(theme))
      expect(filename).toBe(`${theme.id}.theme.css`)
      expect(css).toContain(":root {")
      expect(css).toContain(".dark {")
      expect(css).toContain("@theme inline {")
      expect(css).toContain(`--primary: ${theme.colors.dark.primary.$value};`)
    }
    const tactile = editTheme(builtIns[0]!, buildUiEffectsOperation(builtIns[0]!, { effect: "tactile" }))
    expect(tactile.ok).toBe(true)
    if (!tactile.ok) return
    expect(exportThemeCss(tactile.theme).css).toBe(renderShadcnTailwindCss(tactile.theme))
    expect(exportThemeCss(tactile.theme).css).toContain("UI effects: tactile")
  })

  it("JSON export is unchanged: canonical Theme v3, .theme.json, and import-compatible", () => {
    for (const theme of builtIns) {
      const { filename, json } = exportThemeJson(theme)
      expect(filename).toBe(`${theme.id}.theme.json`)
      expect(JSON.parse(json).schemaVersion).toBe(THEME_SCHEMA_VERSION)
      expect(validateTheme(JSON.parse(json))).toEqual({ ok: true, theme })
    }
  })

  it("Export opens the shadcn Dialog; one generated value per format feeds preview, Copy and Download", () => {
    const source = app()
    expect(source).toContain('from "@personal-ui/ui/components/dialog"')
    const dialog = between(source, "function ExportDialog(", "function ReviewChangesButton(")
    expect(dialog).toContain("<DialogTrigger asChild>")
    expect(dialog).toContain('<span className="type-heading">Export theme</span>')
    expect(dialog).toContain('<TabsList aria-label="Export format"')
    expect(dialog).toContain("const file = React.useMemo(() => (open ? exportFile(theme, format) : null), [open, theme, format])")
    expect(dialog).toContain("<code>{file.content}</code>")
    expect(dialog).toContain("navigator.clipboard.writeText(file.content)")
    expect(dialog).toContain("download(file)")
    expect(dialog.match(/download\(/g)).toHaveLength(1)
    expect(dialog).toContain("whitespace-pre")
    expect(dialog).toContain("overflow-auto")
    // The toolbar only opens the dialog: the one download call site lives behind the dialog's Download button.
    const toolbar = between(source, 'data-testid="workbench-toolbar"', 'title="Save"')
    expect(toolbar).not.toContain("download(")
    expect(source.match(/\bdownload\(file\)/g)).toHaveLength(1)
    expect(source.match(/\bdownload\(/g)).toHaveLength(2) // the helper's definition and its one call
    const exporter = between(source, "function exportFile(", "function download(")
    expect(exporter).toContain("exportThemeCss(theme)")
    expect(exporter).toContain("exportThemeJson(theme)")
    expect(exporter).not.toMatch(/renderShadcnTailwindCss|JSON\.stringify/)
    // No syntax-highlighting or toast dependency.
    for (const manifest of ["../package.json", "../../../packages/ui/package.json"]) expect(read(manifest)).not.toMatch(/prism|shiki|highlight|sonner/i)
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
    expect(cluster).toContain('<Button variant="ghost" size="icon" aria-label="Delete theme" title="Delete theme" data-testid="delete-theme" disabled={locked}')
    expect(cluster).toContain("<TrashIcon />")
    expect(cluster).toContain('<Button variant="destructive" className="cursor-pointer" onClick={deleteActive}>Delete theme</Button>')
    expect(cluster).toMatch(/<\/ResponsiveDialog>\s*<ToolbarSeparator \/>\s*<\/>\s*\)\}\s*(?:\{\}\s*)?<Switch/)
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
    // Export opening adds no feedback; only one toast manager exists.
    expect(between(source, "function ExportDialog(", "function ReviewChangesButton(")).not.toContain("toasts.add")
    expect(source.match(/Toast\.createToastManager\(\)/g)).toHaveLength(1)
  })

  it("every toast shares one semantic popover surface with an explicit border", () => {
    const source = app()
    expect(source.match(/<Toast\.Root\b/g)).toHaveLength(1)
    expect(source).toContain('className="rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg')
    expect(source).not.toMatch(/bg-white|bg-background p-4/)
  })
})
