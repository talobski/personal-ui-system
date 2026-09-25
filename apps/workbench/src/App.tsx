import * as React from "react"
import { Download, Save } from "@personal-ui/ui/lib/workbench-icons"

import { applyProposal, createProposalSession, diffThemeTokens, discardProposal, stageProposal } from "@personal-ui/core"
import type { ProposalError, ProposalSession } from "@personal-ui/core"
import type { Theme, ThemeOperation } from "@personal-ui/core"
import { Button } from "@personal-ui/ui/components/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { Label } from "@personal-ui/ui/components/label"
import { Panel } from "@personal-ui/ui/components/panel"
import { ResponsiveDialog, ResponsiveDialogTrigger, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogClose } from "@personal-ui/ui/components/responsive-dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@personal-ui/ui/components/select"
import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@personal-ui/ui/components/sidebar"
import { Switch } from "@personal-ui/ui/components/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@personal-ui/ui/components/tabs"
import { Textarea } from "@personal-ui/ui/components/textarea"

import { buildDesignCommandProposal, evaluateDesignCommandClient } from "./designCommand"
import {
  createCustomTheme,
  DEFAULT_THEME_ID,
  editTheme,
  exportThemeJson,
  loadBuiltInThemes,
  previewVariablesCss,
} from "./lifecycle"
import type { Mode, WorkbenchIssue } from "./lifecycle"
import type { DesignCommandOutcome } from "@personal-ui/core"
import type { PreviewState } from "./messages"
import { deleteTheme, loadSaved, saveSelection, saveTheme } from "./persistence"
import type { SavedThemes } from "./persistence"
import { buildShadowColorOperation, COLOR_GROUPS, colorTokenLabel, FONT_CONTROLS, NUMERIC_CONTROLS, readShadowColor } from "./controls"
import type { NumericControlId } from "./controls"
import { FIELD_LABEL_CLASS, ControlSection, LiveColorField, LiveFontField, LiveNumberField, LiveTextField } from "./LiveControls"
import type { ApplyManual } from "./LiveControls"

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

/** The four identifying colours of a theme, in the current colour mode. Decorative: the theme name is the label. */
const SWATCH_TOKENS = ["primary", "accent", "secondary", "border"] as const

function ThemeSwatches({ theme, mode }: { theme: Theme; mode: Mode }) {
  return (
    <span aria-hidden="true" data-testid="theme-swatches" data-theme-id={theme.id} className="flex shrink-0 items-center gap-0.5">
      {SWATCH_TOKENS.map((token) => (
        <span key={token} data-token={token} className="h-2.5 w-2.5 rounded-sm ring-1 ring-border" style={{ backgroundColor: theme.colors[mode][token].$value }} />
      ))}
    </span>
  )
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

/** Opens the command editor while a command evaluates, otherwise closes the mobile sidebar and shows the staged review. */
function ReviewChangesButton({ evaluating, showCommand }: { evaluating: boolean; showCommand: () => void }) {
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        if (evaluating) {
          showCommand()
          if (isMobile) setOpenMobile(true)
          else setOpen(true)
          return
        }
        setOpenMobile(false)
        requestAnimationFrame(() => document.getElementById("candidate-review")?.scrollIntoView())
      }}
    >
      Review changes
    </Button>
  )
}

export function App() {
  const [category, setCategory] = React.useState("colors")
  const saveAsNameId = React.useId()
  const saveAsFormId = React.useId()
  const commandTextId = React.useId()
  const [saved, setSaved] = React.useState<SavedThemes>(() => loadSaved(window.localStorage, builtInIds))
  // Fresh state selects the built-in Default; a valid persisted selection (built-in or saved) is restored.
  const [current, setCurrent] = React.useState<Theme>(() => (saved.activeId ? (builtInById(saved.activeId) ?? saved.themes[saved.activeId]!) : defaultTheme))
  // Manual controls may fire faster than React re-renders (slider drags); each edit builds on the latest active theme.
  const currentRef = React.useRef(current)
  currentRef.current = current
  const [mode, setMode] = React.useState<Mode>("light")

  const [saveAsOpen, setSaveAsOpen] = React.useState(false)
  const [saveAsName, setSaveAsName] = React.useState("")
  const [saveAsIssues, setSaveAsIssues] = React.useState<WorkbenchIssue[]>([])
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [notice, setNotice] = React.useState("")
  // Proposal ids are single-use for this workbench session only; a reload starts a fresh ledger.
  const [session, setSession] = React.useState<ProposalSession>(createProposalSession)
  const [proposalIssues, setProposalIssues] = React.useState<WorkbenchIssue[]>([])
  const [proposalResult, setProposalResult] = React.useState("")
  const [commandText, setCommandText] = React.useState("")
  const [commandEvaluating, setCommandEvaluating] = React.useState(false)
  const [commandOutcome, setCommandOutcome] = React.useState<DesignCommandOutcome | null>(null)
  const [commandSeq, setCommandSeq] = React.useState(0)

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark")
  }, [mode])

  // Workbench chrome renders the canonical active theme's variables; it never shows a staged candidate.
  const activeCss = React.useMemo(() => previewVariablesCss(current), [current])

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

  const savedCopy = saved.themes[current.id]
  const builtInCopy = builtInById(current.id)
  const status = builtInCopy ? (JSON.stringify(builtInCopy) === JSON.stringify(current) ? "built-in" : "built-in, edited") : savedCopy !== undefined && JSON.stringify(savedCopy) === JSON.stringify(current) ? "custom, saved" : "custom, unsaved changes"
  const savedIds = Object.keys(saved.themes)
  const knownIds = [...builtInIds, ...savedIds]

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

  /**
   * Save. A built-in is immutable, so saving one opens Save As (the trigger's default action); a custom theme is
   * updated in place. The persisted base records which built-in a custom theme descends from.
   */
  const save = (event: React.MouseEvent) => {
    if (builtInCopy) {
      setSaveAsName(`${current.name} Custom`)
      setSaveAsIssues([])
      return
    }
    event.preventDefault()
    const result = saveTheme(window.localStorage, saved, current, builtInIds, saved.bases[current.id] ?? DEFAULT_THEME_ID)
    if (!result.ok) return setNotice(`Not saved: ${describeIssues(result.issues)}`)
    setSaved(result.saved)
    setNotice(`Saved "${current.name}" locally.`)
  }

  const saveAs = (event: React.FormEvent) => {
    event.preventDefault()
    if (locked || !builtInCopy) return
    const copy = createCustomTheme(current, saveAsName, knownIds)
    if (!copy.ok) return setSaveAsIssues(copy.issues)
    const result = saveTheme(window.localStorage, saved, copy.theme, builtInIds, builtInCopy.id)
    if (!result.ok) return setSaveAsIssues(result.issues)
    setSaved(result.saved)
    setCurrent(copy.theme)
    setSaveAsIssues([])
    setSaveAsOpen(false)
    setNotice(`Saved "${copy.theme.name}" as a custom theme. ${builtInCopy.name} is unchanged.`)
  }

  /**
   * Deletes the active custom theme after confirmation: its saved theme and base record are removed and the built-in
   * Default becomes (and is persisted as) the active theme. Built-ins never reach this path.
   */
  const deleteActive = () => {
    if (locked || builtInCopy || !Object.hasOwn(saved.themes, current.id)) return
    const name = current.name
    const result = deleteTheme(window.localStorage, saved, current.id, DEFAULT_THEME_ID)
    if (!result.ok) return setNotice(`Not deleted: ${describeIssues(result.issues)}`)
    setSaved(result.saved)
    currentRef.current = defaultTheme
    setCurrent(defaultTheme)
    setDeleteOpen(false)
    setNotice(`Deleted "${name}". ${defaultTheme.name} is now active.`)
  }

  const load = (id: string) => {
    const next = builtInById(id) ?? saved.themes[id]
    if (!next) return
    setCurrent(next)
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
  const themeSelectItems = [
    { label: "Built-in", items: builtIns.map((theme) => ({ value: theme.id, label: theme.name })) },
    ...(savedIds.length > 0
      ? [{ label: "Custom", items: savedIds.map((id) => ({ value: id, label: saved.themes[id]!.name })) }]
      : []),
  ]
  // A row shows each theme's own colours; the active row and trigger follow the live (possibly edited) active theme.
  const rowTheme = (id: string) => (id === current.id ? current : (builtInById(id) ?? saved.themes[id]!))
  const activeCustom = !builtInCopy && Object.hasOwn(saved.themes, current.id)

  return (
    <SidebarProvider className="quiet-shell" data-theme-status={status} style={{ "--sidebar-width": "22rem" } as React.CSSProperties}>
      <style id="workbench-active-theme" data-theme-id={current.id} data-revision={current.revision}>{activeCss}</style>
      <Sidebar>
        <SidebarHeader className="p-4 pb-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <Select items={themeSelectItems} value={current.id} disabled={locked} onValueChange={(id) => { if (id && id !== current.id) load(id) }}>
                <SelectTrigger id="theme-select" aria-label="Active theme" className="quiet-theme-trigger h-12 w-full cursor-pointer border-0 bg-transparent px-0 font-medium shadow-none hover:bg-accent hover:text-accent-foreground data-[popup-open]:bg-accent dark:bg-transparent dark:hover:bg-accent group-has-data-[sidebar=menu-action]/menu-item:pr-11">
                  <SelectValue>
                    <ThemeSwatches theme={current} mode={mode} />
                    <span className="truncate">{current.name}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false} sideOffset={0}>
                  <SelectGroup>
                    <SelectLabel>Built-in</SelectLabel>
                    {builtIns.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id} className="cursor-pointer">
                        <ThemeSwatches theme={rowTheme(theme.id)} mode={mode} />
                        {theme.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {savedIds.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Custom</SelectLabel>
                      {savedIds.map((id) => (
                        <SelectItem key={id} value={id} className="cursor-pointer">
                          <ThemeSwatches theme={rowTheme(id)} mode={mode} />
                          {saved.themes[id]!.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              {activeCustom && (
                <ResponsiveDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  <ResponsiveDialogTrigger asChild>
                    <SidebarMenuAction aria-label={`Delete ${current.name}`} data-testid="delete-theme" disabled={locked} className="top-1/2 right-2 size-8 -translate-y-1/2 cursor-pointer disabled:pointer-events-none disabled:opacity-50">
                      <TrashIcon />
                    </SidebarMenuAction>
                  </ResponsiveDialogTrigger>
                  <ResponsiveDialogContent>
                    <ResponsiveDialogHeader>
                      <ResponsiveDialogTitle>Delete custom theme?</ResponsiveDialogTitle>
                      <ResponsiveDialogDescription>
                        “{current.name}” is removed from this browser, including unsaved edits. {defaultTheme.name} becomes the active theme. This cannot be undone.
                      </ResponsiveDialogDescription>
                    </ResponsiveDialogHeader>
                    <ResponsiveDialogFooter>
                      <Button variant="destructive" onClick={deleteActive}>Delete theme</Button>
                      <ResponsiveDialogClose asChild><Button variant="outline">Cancel</Button></ResponsiveDialogClose>
                    </ResponsiveDialogFooter>
                  </ResponsiveDialogContent>
                </ResponsiveDialog>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="quiet-editor quiet-scroll" data-testid="sidebar-content">
          <Tabs value={category} onValueChange={setCategory} className="gap-0">
            <SidebarGroup className="sticky top-0 z-10 bg-card p-4">
              <TabsList className="quiet-categories w-full" aria-label="Editor categories"><TabsTrigger value="colors" className="text-xs">Colors</TabsTrigger><TabsTrigger value="typography" className="text-xs">Typography</TabsTrigger><TabsTrigger value="other" className="text-xs">Other</TabsTrigger><TabsTrigger value="command" className="text-xs">Command</TabsTrigger></TabsList>
            </SidebarGroup>
                <TabsContent className="data-[state=inactive]:hidden" value="colors" forceMount><div className="grid gap-6 px-4 pb-4">
          {manualLockNote}
          {COLOR_GROUPS.map((group) => (
            <ControlSection key={group.id} id={`colors-${group.id}`} title={group.title}>
              {group.tokens.map((token) => (
                <LiveColorField
                  key={`${current.id}-${mode}-${token}`}
                  id={`color-${token}`}
                  label={colorTokenLabel(token)}
                  value={current.colors[mode][token].$value}
                  build={(raw) => ({ op: "setColor", mode, token, value: raw })}
                  disabled={locked}
                  apply={applyManual}
                />
              ))}
            </ControlSection>
          ))}
        </div></TabsContent>
                <TabsContent className="data-[state=inactive]:hidden" value="typography" forceMount><div className="grid gap-6 px-4 pb-4">
          {manualLockNote}
          <ControlSection id="fonts" title="Font families">
            {FONT_CONTROLS.map(({ family, label }) => (
              <LiveFontField
                key={`${current.id}-${family}`}
                id={`font-${family}`}
                category={family}
                label={label}
                stack={current.typography[family].$value}
                defaultStack={defaultTheme.typography[family].$value}
                disabled={locked}
                apply={applyManual}
              />
            ))}
          </ControlSection>
          <ControlSection id="tracking" title="Letter spacing">
            {numeric("tracking")}
          </ControlSection>
        </div></TabsContent>
                <TabsContent className="data-[state=inactive]:hidden" value="other" forceMount><div className="grid gap-6 px-4 pb-4">
          {manualLockNote}
          <ControlSection id="radius" title="Radius">
            {numeric("radius")}
          </ControlSection>
          <ControlSection id="spacing" title="Spacing">
            {numeric("spacing")}
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
        </div></TabsContent>
                <TabsContent className="data-[state=inactive]:hidden" value="command" forceMount><div className="grid gap-6 px-4 pb-4">
          <Field>
            <FieldDescription id={`${commandTextId}-help`}>Changes are staged for review; nothing applies automatically.</FieldDescription>
            <FieldLabel htmlFor={commandTextId} className={FIELD_LABEL_CLASS}>Command</FieldLabel>
            <Textarea
              id={commandTextId}
              aria-describedby={`${commandTextId}-help`}
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
          {proposalIssues.length > 0 && <FieldError data-testid="proposal-error">Proposal rejected: {describeIssues(proposalIssues)}.</FieldError>}
          {proposalResult && <p data-testid="proposal-result" role="status" className="text-sm text-muted-foreground">{proposalResult}</p>}
        </div></TabsContent>
          </Tabs>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="quiet-preview">
        <h1 className="sr-only">Personal UI Workbench</h1>
        <div data-testid="workbench-toolbar" className="flex shrink-0 flex-wrap items-center gap-2 border-b p-4">
          <SidebarTrigger className="size-8" />
          <div className="flex items-center gap-2">
            <Switch id="color-mode-switch" checked={mode === "dark"} onCheckedChange={(checked) => setMode(checked ? "dark" : "light")} />
            <Label htmlFor="color-mode-switch">Dark mode</Label>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" disabled={locked} onClick={() => download(exportThemeJson(current))}>
              <Download aria-hidden="true" />
              Export JSON
            </Button>
                  <ResponsiveDialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
                    <ResponsiveDialogTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={locked} onClick={save}>
                        <Save aria-hidden="true" />
                        Save
                      </Button>
                    </ResponsiveDialogTrigger>
                    <ResponsiveDialogContent>
                      <ResponsiveDialogHeader>
                        <ResponsiveDialogTitle>Save as a custom theme</ResponsiveDialogTitle>
                        <ResponsiveDialogDescription>{builtInCopy?.name ?? "This built-in"} is built in and stays unchanged. Your edits are saved locally under a new name.</ResponsiveDialogDescription>
                      </ResponsiveDialogHeader>
                      <form id={saveAsFormId} onSubmit={saveAs} className="px-4 sm:px-0" noValidate>
                        <Field data-invalid={saveAsIssues.length > 0}>
                          <FieldLabel htmlFor={saveAsNameId}>Theme name</FieldLabel>
                          <Input
                            id={saveAsNameId}
                            value={saveAsName}
                            onChange={(e) => setSaveAsName(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                            aria-invalid={saveAsIssues.length > 0}
                            aria-describedby={saveAsIssues.length > 0 ? `${saveAsNameId}-error` : undefined}
                          />
                          {saveAsIssues.length > 0 && (
                            <FieldError id={`${saveAsNameId}-error`} data-testid="save-as-error">
                              {saveAsIssues[0]?.ruleId === "workbench.save-as.invalid-name"
                                ? "Enter a name of 1 to 80 letters, digits, and spaces."
                                : `Not saved: ${describeIssues(saveAsIssues)}.`}
                            </FieldError>
                          )}
                        </Field>
                      </form>
                      <ResponsiveDialogFooter>
                        <Button type="submit" form={saveAsFormId}>Save theme</Button>
                        <ResponsiveDialogClose asChild><Button variant="outline">Cancel</Button></ResponsiveDialogClose>
                      </ResponsiveDialogFooter>
                    </ResponsiveDialogContent>
                  </ResponsiveDialog>
          </div>
        </div>
        {notice && <div className="px-4 py-2"><Notice>{notice}</Notice></div>}
        {(staged || commandEvaluating) && (
          <div className="quiet-status" role="status" data-testid="staged-status">
            {commandEvaluating ? "Evaluating design command…" : "Preview shows a staged proposal, not yet active · Workbench shows your active theme"}
            <ReviewChangesButton evaluating={commandEvaluating} showCommand={() => setCategory("command")} />
          </div>
        )}
        <div id="candidate-review">
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
              <p data-testid="proposal-locked-note">Manual controls, theme selection, saving, and exporting the active theme are disabled until this proposal is applied or discarded.</p>
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
        <div className="quiet-preview-body">
          <div role="region" aria-label="Preview viewport" tabIndex={0} className="quiet-viewport outline-none focus-visible:ring-inset focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <iframe ref={iframeRef} title="Component preview" src="/?preview=1" data-testid="preview-frame" className="block size-full border-0" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
