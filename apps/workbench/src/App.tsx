import * as React from "react"

import { COLOR_TOKENS } from "@personal-ui/core"
import type { ColorToken, Theme } from "@personal-ui/core"
import { Button } from "@personal-ui/ui/components/button"
import { Input } from "@personal-ui/ui/components/input"

import { diffThemes, editColor, exportThemeJson, forkTheme, loadCanonicalTheme, previewVariablesCss } from "./lifecycle"
import type { Mode, WorkbenchIssue } from "./lifecycle"
import type { PreviewState } from "./messages"
import { loadSaved, saveTheme } from "./persistence"
import type { SavedThemes } from "./persistence"

const WIDTHS = { mobile: 390, desktop: 1024 } as const
type Width = keyof typeof WIDTHS

const canonical = loadCanonicalTheme()

const describeIssues = (issues: WorkbenchIssue[]) => issues.map((i) => `${i.ruleId} at ${i.path || "(root)"}`).join("; ")

function download({ filename, json }: { filename: string; json: string }) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className="grid gap-3 rounded-lg border p-4">
      <h2 id={id} className="text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Message({ testId, tone, children }: { testId: string; tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p data-testid={testId} role={tone === "error" ? "alert" : "status"} className={tone === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
      {children}
    </p>
  )
}

export function App() {
  const [saved, setSaved] = React.useState<SavedThemes>(() => loadSaved(window.localStorage))
  const [current, setCurrent] = React.useState<Theme>(() => (saved.activeId ? saved.themes[saved.activeId]! : canonical))
  const [mode, setMode] = React.useState<Mode>("light")
  const [width, setWidth] = React.useState<Width>("mobile")

  const [token, setToken] = React.useState<ColorToken>("primary")
  const [draft, setDraft] = React.useState("")
  const [editIssues, setEditIssues] = React.useState<WorkbenchIssue[]>([])
  const [forkId, setForkId] = React.useState("")
  const [forkName, setForkName] = React.useState("")
  const [forkIssues, setForkIssues] = React.useState<WorkbenchIssue[]>([])
  const [notice, setNotice] = React.useState("")

  const currentValue = current.modes[mode].color[token].$value
  // The draft follows the active theme/mode/token; a rejected draft is never active state.
  React.useEffect(() => {
    setDraft(currentValue)
    setEditIssues([])
  }, [currentValue, token, mode, current.id])

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark")
  }, [mode])

  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const ready = React.useRef(false)
  const previewState = React.useMemo<PreviewState>(
    () => ({ type: "workbench-preview-state", css: previewVariablesCss(current), mode, themeId: current.id, revision: current.revision }),
    [current, mode]
  )
  const latest = React.useRef(previewState)
  latest.current = previewState
  const post = React.useCallback(() => {
    if (ready.current) iframeRef.current?.contentWindow?.postMessage(latest.current, window.location.origin)
  }, [])

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return
      if ((event.data as { type?: string } | undefined)?.type === "workbench-preview-ready") {
        ready.current = true
        post()
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [post])
  React.useEffect(post, [post, previewState])

  const diff = React.useMemo(() => diffThemes(canonical, current), [current])
  const savedCopy = saved.themes[current.id]
  const dirty = savedCopy === undefined || JSON.stringify(savedCopy) !== JSON.stringify(current)
  const knownIds = [canonical.id, ...Object.keys(saved.themes)]

  const applyEdit = () => {
    const result = editColor(current, mode, token, draft.trim())
    if (!result.ok) return setEditIssues(result.issues)
    setEditIssues([])
    setCurrent(result.theme)
    setNotice("")
  }

  const fork = () => {
    const result = forkTheme(current, forkId.trim(), forkName.trim(), knownIds)
    if (!result.ok) return setForkIssues(result.issues)
    setForkIssues([])
    setCurrent(result.theme)
    setForkId("")
    setForkName("")
    setNotice(`Forked "${result.theme.name}" (${result.theme.id}). Not saved yet.`)
  }

  const save = () => {
    const result = saveTheme(window.localStorage, saved, current, [canonical.id])
    if (!result.ok) return setNotice(`Not saved: ${describeIssues(result.issues)}${result.issues[0]?.ruleId === "workbench.save.reserved-id" ? " (fork first)" : ""}`)
    setSaved(result.saved)
    setNotice(`Saved "${current.name}" (${current.id}) locally.`)
  }

  const load = (id: string) => {
    const next = id === canonical.id ? canonical : saved.themes[id]
    if (next) setCurrent(next)
    setNotice("")
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <header className="lg:col-span-2">
        <h1 className="text-xl font-semibold">Personal UI Workbench</h1>
        <p className="text-sm text-muted-foreground">
          Editing <strong data-testid="theme-name">{current.name}</strong> (<code data-testid="theme-id">{current.id}</code>, revision{" "}
          <span data-testid="theme-revision">{current.revision}</span>) —{" "}
          <span data-testid="theme-status">{dirty ? "unsaved" : "saved"}</span>
        </p>
      </header>

      <div className="grid content-start gap-4">
        <Panel title="View">
          <div role="group" aria-label="Color mode" className="flex gap-2">
            {(["light", "dark"] as const).map((m) => (
              <Button key={m} variant={mode === m ? "default" : "outline"} aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === "light" ? "Light" : "Dark"}
              </Button>
            ))}
          </div>
          <div role="group" aria-label="Preview width" className="flex gap-2">
            {(Object.keys(WIDTHS) as Width[]).map((w) => (
              <Button key={w} variant={width === w ? "default" : "outline"} aria-pressed={width === w} onClick={() => setWidth(w)}>
                {w === "mobile" ? "Mobile" : "Desktop"} {WIDTHS[w]}
              </Button>
            ))}
          </div>
        </Panel>

        <Panel title="Edit color">
          <p className="text-sm text-muted-foreground">Edits the {mode} mode value through the structured setColor mutation.</p>
          <Field label="Token">
            <select className={selectClass} value={token} onChange={(e) => setToken(e.target.value as ColorToken)}>
              {COLOR_TOKENS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Value (oklch)">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} aria-invalid={editIssues.length > 0} spellCheck={false} />
          </Field>
          <Button onClick={applyEdit}>Apply edit</Button>
          {editIssues.length > 0 && (
            <Message testId="edit-error" tone="error">
              Rejected, not applied: {describeIssues(editIssues)}. Expected oklch(L C H [/ A]).
            </Message>
          )}
        </Panel>

        <Panel title="Themes">
          <Field label="Active theme">
            <select className={selectClass} value={knownIds.includes(current.id) ? current.id : ""} onChange={(e) => load(e.target.value)}>
              {!knownIds.includes(current.id) && <option value="">{current.name} (unsaved fork)</option>}
              {knownIds.map((id) => (
                <option key={id} value={id}>
                  {id === canonical.id ? `${canonical.name} (baseline)` : (saved.themes[id]?.name ?? id)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-2">
            <Field label="Fork id">
              <Input value={forkId} onChange={(e) => setForkId(e.target.value)} placeholder="my-theme" aria-invalid={forkIssues.length > 0} spellCheck={false} />
            </Field>
            <Field label="Fork name">
              <Input value={forkName} onChange={(e) => setForkName(e.target.value)} placeholder="My Theme" aria-invalid={forkIssues.length > 0} />
            </Field>
            <Button variant="secondary" onClick={fork}>
              Fork theme
            </Button>
            {forkIssues.length > 0 && (
              <Message testId="fork-error" tone="error">
                Fork rejected: {describeIssues(forkIssues)}. Ids are lowercase-hyphenated and unused; names are letters, digits, and spaces.
              </Message>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save}>Save theme</Button>
            <Button variant="outline" onClick={() => download(exportThemeJson(current))}>
              Export JSON
            </Button>
          </div>
          {notice && (
            <Message testId="notice" tone="ok">
              {notice}
            </Message>
          )}
        </Panel>
      </div>

      <div className="grid min-w-0 content-start gap-4">
        <Panel title="Preview">
          <div
            role="region"
            aria-label="Preview viewport"
            tabIndex={0}
            className="overflow-x-auto rounded-md border outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <iframe
              ref={iframeRef}
              title="Component preview"
              src="/?preview=1"
              data-testid="preview-frame"
              style={{ width: WIDTHS[width], height: 720, display: "block", border: 0 }}
            />
          </div>
        </Panel>

        <Panel title="Diff vs baseline">
          <p className="text-sm text-muted-foreground">
            Baseline: canonical <code>{canonical.id}</code> revision {canonical.revision}. <span data-testid="diff-count">{diff.length}</span> changed token
            {diff.length === 1 ? "" : "s"}.
          </p>
          {diff.length === 0 ? (
            <p className="text-sm" data-testid="diff-empty">
              No differences.
            </p>
          ) : (
            <ul data-testid="diff-list" className="grid gap-2 text-sm">
              {diff.map((entry) => (
                <li key={entry.path} data-path={entry.path} className="break-all">
                  <code>{entry.path}</code>: <code>{JSON.stringify(entry.baseline)}</code> → <code>{JSON.stringify(entry.current)}</code>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
