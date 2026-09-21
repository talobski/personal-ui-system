import * as React from "react"

import { applyProposal, COLOR_TOKENS, createProposalSession, discardProposal, stageProposal } from "@personal-ui/core"
import type { ProposalError, ProposalSession } from "@personal-ui/core"
import type { ColorToken, Theme } from "@personal-ui/core"
import { Button } from "@personal-ui/ui/components/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@personal-ui/ui/components/native-select"
import { Panel } from "@personal-ui/ui/components/panel"
import { SingleToggleGroup } from "@personal-ui/ui/components/single-toggle-group"

import {
  diffProposal,
  diffThemes,
  editColor,
  editTheme,
  exampleProposalJson,
  exportThemeJson,
  forkTheme,
  loadCanonicalTheme,
  parseProposalJson,
  previewVariablesCss,
} from "./lifecycle"
import type { Mode, WorkbenchIssue } from "./lifecycle"
import type { PreviewState } from "./messages"
import { loadSaved, saveTheme } from "./persistence"
import type { SavedThemes } from "./persistence"
import { SETTING_IDS, SETTINGS } from "./settings"
import type { SettingId } from "./settings"

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

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p data-testid="notice" role="status" className="text-sm text-muted-foreground">
      {children}
    </p>
  )
}

export function App() {
  const editId = React.useId()
  const settingValueId = React.useId()
  const forkIdId = React.useId()
  const forkNameId = React.useId()
  const proposalTextId = React.useId()
  const [saved, setSaved] = React.useState<SavedThemes>(() => loadSaved(window.localStorage))
  const [current, setCurrent] = React.useState<Theme>(() => (saved.activeId ? saved.themes[saved.activeId]! : canonical))
  const [mode, setMode] = React.useState<Mode>("light")
  const [width, setWidth] = React.useState<Width>("mobile")

  const [token, setToken] = React.useState<ColorToken>("primary")
  const [draft, setDraft] = React.useState("")
  const [editIssues, setEditIssues] = React.useState<WorkbenchIssue[]>([])
  const [setting, setSetting] = React.useState<SettingId>("radius")
  const [settingDraft, setSettingDraft] = React.useState("")
  const [settingIssues, setSettingIssues] = React.useState<WorkbenchIssue[]>([])
  const [forkId, setForkId] = React.useState("")
  const [forkName, setForkName] = React.useState("")
  const [forkIssues, setForkIssues] = React.useState<WorkbenchIssue[]>([])
  const [notice, setNotice] = React.useState("")
  // Proposal ids are single-use for this workbench session only; a reload starts a fresh ledger.
  const [session, setSession] = React.useState<ProposalSession>(createProposalSession)
  const [proposalText, setProposalText] = React.useState("")
  const [proposalIssues, setProposalIssues] = React.useState<WorkbenchIssue[]>([])
  const [proposalResult, setProposalResult] = React.useState("")

  const currentValue = current.modes[mode].color[token].$value
  // The draft follows the active theme/mode/token; a rejected draft is never active state.
  React.useEffect(() => {
    setDraft(currentValue)
    setEditIssues([])
  }, [currentValue, token, mode, current.id])

  const settingValue = SETTINGS[setting].read(current)
  React.useEffect(() => {
    setSettingDraft(settingValue)
    setSettingIssues([])
  }, [settingValue, setting, current.id])

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark")
  }, [mode])

  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const ready = React.useRef(false)
  // A staged candidate is previewed through the same iframe and CSS path without becoming the active theme.
  const staged = session.staged
  const previewTheme = staged?.candidate ?? current
  const previewState = React.useMemo<PreviewState>(
    () => ({ type: "workbench-preview-state", css: previewVariablesCss(previewTheme), mode, themeId: previewTheme.id, revision: previewTheme.revision }),
    [previewTheme, mode]
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

  const applySetting = () => {
    const result = editTheme(current, SETTINGS[setting].build(settingDraft.trim()))
    if (!result.ok) return setSettingIssues(result.issues)
    setSettingIssues([])
    setCurrent(result.theme)
    setNotice("")
  }

  const showProposalErrors = (errors: ProposalError[]) => setProposalIssues(errors.map(({ ruleId, path }) => ({ ruleId, path })))

  const stage = () => {
    setProposalResult("")
    const parsed = parseProposalJson(proposalText)
    if (!parsed.ok) return setProposalIssues(parsed.issues)
    const result = stageProposal(session, current, parsed.value)
    setSession(result.session)
    if (!result.ok) return showProposalErrors(result.errors)
    setProposalIssues([])
    setProposalResult(`Staged ${result.staged.proposal.proposalId}. Nothing is active until you apply it.`)
  }

  const applyStaged = () => {
    if (!staged) return
    const id = staged.proposal.proposalId
    const result = applyProposal(session, current, id)
    setSession(result.session)
    if (!result.ok) {
      showProposalErrors(result.errors)
      return setProposalResult(result.session.outcomes.get(id) === "stale" ? `Proposal ${id} is stale; nothing was changed.` : "")
    }
    setProposalIssues([])
    setCurrent(result.theme!)
    setProposalResult(`Applied ${id}. Revision is now ${result.theme!.revision}; not saved yet.`)
    setNotice("")
  }

  const discardStaged = () => {
    if (!staged) return
    const id = staged.proposal.proposalId
    const result = discardProposal(session, id)
    setSession(result.session)
    setProposalIssues([])
    setProposalResult(result.ok ? `Discarded ${id}. Active theme unchanged.` : "")
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
          <SingleToggleGroup
            label="Color mode"
            value={mode}
            onValueChange={setMode}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
          <SingleToggleGroup
            label="Preview width"
            value={width}
            onValueChange={setWidth}
            options={(Object.keys(WIDTHS) as Width[]).map((w) => ({ value: w, label: `${w === "mobile" ? "Mobile" : "Desktop"} ${WIDTHS[w]}` }))}
          />
        </Panel>

        <Panel title="Edit color">
          <p className="text-sm text-muted-foreground">Edits the {mode} mode value through the structured setColor mutation.</p>
          <Field>
            <FieldLabel htmlFor="token-select">Token</FieldLabel>
            <NativeSelect id="token-select" value={token} onChange={(e) => setToken(e.target.value as ColorToken)}>
              {COLOR_TOKENS.map((name) => (
                <NativeSelectOption key={name} value={name}>
                  {name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={editIssues.length > 0}>
            <FieldLabel htmlFor={editId}>Value (oklch)</FieldLabel>
            <Input
              id={editId}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={editIssues.length > 0}
              aria-describedby={editIssues.length > 0 ? `${editId}-error` : undefined}
              spellCheck={false}
            />
            {editIssues.length > 0 && (
              <FieldError id={`${editId}-error`} data-testid="edit-error">
                Rejected, not applied: {describeIssues(editIssues)}. Expected oklch(L C H [/ A]).
              </FieldError>
            )}
          </Field>
          <Button onClick={applyEdit}>Apply edit</Button>
        </Panel>

        <Panel title="Edit theme settings">
          <p className="text-sm text-muted-foreground">Edits one representative value per remaining category through the structured mutation API.</p>
          <Field>
            <FieldLabel htmlFor="setting-select">Setting</FieldLabel>
            <NativeSelect id="setting-select" value={setting} onChange={(e) => setSetting(e.target.value as SettingId)}>
              {SETTING_IDS.map((id) => (
                <NativeSelectOption key={id} value={id}>
                  {SETTINGS[id].label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field data-invalid={settingIssues.length > 0}>
            <FieldLabel htmlFor={settingValueId}>Setting value</FieldLabel>
            <Input
              id={settingValueId}
              value={settingDraft}
              onChange={(e) => setSettingDraft(e.target.value)}
              aria-invalid={settingIssues.length > 0}
              aria-describedby={settingIssues.length > 0 ? `${settingValueId}-error` : undefined}
              spellCheck={false}
            />
            {settingIssues.length > 0 && (
              <FieldError id={`${settingValueId}-error`} data-testid="setting-error">
                Rejected, not applied: {describeIssues(settingIssues)}. {SETTINGS[setting].hint}
              </FieldError>
            )}
          </Field>
          <Button onClick={applySetting}>Apply setting</Button>
        </Panel>

        <Panel title="Mutation proposal">
          <p className="text-sm text-muted-foreground">
            Paste one MutationProposalV1 (1 to 8 existing operations against one base). Staging previews the candidate without changing the active theme.
          </p>
          <Field data-invalid={proposalIssues.length > 0}>
            <FieldLabel htmlFor={proposalTextId}>Proposal JSON</FieldLabel>
            <textarea
              id={proposalTextId}
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              aria-invalid={proposalIssues.length > 0}
              aria-describedby={proposalIssues.length > 0 ? `${proposalTextId}-error` : undefined}
              spellCheck={false}
              rows={8}
              className="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
            />
            {proposalIssues.length > 0 && (
              <FieldError id={`${proposalTextId}-error`} data-testid="proposal-error">
                Rejected, not staged: {describeIssues(proposalIssues)}.
              </FieldError>
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button onClick={stage}>Stage proposal</Button>
            <Button variant="outline" onClick={() => setProposalText(exampleProposalJson(current, `example-${session.outcomes.size + 1}`))}>
              Insert example
            </Button>
          </div>
          {proposalResult && (
            <p data-testid="proposal-result" role="status" className="text-sm text-muted-foreground">
              {proposalResult}
            </p>
          )}
          {session.outcomes.size > 0 && (
            <ul data-testid="proposal-log" className="grid gap-1 text-sm">
              {[...session.outcomes].map(([id, status]) => (
                <li key={id} data-proposal-id={id} data-status={status}>
                  <code>{id}</code>: {status}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Themes">
          <Field>
            <FieldLabel htmlFor="theme-select">Active theme</FieldLabel>
            <NativeSelect id="theme-select" value={knownIds.includes(current.id) ? current.id : ""} onChange={(e) => load(e.target.value)}>
              {!knownIds.includes(current.id) && <NativeSelectOption value="">{current.name} (unsaved fork)</NativeSelectOption>}
              {knownIds.map((id) => (
                <NativeSelectOption key={id} value={id}>
                  {id === canonical.id ? `${canonical.name} (baseline)` : (saved.themes[id]?.name ?? id)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <FieldGroup className="gap-3">
            <Field data-invalid={forkIssues.length > 0}>
              <FieldLabel htmlFor={forkIdId}>Fork id</FieldLabel>
              <Input
                id={forkIdId}
                value={forkId}
                onChange={(e) => setForkId(e.target.value)}
                placeholder="my-theme"
                aria-invalid={forkIssues.length > 0}
                aria-describedby={forkIssues.length > 0 ? `${forkIdId}-error` : undefined}
                spellCheck={false}
              />
            </Field>
            <Field data-invalid={forkIssues.length > 0}>
              <FieldLabel htmlFor={forkNameId}>Fork name</FieldLabel>
              <Input
                id={forkNameId}
                value={forkName}
                onChange={(e) => setForkName(e.target.value)}
                placeholder="My Theme"
                aria-invalid={forkIssues.length > 0}
                aria-describedby={forkIssues.length > 0 ? `${forkIdId}-error` : undefined}
              />
            </Field>
            <Button variant="secondary" onClick={fork}>
              Fork theme
            </Button>
            {forkIssues.length > 0 && (
              <FieldError id={`${forkIdId}-error`} data-testid="fork-error">
                Fork rejected: {describeIssues(forkIssues)}. Ids are lowercase-hyphenated and unused; names are letters, digits, and spaces.
              </FieldError>
            )}
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button onClick={save}>Save theme</Button>
            <Button variant="outline" onClick={() => download(exportThemeJson(current))}>
              Export JSON
            </Button>
          </div>
          {notice && <Notice>{notice}</Notice>}
        </Panel>
      </div>

      <div className="grid min-w-0 content-start gap-4">
        {staged && (
          <Panel title="Staged proposal">
            <div data-testid="proposal-staged" data-proposal-id={staged.proposal.proposalId} className="grid gap-3 text-sm">
              <p>
                <code>{staged.proposal.proposalId}</code> from {staged.proposal.provenance.source} (<code>{staged.proposal.provenance.sourceId}</code>) at{" "}
                {staged.proposal.provenance.createdAt}.
                {staged.proposal.provenance.intentSummary && <> Intent: {staged.proposal.provenance.intentSummary}</>}
              </p>
              <p>
                Base <code>{staged.proposal.base.themeId}</code> revision {staged.proposal.base.revision}; {staged.proposal.operations.length} operation
                {staged.proposal.operations.length === 1 ? "" : "s"} produce one candidate at revision{" "}
                <span data-testid="proposal-candidate-revision">{staged.candidate.revision}</span>. The preview below shows the candidate; the active theme is
                unchanged.
              </p>
              {(current.id !== staged.proposal.base.themeId || current.revision !== staged.proposal.base.revision) && (
                <p data-testid="proposal-base-moved" role="status">
                  The active theme has moved since staging. Apply will mark this proposal stale and change nothing.
                </p>
              )}
              <ul data-testid="proposal-diff-list" className="grid gap-2">
                {diffProposal(current, staged.candidate).map((entry) => (
                  <li key={entry.path} data-path={entry.path} className="break-all">
                    <code>{entry.path}</code>: <code>{JSON.stringify(entry.before)}</code> → <code>{JSON.stringify(entry.after)}</code>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button onClick={applyStaged}>Apply proposal</Button>
                <Button variant="outline" onClick={discardStaged}>
                  Discard proposal
                </Button>
              </div>
            </div>
          </Panel>
        )}

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
