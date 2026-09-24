import { Tabs, TabsList, TabsTrigger, TabsContent } from "@personal-ui/ui/components/tabs"
import { Textarea } from "@personal-ui/ui/components/textarea"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@personal-ui/ui/components/resizable-panel"
import { ResponsiveDialog, ResponsiveDialogTrigger, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogClose } from "@personal-ui/ui/components/responsive-dialog"
import { editorBounds, initialPreviewWidth } from "./layout"
import * as React from "react"

import { applyProposal, COLOR_TOKENS, createProposalSession, diffThemeTokens, discardProposal, stageProposal } from "@personal-ui/core"
import type { ProposalError, ProposalSession } from "@personal-ui/core"
import type { ColorToken, Theme, ThemeOperation } from "@personal-ui/core"
import { Button } from "@personal-ui/ui/components/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { NativeSelect, NativeSelectOption } from "@personal-ui/ui/components/native-select"
import { Panel } from "@personal-ui/ui/components/panel"
import { SingleToggleGroup } from "@personal-ui/ui/components/single-toggle-group"

import { buildDesignCommandProposal, evaluateDesignCommandClient } from "./designCommand"
import {
  DEFAULT_THEME_ID,
  diffThemes,
  editTheme,
  exampleProposalJson,
  exportThemeJson,
  forkTheme,
  loadBuiltInThemes,
  parseProposalJson,
  previewVariablesCss,
} from "./lifecycle"
import type { Mode, WorkbenchIssue } from "./lifecycle"
import type { DesignCommandOutcome } from "@personal-ui/core"
import type { PreviewState } from "./messages"
import { loadSaved, saveSelection, saveTheme } from "./persistence"
import type { SavedThemes } from "./persistence"
import { buildFontOperation, buildShadowColorOperation, FONT_CONTROLS, formatFontStack, NUMERIC_CONTROLS, readShadowColor } from "./controls"
import type { NumericControlId } from "./controls"
import { ControlSection, LiveNumberField, LiveTextField } from "./LiveControls"
import type { ApplyManual } from "./LiveControls"

const WIDTHS = { mobile: 390, desktop: 1024 } as const
type Width = keyof typeof WIDTHS

const builtIns = loadBuiltInThemes()
const builtInIds = builtIns.map((theme) => theme.id)
const builtInById = (id: string) => builtIns.find((theme) => theme.id === id)
const defaultTheme = builtInById(DEFAULT_THEME_ID)!

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
  const [viewportWidth, setViewportWidth] = React.useState(window.innerWidth)
  const [mobileMode, setMobileMode] = React.useState("controls")
  const [category, setCategory] = React.useState("colors")
  const [forkOpen, setForkOpen] = React.useState(false)
  React.useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth)
    window.addEventListener("resize", resize)
    return () => window.removeEventListener("resize", resize)
  }, [])
  const desktop = viewportWidth >= 1024
  const bounds = editorBounds(viewportWidth)
  const forkIdId = React.useId()
  const forkNameId = React.useId()
  const proposalTextId = React.useId()
  const commandTextId = React.useId()
  const [saved, setSaved] = React.useState<SavedThemes>(() => loadSaved(window.localStorage, builtInIds))
  // Fresh state selects the built-in Default; a valid persisted selection (built-in or saved) is restored.
  const [current, setCurrent] = React.useState<Theme>(() => (saved.activeId ? (builtInById(saved.activeId) ?? saved.themes[saved.activeId]!) : defaultTheme))
  // The built-in a theme descends from: itself for a built-in, the recorded fork base for a saved theme.
  const [baselineId, setBaselineId] = React.useState(() => (saved.activeId ? (builtInById(saved.activeId)?.id ?? saved.bases[saved.activeId] ?? DEFAULT_THEME_ID) : DEFAULT_THEME_ID))
  const baseline = builtInById(baselineId) ?? defaultTheme
  // Manual controls may fire faster than React re-renders (slider drags); each edit builds on the latest active theme.
  const currentRef = React.useRef(current)
  currentRef.current = current
  const [mode, setMode] = React.useState<Mode>("light")
  const [width, setWidth] = React.useState<Width>(() => initialPreviewWidth(viewportWidth))

  const [token, setToken] = React.useState<ColorToken>("primary")
  const [forkId, setForkId] = React.useState("")
  const [forkName, setForkName] = React.useState("")
  const [forkIssues, setForkIssues] = React.useState<WorkbenchIssue[]>([])
  const [notice, setNotice] = React.useState("")
  // Proposal ids are single-use for this workbench session only; a reload starts a fresh ledger.
  const [session, setSession] = React.useState<ProposalSession>(createProposalSession)
  const [proposalText, setProposalText] = React.useState("")
  const [proposalIssues, setProposalIssues] = React.useState<WorkbenchIssue[]>([])
  const [proposalResult, setProposalResult] = React.useState("")
  const [commandText, setCommandText] = React.useState("")
  const [commandEvaluating, setCommandEvaluating] = React.useState(false)
  const [commandOutcome, setCommandOutcome] = React.useState<DesignCommandOutcome | null>(null)
  const [commandSeq, setCommandSeq] = React.useState(0)

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark")
  }, [mode])

  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const ready = React.useRef(false)
  // A staged candidate is previewed through the same iframe and CSS path without becoming the active theme.
  const staged = session.staged
  // While a proposal is staged, nothing that can change, replace, persist, or export the active theme is usable.
  // Locked while a proposal is staged, and also while a Design command evaluation is pending: the evaluation
  // captures `current`'s id/revision as the proposal's base only once the response resolves, so nothing that can
  // change `current` or `session` may run in between, or that captured base could race product state.
  const locked = staged !== null || commandEvaluating
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

  const diff = React.useMemo(() => diffThemes(baseline, current), [baseline, current])
  const savedCopy = saved.themes[current.id]
  const builtInCopy = builtInById(current.id)
  const status = builtInCopy ? (JSON.stringify(builtInCopy) === JSON.stringify(current) ? "built-in" : "edited built-in, fork to save") : savedCopy !== undefined && JSON.stringify(savedCopy) === JSON.stringify(current) ? "saved" : "unsaved"
  const knownIds = [...builtInIds, ...Object.keys(saved.themes)]

  /**
   * The one manual-edit path: control value -> typed operation -> core validation -> active in-memory theme -> preview.
   * No Apply step and no Save: a rejected value returns its issues and changes nothing; a value that changes no token
   * creates no revision. Blocked while a proposal is staged or a command is evaluating, so manual edits can never race
   * or blend into a proposal.
   */
  const applyManual: ApplyManual = (build: (theme: Theme) => ThemeOperation) => {
    if (locked) return [{ ruleId: "workbench.manual.locked", path: "" }]
    const latest = currentRef.current
    const result = editTheme(latest, build(latest))
    if (!result.ok) return result.issues
    if (diffThemeTokens(latest, result.theme).length === 0) return []
    currentRef.current = result.theme
    setCurrent(result.theme)
    setNotice("")
    return []
  }

  const showProposalErrors = (errors: ProposalError[]) => setProposalIssues(errors.map(({ ruleId, path }) => ({ ruleId, path })))

  const stage = () => {
    setProposalResult("")
    const parsed = parseProposalJson(proposalText)
    if (!parsed.ok) return setProposalIssues(parsed.issues)
    const result = stageProposal(session, current, parsed.value, new Date().toISOString())
    setSession(result.session)
    if (!result.ok) return showProposalErrors(result.errors)
    setProposalIssues([])
    setProposalResult(`Staged ${result.staged.proposal.proposalId}. Nothing is active until you apply it.`)
  }

  const applyStaged = () => {
    if (!staged) return
    const id = staged.proposal.proposalId
    const result = applyProposal(session, current, id, new Date().toISOString())
    setSession(result.session)
    if (!result.ok) {
      showProposalErrors(result.errors)
      return setProposalResult(result.session.records.find((record) => record.proposalId === id)?.status === "stale" ? `Proposal ${id} is stale; nothing was changed.` : "")
    }
    setProposalIssues([])
    setCurrent(result.theme!)
    setProposalResult(`Applied ${id}. Revision is now ${result.theme!.revision}; not saved yet.`)
    setNotice("")
  }

  const evaluateCommand = async () => {
    setCommandEvaluating(true)
    setCommandOutcome(null)
    const result = await evaluateDesignCommandClient(commandText, mode)
    if (result.outcome.kind !== "staged") {
      setCommandEvaluating(false)
      setCommandOutcome(result.outcome)
      return
    }
    // Everything mutating is locked from the moment evaluation started (see `locked`), so `current`/`session` here
    // are still exactly what they were when the request was issued: the captured base cannot have raced anything.
    const seq = commandSeq + 1
    setCommandSeq(seq)
    const proposal = buildDesignCommandProposal(commandText, result.outcome.operations, { themeId: current.id, revision: current.revision }, `design-command-${seq}`, new Date().toISOString())
    const staged = stageProposal(session, current, proposal, new Date().toISOString())
    setSession(staged.session)
    setCommandEvaluating(false)
    if (!staged.ok) {
      // The Jev-level outcome was "staged", but staging it against product state failed (e.g. a stale/duplicate
      // id): the visible command outcome must not go on claiming success once that has happened.
      showProposalErrors(staged.errors)
      setCommandOutcome({ kind: "rejected", reason: { code: staged.errors[0]?.ruleId ?? "proposal.invalid-proposal", path: staged.errors[0]?.path } })
      return
    }
    setCommandOutcome(result.outcome)
    setProposalIssues([])
    setProposalResult(`Staged ${staged.staged.proposal.proposalId} from a design command. Nothing is active until you apply it.`)
  }

  const discardStaged = () => {
    if (!staged) return
    const id = staged.proposal.proposalId
    const result = discardProposal(session, current, id, new Date().toISOString())
    setSession(result.session)
    setProposalIssues([])
    setProposalResult(result.ok ? `Discarded ${id}. Active theme unchanged.` : "")
  }

  const fork = () => {
    const result = forkTheme(current, forkId.trim(), forkName.trim(), knownIds)
    // A fork keeps the built-in it descends from as its baseline.
    if (!result.ok) return setForkIssues(result.issues)
    setForkIssues([])
    setForkOpen(false)
    setCurrent(result.theme)
    setForkId("")
    setForkName("")
    setNotice(`Forked "${result.theme.name}" (${result.theme.id}). Not saved yet.`)
  }

  const save = () => {
    const result = saveTheme(window.localStorage, saved, current, builtInIds, baselineId)
    if (!result.ok) return setNotice(`Not saved: ${describeIssues(result.issues)}${result.issues[0]?.ruleId === "workbench.save.reserved-id" ? " (fork first)" : ""}`)
    setSaved(result.saved)
    setNotice(`Saved "${current.name}" (${current.id}) locally.`)
  }

  const load = (id: string) => {
    const builtIn = builtInById(id)
    const next = builtIn ?? saved.themes[id]
    if (!next) return
    setCurrent(next)
    setBaselineId(builtIn ? builtIn.id : (saved.bases[id] ?? DEFAULT_THEME_ID))
    // Only the selection is persisted; selecting never saves theme data.
    setSaved(saveSelection(window.localStorage, saved, id))
    setNotice("")
  }

  const numeric = (id: NumericControlId) => <LiveNumberField key={`${current.id}-${id}`} id={id} control={NUMERIC_CONTROLS[id]} theme={current} disabled={locked} apply={applyManual} />
  const manualLockNote = locked ? (
    <p data-testid="manual-locked-note" className="text-sm text-muted-foreground">
      {commandEvaluating ? "Manual controls are paused while a design command is evaluated." : "Manual controls are paused until the staged proposal is applied or discarded. The preview shows the proposal, not your active theme."}
    </p>
  ) : null

  return (
    <div className="quiet-shell">
      <header className="quiet-header"><h1 className="text-sm font-semibold">Personal UI Workbench</h1><Button asChild variant="ghost" size="sm"><a href="https://github.com/talobski/personal-ui-system">GitHub ↗</a></Button></header>
      {notice && <div className="px-4 py-2"><Notice>{notice}</Notice></div>}
      <Tabs value={mobileMode} onValueChange={setMobileMode} className="quiet-modes" data-mode={mobileMode}>
        <TabsList className="quiet-mobile-tabs" aria-label="Workspace mode"><TabsTrigger value="controls">Controls</TabsTrigger><TabsTrigger value="preview">Preview</TabsTrigger></TabsList>
        {(staged || commandEvaluating) && <div className="quiet-status" role="status">{commandEvaluating ? "Evaluating design command…" : "Previewing a proposal · active theme unchanged"}
          <Button size="sm" variant="outline" onClick={() => { if (commandEvaluating) { setMobileMode("controls"); setCategory("command") } else { setMobileMode("preview"); requestAnimationFrame(() => document.getElementById("candidate-review")?.scrollIntoView()) } }}>Review changes</Button>
        </div>}
        <ResizablePanelGroup orientation="horizontal" disabled={!desktop} className="quiet-split">
          <ResizablePanel id="editor-panel" style={{ overflow: "hidden" }} defaultSize={352} minSize={desktop ? bounds.min : 0} maxSize={desktop ? bounds.max : "100%"} groupResizeBehavior="preserve-pixel-size">
            <TabsContent value="controls" forceMount className="quiet-editor" hidden={!desktop && mobileMode !== "controls"}>
              <div className="quiet-theme">          <Field>
            <FieldLabel htmlFor="theme-select">Active theme</FieldLabel>
            <NativeSelect id="theme-select" value={knownIds.includes(current.id) ? current.id : ""} disabled={locked} onChange={(e) => load(e.target.value)}>
              {!knownIds.includes(current.id) && <NativeSelectOption value="">{current.name} (unsaved fork)</NativeSelectOption>}
              {knownIds.map((id) => (
                <NativeSelectOption key={id} value={id}>
                  {builtInById(id) ? `${builtInById(id)!.name} (built-in)` : (saved.themes[id]?.name ?? id)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        <p className="text-sm text-muted-foreground">
          Editing <strong data-testid="theme-name">{current.name}</strong> (<code data-testid="theme-id">{current.id}</code>, revision{" "}
          <span data-testid="theme-revision">{current.revision}</span>) —{" "}
          <span data-testid="theme-status">{status}</span>
        </p>
</div>
              <Tabs value={category} onValueChange={setCategory}>
                <div className="quiet-category-select"><Field><FieldLabel htmlFor="editor-category">Editor category</FieldLabel><NativeSelect id="editor-category" value={category} onChange={e => setCategory(e.target.value)}><NativeSelectOption value="colors">Colors</NativeSelectOption><NativeSelectOption value="typography">Typography</NativeSelectOption><NativeSelectOption value="other">Other</NativeSelectOption><NativeSelectOption value="command">Command</NativeSelectOption></NativeSelect></Field></div>
                <TabsList className="quiet-categories" aria-label="Editor categories"><TabsTrigger value="colors">Colors</TabsTrigger><TabsTrigger value="typography">Typography</TabsTrigger><TabsTrigger value="other">Other</TabsTrigger><TabsTrigger value="command">Command</TabsTrigger></TabsList>
                <TabsContent value="colors" forceMount className="data-[state=inactive]:hidden"><Panel title="Edit color">
          <p className="text-sm text-muted-foreground">Edit one token in the {mode} palette. HEX, rgb(a), hsl(a), and oklch are accepted and stored as canonical oklch; valid values apply immediately.</p>
          {manualLockNote}
          <div aria-hidden="true" className="flex gap-2">{["primary", "secondary", "accent", "muted", "background", "foreground"].map(name => <span key={name} className="h-7 flex-1 rounded-sm border" style={{ background: current.colors[mode][name as ColorToken].$value }} />)}</div>
          <Field>
            <FieldLabel htmlFor="token-select">Token</FieldLabel>
            <NativeSelect id="token-select" value={token} disabled={locked} onChange={(e) => setToken(e.target.value as ColorToken)}>
              {COLOR_TOKENS.map((name) => (
                <NativeSelectOption key={name} value={name}>
                  {name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <LiveTextField
            key={`${current.id}-${mode}-${token}`}
            id="color-value"
            label="Color value"
            value={current.colors[mode][token].$value}
            build={(raw) => ({ op: "setColor", mode, token, value: raw })}
            hint="Expected HEX, rgb(a), hsl(a), or oklch inside the Display P3 gamut."
            disabled={locked}
            apply={applyManual}
            canonicalNote
          />
        </Panel></TabsContent>
                <TabsContent value="typography" forceMount className="data-[state=inactive]:hidden"><Panel title="Typography">
          <p className="text-sm text-muted-foreground">Changes apply immediately after validation. Font stacks are comma-separated, in fallback order.</p>
          {manualLockNote}
          <ControlSection id="fonts" title="Font families">
            {FONT_CONTROLS.map(({ family, label }) => (
              <LiveTextField
                key={`${current.id}-${family}`}
                id={`font-${family}`}
                label={label}
                value={formatFontStack(current.typography[family].$value)}
                build={(raw) => buildFontOperation(family, raw)}
                hint="Expected 1 to 16 comma-separated names of letters, digits, spaces, and hyphens."
                disabled={locked}
                apply={applyManual}
              />
            ))}
          </ControlSection>
          <ControlSection id="tracking" title="Letter spacing">
            {numeric("tracking")}
          </ControlSection>
        </Panel></TabsContent>
                <TabsContent value="other" forceMount className="data-[state=inactive]:hidden"><Panel title="Other">
          <p className="text-sm text-muted-foreground">Changes apply immediately after validation. Radius and shadow controls derive their full scales.</p>
          {manualLockNote}
          <ControlSection id="radius" title="Radius">
            {numeric("radius")}
          </ControlSection>
          <ControlSection id="spacing" title="Spacing">
            {numeric("spacing")}
            {numeric("density")}
          </ControlSection>
          <ControlSection id="shadow" title="Shadow">
            <LiveTextField
              key={`${current.id}-shadow-color`}
              id="shadow-color"
              label="Shadow color"
              value={readShadowColor(current)}
              build={buildShadowColorOperation}
              hint="Expected an opaque HEX, rgb, hsl, or oklch color; opacity is set separately."
              disabled={locked}
              apply={applyManual}
              canonicalNote
            />
            {numeric("shadowOpacity")}
            {numeric("shadowBlur")}
            {numeric("shadowSpread")}
            {numeric("shadowOffsetX")}
            {numeric("shadowOffsetY")}
          </ControlSection>
          <ControlSection id="motion" title="Motion">
            {numeric("motion")}
          </ControlSection>
        </Panel></TabsContent>
                <TabsContent value="command" forceMount className="data-[state=inactive]:hidden"><Panel title="Design command">
          <p className="text-sm text-muted-foreground">
            Describe a directional change (e.g. "make it denser and warmer"). One evaluation sends the command to Jev through the
            localhost product API; deterministic code composes any accepted judgments into a normal mutation proposal below. Nothing
            applies automatically.
          </p>
          <Field>
            <FieldLabel htmlFor={commandTextId}>Command</FieldLabel>
            <Textarea
              id={commandTextId}
              value={commandText}
              disabled={locked}
              onChange={(e) => setCommandText(e.target.value)}
              spellCheck={false}
              rows={2}
              data-testid="design-command-input"
              className="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
          <Button disabled={locked || commandText.trim().length === 0} onClick={evaluateCommand} data-testid="design-command-evaluate">
            {commandEvaluating ? "Evaluating…" : "Evaluate"}
          </Button>
          {commandEvaluating && (
            <p role="status" data-testid="design-command-pending" className="text-sm text-muted-foreground">
              Waiting on one Jev request…
            </p>
          )}
          {commandOutcome && (
            <div data-testid="design-command-outcome" data-outcome-kind={commandOutcome.kind} className="grid gap-2 text-sm">
              {commandOutcome.kind === "rejected" ? (
                <p role="status" data-testid="design-command-rejected">
                  Rejected: <code>{commandOutcome.reason.code}</code>. Nothing was staged or changed.
                </p>
              ) : (
                <>
                  <p role="status" data-testid={`design-command-${commandOutcome.kind}`}>
                    {commandOutcome.kind === "staged" && `Staged ${commandOutcome.operations.length} operation(s) from this command.`}
                    {commandOutcome.kind === "clarification-required" &&
                      {
                        ambiguous: "This command is contradictory or too vague to act on safely. Restate it more specifically.",
                        "command-kind-undecided": "Not confident this is a theme-adjustment command. Restate it more specifically.",
                        "needs-clarification-undecided": "Not confident this command is unambiguous. Restate it more specifically.",
                      }[commandOutcome.cause]}
                    {commandOutcome.kind === "unsupported" &&
                      (commandOutcome.cause === "out-of-scope"
                        ? "This command does not appear to ask for a theme adjustment."
                        : "No supported category (color, radius, density, typography, shadow, motion) was recognized in this command.")}
                  </p>
                  <details data-testid="design-command-evidence">
                    <summary>Typed evidence (recipe {commandOutcome.evidence.recipeCatalogVersion}, questions {commandOutcome.evidence.questionCatalogVersion})</summary>
                    <ul className="grid gap-1 pl-4">
                      <li data-testid="design-command-evidence-command-kind">
                        commandKind: <code>{commandOutcome.evidence.commandKindSelected}</code> (confidence {commandOutcome.evidence.commandKindConfidence.toFixed(2)}, probabilities{" "}
                        {Object.entries(commandOutcome.evidence.commandKindProbabilities)
                          .map(([id, p]) => `${id} ${p.toFixed(2)}`)
                          .join(", ")}
                        )
                      </li>
                      {commandOutcome.evidence.categories.map((entry) => (
                        <li key={entry.category} data-testid={`design-command-evidence-${entry.category}`}>
                          {entry.category}: <code>{entry.selected}</code> (confidence {entry.confidence.toFixed(2)}, {entry.targeted ? "targeted" : "not targeted"}, probabilities{" "}
                          {Object.entries(entry.probabilities)
                            .map(([id, p]) => `${id} ${p.toFixed(2)}`)
                            .join(", ")}
                          )
                        </li>
                      ))}
                      <li data-testid="design-command-evidence-strength">
                        strength: <code>{commandOutcome.evidence.strengthLabel}</code> (raw score {commandOutcome.evidence.strengthScore.toFixed(2)}, confidence{" "}
                        {commandOutcome.evidence.strengthConfidence.toFixed(2)}, probabilities{" "}
                        {Object.entries(commandOutcome.evidence.strengthProbabilities)
                          .map(([index, p]) => `${commandOutcome.evidence.strengthLegend[index]} ${p.toFixed(2)}`)
                          .join(", ")}
                        )
                      </li>
                      <li data-testid="design-command-evidence-clarification">
                        needsClarification: <code>{commandOutcome.evidence.needsClarificationValue.toFixed(2)}</code> ({commandOutcome.evidence.needsClarificationDecided ? "decided" : "undecided"})
                      </li>
                    </ul>
                  </details>
                </>
              )}
            </div>
          )}
        </Panel><div id="proposal-editor"><Panel title="Mutation proposal">
          <p className="text-sm text-muted-foreground">
            Paste one MutationProposalV1 (1 to 8 existing operations against one base). Staging previews the candidate without changing the active theme.
          </p>
          <Field data-invalid={proposalIssues.length > 0}>
            <FieldLabel htmlFor={proposalTextId}>Proposal JSON</FieldLabel>
            <Textarea
              id={proposalTextId}
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              aria-invalid={proposalIssues.length > 0}
              aria-describedby={proposalIssues.length > 0 ? `${proposalTextId}-error` : undefined}
              spellCheck={false}
              rows={8}
              className="w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 font-mono text-base md:text-xs shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
            />
            {proposalIssues.length > 0 && (
              <FieldError id={`${proposalTextId}-error`} data-testid="proposal-error">
                Rejected, not staged: {describeIssues(proposalIssues)}.
              </FieldError>
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={locked} onClick={stage}>
              Stage proposal
            </Button>
            <Button variant="outline" onClick={() => setProposalText(exampleProposalJson(current, `example-${session.records.length + 1}`))}>
              Insert example
            </Button>
          </div>
          {proposalResult && (
            <p data-testid="proposal-result" role="status" className="text-sm text-muted-foreground">
              {proposalResult}
            </p>
          )}
          {session.records.length > 0 && (
            <ul data-testid="proposal-log" className="grid gap-1 text-sm">
              {session.records.map(({ proposalId: id, status }) => (
                <li key={id} data-proposal-id={id} data-status={status}>
                  <code>{id}</code>: {status}
                </li>
              ))}
            </ul>
          )}
        </Panel></div></TabsContent>
              </Tabs>
              <div className="quiet-baseline">        <Panel title="Diff vs baseline">
          <p className="text-sm text-muted-foreground">
            Baseline: built-in <code>{baseline.id}</code> revision {baseline.revision}. <span data-testid="diff-count">{diff.length}</span> changed token
            {diff.length === 1 ? "" : "s"}.
          </p>
          {diff.length === 0 ? (
            <p className="text-sm" data-testid="diff-empty">
              No differences.
            </p>
          ) : (
            <details id="baseline-details"><summary className="cursor-pointer text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">View baseline diff</summary><ul data-testid="diff-list" className="grid gap-2 text-sm">
              {diff.map((entry) => (
                <li key={entry.path} data-path={entry.path} className="break-all">
                  <code>{entry.path}</code>: <code>{JSON.stringify(entry.baseline)}</code> → <code>{JSON.stringify(entry.current)}</code>
                </li>
              ))}
            </ul></details>
          )}
        </Panel>
</div>
              <div className="p-4"><ResponsiveDialog open={forkOpen} onOpenChange={setForkOpen}><ResponsiveDialogTrigger asChild><Button variant="outline" disabled={locked}>Fork theme</Button></ResponsiveDialogTrigger><ResponsiveDialogContent><ResponsiveDialogHeader><ResponsiveDialogTitle>Fork theme</ResponsiveDialogTitle><ResponsiveDialogDescription>Create a named local draft. Save remains a separate action.</ResponsiveDialogDescription></ResponsiveDialogHeader><div className="px-4 sm:px-0">          <FieldGroup className="gap-3">
            <Field data-invalid={forkIssues.length > 0}>
              <FieldLabel htmlFor={forkIdId}>Fork id</FieldLabel>
              <Input
                id={forkIdId}
                value={forkId}
                disabled={locked}
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
                disabled={locked}
                onChange={(e) => setForkName(e.target.value)}
                placeholder="My Theme"
                aria-invalid={forkIssues.length > 0}
                aria-describedby={forkIssues.length > 0 ? `${forkIdId}-error` : undefined}
              />
            </Field>
            <Button variant="secondary" disabled={locked} onClick={fork}>
              Fork theme
            </Button>
            {forkIssues.length > 0 && (
              <FieldError id={`${forkIdId}-error`} data-testid="fork-error">
                Fork rejected: {describeIssues(forkIssues)}. Ids are lowercase-hyphenated and unused; names are letters, digits, and spaces.
              </FieldError>
            )}
          </FieldGroup>
</div><ResponsiveDialogFooter><ResponsiveDialogClose asChild><Button variant="outline">Cancel</Button></ResponsiveDialogClose></ResponsiveDialogFooter></ResponsiveDialogContent></ResponsiveDialog></div>
            </TabsContent>
          </ResizablePanel>
          <ResizableHandle aria-label="Resize editor" className="quiet-handle" disabled={!desktop} />
          <ResizablePanel id="preview-panel" style={{ overflow: "hidden" }} minSize={desktop ? 632 : 0}>
            <TabsContent value="preview" forceMount className="quiet-preview" hidden={!desktop && mobileMode !== "preview"}>
              <div className="quiet-toolbar">          <SingleToggleGroup
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

                <Button variant="outline" onClick={() => { setMobileMode("controls"); setCategory("command"); requestAnimationFrame(() => document.getElementById(proposalTextId)?.focus()) }}>Proposal JSON</Button>          <div className="flex flex-wrap gap-2">
            <Button disabled={locked} onClick={save}>
              Save theme
            </Button>
            <Button variant="outline" disabled={locked} onClick={() => download(exportThemeJson(current))}>
              Export JSON
            </Button>
          </div>

              </div>

              <div id="candidate-review">        {staged && (
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
              <p data-testid="proposal-locked-note">Manual controls, loading, forking, saving, and exporting the active theme are disabled until this proposal is applied or discarded.</p>
              <details><summary className="cursor-pointer">Candidate operations</summary><pre className="overflow-x-auto text-xs">{JSON.stringify(staged.proposal.operations, null, 2)}</pre></details>
              {(current.id !== staged.proposal.base.themeId || current.revision !== staged.proposal.base.revision) && (
                <p data-testid="proposal-base-moved" role="status">
                  The active theme has moved since staging. Apply will mark this proposal stale and change nothing.
                </p>
              )}
              <ul data-testid="proposal-diff-list" className="grid gap-2">
                {staged.evaluation.diff.map((entry) => (
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

</div>
              <div className="quiet-preview-body">          <div
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
</div>
            </TabsContent>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Tabs>
    </div>
  )
}
