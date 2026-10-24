import * as React from "react"
import { Code2, Copy, Moon, Redo2, RotateCcw, Save, Sun, Trash, Undo2 } from "@personal-ui/ui/lib/workbench-icons"

import { applyProposal, createProposalSession, discardProposal, isSidebarColorToken, resolveUiEffects, stageProposal } from "@personal-ui/core"
import type { ProposalError, ProposalSession } from "@personal-ui/core"
import type { Theme, ThemeOperation } from "@personal-ui/core"
import { Button, buttonVariants } from "@personal-ui/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@personal-ui/ui/components/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { Panel } from "@personal-ui/ui/components/panel"
import { ResponsiveDialog, ResponsiveDialogTrigger, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogClose } from "@personal-ui/ui/components/responsive-dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@personal-ui/ui/components/select"
import { Sidebar, SidebarContent, SidebarGroup, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@personal-ui/ui/components/sidebar"
import { ScrollArea } from "@personal-ui/ui/components/scroll-area"
import { Switch } from "@personal-ui/ui/components/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@personal-ui/ui/components/tabs"
import { Textarea } from "@personal-ui/ui/components/textarea"
import { Toast } from "@personal-ui/ui/lib/toast"

import { buildDesignCommandProposal, evaluateDesignCommandClient } from "./designCommand"
import {
  createCustomTheme,
  DEFAULT_THEME_ID,
  editTheme,
  exportThemeAgentPrompt,
  exportThemeCss,
  exportThemeJson,
  loadBuiltInThemes,
  previewVariablesCss,
} from "./lifecycle"
import type { Mode, WorkbenchIssue } from "./lifecycle"
import type { DesignCommandOutcome } from "@personal-ui/core"
import type { PreviewState } from "./messages"
import { deleteTheme, loadSaved, saveSelection, saveTheme } from "./persistence"
import type { SavedThemes } from "./persistence"
import { buildShadowColorOperation, colorTokenLabel, EDITOR_COLOR_GROUPS, NUMERIC_CONTROLS, readEditorColor, readFontStack, readShadowColor, TYPE_ROLE_GROUPS } from "./controls"
import type { NumericControlId } from "./controls"
import { EMPTY_TRACK, isDirty, record, redo, reset, sameDesign, undo } from "./history"
import type { HistoryStep, HistoryTrack } from "./history"
import { FIELD_LABEL_CLASS, ControlSection, LiveColorField, LiveFontField, LiveNumberField, SidebarTokensSwitch, UiEffectsFields } from "./LiveControls"
import type { ApplyManual, EndGesture } from "./LiveControls"

import { ColorPickerController } from "./colorPicker"
import { replacePath, workbenchPathFor } from "./routes"
import { CATEGORY_TRIGGER_CLASS } from "./workbenchTabs"
import { WorkbenchTooltip, WorkbenchTooltipProvider } from "./WorkbenchTooltip"

const builtIns = loadBuiltInThemes()
const builtInIds = builtIns.map((theme) => theme.id)
const builtInById = (id: string) => builtIns.find((theme) => theme.id === id)
const defaultTheme = builtInById(DEFAULT_THEME_ID)!

const describeIssues = (issues: WorkbenchIssue[]) => issues.map((i) => `${i.ruleId} at ${i.path || "(root)"}`).join("; ")

/**
 * Radix Tabs activates on mousedown, so the outgoing panel is hidden before the browser moves focus to the pressed
 * trigger. When focus was inside that panel, the mobile Sidebar sheet (Base UI Dialog, `restoreFocus: "popup"`) sees it
 * lost to the body and refocuses the sheet, again one frame later, which can steal focus from the next control. Taking
 * focus on the trigger first keeps focus on the visible tab; keyboard activation and roving focus are unchanged.
 * `focusVisible: false` matches the browser's own pointer focus, so a click still shows no focus ring.
 */
const focusCategoryTrigger = (event: React.MouseEvent<HTMLButtonElement>) => {
  if (event.button === 0) event.currentTarget.focus({ focusVisible: false })
}

/** PUI-134/PUI-138: one generated code value for the selected format; its `content` is previewed and copied unchanged. */
type ExportFormat = "json" | "css" | "prompt"
type ExportFile = { filename: string; content: string }

function exportFile(theme: Theme, format: ExportFormat): ExportFile {
  if (format === "prompt") {
    const { filename, prompt } = exportThemeAgentPrompt(theme)
    return { filename, content: prompt }
  }
  if (format === "css") {
    const { filename, css } = exportThemeCss(theme)
    return { filename, content: css }
  }
  const { filename, json } = exportThemeJson(theme)
  return { filename, content: json }
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p data-testid="notice" role="status" className="text-sm text-muted-foreground">
      {children}
    </p>
  )
}

/** The one reset toast: re-adding it updates it in place and restarts its timer, so resets never stack. */
const RESET_TOAST_ID = "workbench-reset"
/** Long enough to reach Undo; Base UI also pauses the timer while the toast is hovered or focused. */
const RESET_TOAST_TIMEOUT = 8000
/** PUI-136: routine theme-action successes share one toast that updates in place, on Base UI's default timeout. */
const SUCCESS_TOAST_ID = "workbench-success"

/**
 * PUI-115 / PUI-136: transient Workbench feedback (Reset, and routine Save, Save As and Delete success) on the official shadcn Base UI toast recipe, built on the installed Base UI
 * Toast primitive with semantic tokens only. The viewport is portalled and fixed at the bottom-right, so a toast never
 * enters document flow or moves Workbench content. It announces politely and never takes focus (F6 or Tab reaches it);
 * Escape, Dismiss or its timeout closes it, and closing changes no history.
 */
function WorkbenchToasts() {
  const { toasts, close } = Toast.useToastManager()
  return (
    <Toast.Portal>
      <Toast.Viewport data-testid="toast-viewport" className="fixed right-4 bottom-4 z-100 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 outline-none">
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            toast={toast}
            data-testid={toast.id === RESET_TOAST_ID ? "reset-toast" : "success-toast"}
            className="rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg transition-[opacity,translate] duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 motion-reduce:transition-none"
          >
            <Toast.Content className="grid gap-3">
              <div className="grid gap-1">
                <Toast.Title className="text-sm font-medium" />
                <Toast.Description className="text-sm text-muted-foreground" />
              </div>
              <div className="flex justify-end gap-2">
                {/* Base UI's Toast.Close is aria-hidden until the stack is hovered or focused; Dismiss stays reachable. */}
                <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => close(toast.id)}>Dismiss</Button>
                <Toast.Action className={buttonVariants({ variant: "outline", size: "sm", className: "cursor-pointer" })} />
              </div>
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
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

/** Opens the command editor while a command evaluates, otherwise closes the mobile sidebar and shows the staged review. */
/** The one short toolbar group divider, shared so every group boundary (mode | history | code/save) matches. */
function ToolbarSeparator() {
  return <div role="separator" aria-orientation="vertical" className="h-8 w-px shrink-0 bg-border" />
}

const EXPORT_FORMATS: readonly { value: ExportFormat; label: string }[] = [
  { value: "json", label: "JSON" },
  { value: "css", label: "CSS / Tailwind v4" },
  { value: "prompt", label: "Agent Prompt" },
]

/**
 * PUI-134/PUI-138: Code opens this Theme code dialog; it never downloads. The code panel is one bordered surface: a slim
 * toolbar with Copy on the right, then the shared ScrollArea viewport. Preview and Copy use the one generated value for
 * the selected format, regenerated when the format changes.
 */
function ThemeCodeDialog({ theme, disabled, onOpen }: { theme: Theme; disabled: boolean; onOpen: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [format, setFormat] = React.useState<ExportFormat>("json")
  const [copyStatus, setCopyStatus] = React.useState<"idle" | "copied" | "failed">("idle")
  const file = React.useMemo(() => (open ? exportFile(theme, format) : null), [open, theme, format])
  React.useEffect(() => setCopyStatus("idle"), [file])
  React.useEffect(() => {
    if (copyStatus !== "copied") return
    const timer = window.setTimeout(() => setCopyStatus("idle"), 2000)
    return () => window.clearTimeout(timer)
  }, [copyStatus])

  const copy = async () => {
    if (!file) return
    try {
      await navigator.clipboard.writeText(file.content)
      setCopyStatus("copied")
    } catch {
      setCopyStatus("failed")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          onOpen()
          setFormat("json")
        }
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        {/* Below 640px the recovery group needs the room: Code and Save keep their names but show only their icons. */}
        <Button variant="ghost" size="sm" className="cursor-pointer max-sm:w-8 max-sm:px-0" title="Code" disabled={disabled}>
          <Code2 aria-hidden="true" className="size-3.5" />
          <span className="max-sm:sr-only">Code</span>
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="export-dialog" className="flex max-h-[calc(100dvh-2rem)] min-w-0 flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle><span className="type-heading">Theme code</span></DialogTitle>
          <DialogDescription>Copy your theme as JSON, Tailwind CSS or a prompt for a coding agent.</DialogDescription>
        </DialogHeader>
        <Tabs value={format} onValueChange={(value) => setFormat(value as ExportFormat)} className="min-h-0 min-w-0 flex-1 gap-3">
          <TabsList aria-label="Code format" className="w-max max-w-full">
            {EXPORT_FORMATS.map(({ value, label }) => (
              <TabsTrigger key={value} value={value} className="cursor-pointer">{label}</TabsTrigger>
            ))}
          </TabsList>
          {EXPORT_FORMATS.map(({ value, label }) => (
            // The panel itself is not a tab stop: Copy, then the scrollable code viewport, follow the format tabs.
            <TabsContent key={value} value={value} tabIndex={-1} data-testid="export-code-panel" className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-md border bg-muted">
              {file && value === format && (
                <>
                  {/* The toolbar keeps the dialog surface, so its muted status text keeps the accepted foreground/background pair. */}
                  <div data-testid="export-code-toolbar" className="flex min-h-9 shrink-0 items-center gap-2 border-b bg-background py-1 pr-1 pl-3">
                    <p role="status" data-testid="export-copy-status" className={`min-w-0 flex-1 text-xs ${copyStatus === "failed" ? "text-destructive" : "text-muted-foreground"}`}>
                      {copyStatus === "copied" && "Copied to clipboard."}
                      {copyStatus === "failed" && "Could not copy. Select the preview text and copy it manually."}
                    </p>
                    <Button variant="ghost" size="sm" className="shrink-0 cursor-pointer" onClick={copy}>
                      <Copy aria-hidden="true" className="size-3.5" />
                      Copy
                    </Button>
                  </div>
                  <ScrollArea
                    type="auto"
                    orientation="both"
                    data-testid="export-preview-scroll"
                    className="flex min-h-0 min-w-0 flex-1 flex-col"
                    viewportProps={{ role: "region", "aria-label": `${label} code`, tabIndex: 0, className: "min-h-0 flex-1 focus-visible:ring-inset" }}
                  >
                    <pre data-testid="export-preview" data-format={format} data-filename={file.filename} className="w-max min-w-full p-3 font-mono text-xs leading-relaxed whitespace-pre text-foreground">
                      <code>{file.content}</code>
                    </pre>
                  </ScrollArea>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function ReviewChangesButton({ evaluating, showCommand }: { evaluating: boolean; showCommand: () => void }) {
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  return (
    <Button
      size="sm"
      variant="outline"
      className="cursor-pointer"
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

/**
 * `routeThemeId` is the built-in named by `/workbench/themes/:slug`, or null at plain `/workbench`. On initial load it
 * takes precedence over the stored selection without writing it: the URL selects, local storage is unchanged.
 */
export function App({ routeThemeId = null }: { routeThemeId?: string | null }) {
  const [category, setCategory] = React.useState("colors")
  const saveAsNameId = React.useId()
  const saveAsFormId = React.useId()
  const commandTextId = React.useId()
  const [saved, setSaved] = React.useState<SavedThemes>(() => loadSaved(window.localStorage, builtInIds))
  // A built-in named by the URL wins on initial load (PUI-144). Otherwise fresh state selects the built-in Default and a
  // valid persisted selection (built-in or saved) is restored.
  const [current, setCurrent] = React.useState<Theme>(() => (routeThemeId !== null ? builtInById(routeThemeId) : undefined) ?? (saved.activeId ? (builtInById(saved.activeId) ?? saved.themes[saved.activeId]!) : defaultTheme))
  // Manual controls may fire faster than React re-renders (slider drags); each edit builds on the latest active theme.
  const currentRef = React.useRef(current)
  currentRef.current = current
  const [mode, setMode] = React.useState<Mode>("light")

  // Session-local history (PUI-3): one track per theme id, plus the in-session working state of every theme that is not
  // active, so switching restores each theme's own working state and history. Never persisted; a reload clears both.
  const tracksRef = React.useRef<Readonly<Record<string, HistoryTrack>>>({})
  const [tracks, setTracks] = React.useState(tracksRef.current)
  const working = React.useRef<Readonly<Record<string, Theme>>>({})
  // The open manual gesture (a slider drag or one text-draft focus session) and the theme it started from.
  const gesture = React.useRef<{ key: string; base: Theme } | null>(null)
  const [resetOpen, setResetOpen] = React.useState(false)
  // PUI-115: the reset toast's manager and the exact post-reset state its Undo may reverse (theme id and revision).
  const [toasts] = React.useState(() => Toast.createToastManager())
  const resetUndo = React.useRef<{ themeId: string; revision: number } | null>(null)
  const undoResetRef = React.useRef(() => {})

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
  // The durable baseline: the immutable built-in fixture, or a custom theme's last saved snapshot. Dirty compares design
  // values only, so an Undo back to the baseline is clean again even though its revision moved on.
  const baseline = builtInCopy ?? savedCopy
  const dirty = baseline === undefined || isDirty(current, baseline)
  const status = builtInCopy ? (dirty ? "built-in, edited" : "built-in") : savedCopy !== undefined && !dirty ? "custom, saved" : "custom, unsaved changes"
  const track = tracks[current.id] ?? EMPTY_TRACK
  const savedIds = Object.keys(saved.themes)
  const knownIds = [...builtInIds, ...savedIds]

  const setActive = (theme: Theme) => {
    currentRef.current = theme
    setCurrent(theme)
  }
  const trackOf = (id: string) => tracksRef.current[id] ?? EMPTY_TRACK
  const writeTracks = (next: Readonly<Record<string, HistoryTrack>>) => {
    tracksRef.current = next
    setTracks(next)
  }
  const writeTrack = (id: string, next: HistoryTrack) => writeTracks({ ...tracksRef.current, [id]: next })
  const without = <T,>(map: Readonly<Record<string, T>>, ...ids: string[]) => Object.fromEntries(Object.entries(map).filter(([key]) => !ids.includes(key)))

  /** Closes the open gesture: one history checkpoint from its captured base when the design changed. */
  const endManualGesture: EndGesture = () => {
    const open = gesture.current
    if (!open) return
    gesture.current = null
    const now = currentRef.current
    if (now.id === open.base.id) writeTrack(now.id, record(trackOf(now.id), open.base, now))
  }

  // The controller is shared by every semantic and shadow picker. Its callbacks always use this render's
  // authoritative refs, while a generation rejects timers invalidated by completion or a lifecycle change.
  const pickerCallbacks = React.useRef({ begin: (_key: string) => {}, end: () => {} })
  const [picker] = React.useState(() => new ColorPickerController(
    key => pickerCallbacks.current.begin(key),
    () => pickerCallbacks.current.end(),
  ))
  pickerCallbacks.current = {
    begin: key => {
      endManualGesture()
      if (!locked) gesture.current = { key, base: currentRef.current }
    },
    end: endManualGesture,
  }
  const endGesture: EndGesture = () => {
    picker.finish()
    endManualGesture()
  }
  React.useEffect(() => () => picker.cancel(), [picker])
  React.useLayoutEffect(() => { if (locked) picker.cancel() }, [locked, picker])

  /**
   * The one manual-edit path: control value -> typed operation -> core validation -> active in-memory theme -> preview.
   * No Apply step and no Save: a rejected value returns its issues and changes nothing; a value that changes no token
   * creates no revision and no history. A committed edit is one history checkpoint (and clears Redo); a gesture step
   * is rebuilt from the gesture's base, so a drag or typing session advances the revision once and records one
   * checkpoint when it ends. Blocked while a proposal is staged or a command is evaluating, so manual edits can never
   * race or blend into a proposal.
   */
  const applyManual: ApplyManual = (build: (theme: Theme) => ThemeOperation, key?: string) => {
    if (locked) return [{ ruleId: "workbench.manual.locked", path: "" }]
    if (key === undefined || gesture.current?.key !== key) endGesture()
    if (key !== undefined && gesture.current === null) gesture.current = { key, base: currentRef.current }
    const base = key === undefined ? currentRef.current : gesture.current!.base
    const result = editTheme(base, build(base))
    if (!result.ok) return result.issues
    const unchanged = sameDesign(base, result.theme)
    // A gesture step is rebuilt from the gesture base, so returning to the base value must not move the live revision
    // backwards past a debounced step that already reached the preview.
    if (key !== undefined) setActive({ ...(unchanged ? base : result.theme), revision: Math.max(currentRef.current.revision, unchanged ? base.revision : result.theme.revision) })
    else if (!unchanged) {
      writeTrack(base.id, record(trackOf(base.id), base, result.theme))
      setActive(result.theme)
    } else return []
    setNotice("")
    return []
  }

  /** Undo / Redo / Reset: one revalidated history transition that always advances the revision. */
  const stepHistory = (step: (track: HistoryTrack, theme: Theme) => HistoryStep | null) => {
    if (locked) return false
    endGesture()
    const theme = currentRef.current
    const next = step(trackOf(theme.id), theme)
    if (!next) return false
    writeTrack(theme.id, next.track)
    setActive(next.theme)
    setNotice("")
    return true
  }
  const undoEdit = () => stepHistory(undo)
  const redoEdit = () => stepHistory(redo)
  /**
   * PUI-115: Reset reports through one floating toast instead of the inline notice. Its Undo is the toolbar's own
   * history Undo, allowed only while the active theme is still exactly the post-reset state (same id and revision, no
   * proposal lock), so the reset is the newest checkpoint. Any later edit, Undo/Redo, theme switch or lock closes the
   * toast instead (see the effect below), so it can never reverse a different history step.
   */
  const resetToBaseline = () => {
    if (!baseline) return
    if (stepHistory((history, theme) => reset(history, theme, baseline))) {
      const target = { themeId: currentRef.current.id, revision: currentRef.current.revision }
      resetUndo.current = target
      toasts.add({
        id: RESET_TOAST_ID,
        title: builtInCopy ? `Reset to ${builtInCopy.name}` : "Reset to last saved",
        description: builtInCopy ? "Theme restored to its built-in values." : "Theme restored to its last saved values.",
        timeout: RESET_TOAST_TIMEOUT,
        actionProps: { children: "Undo", onClick: () => undoResetRef.current() },
        onClose: () => { if (resetUndo.current === target) resetUndo.current = null },
      })
    }
    setResetOpen(false)
  }
  undoResetRef.current = () => {
    const target = resetUndo.current
    const now = currentRef.current
    resetUndo.current = null
    toasts.close(RESET_TOAST_ID)
    if (target && !locked && now.id === target.themeId && now.revision === target.revision) stepHistory(undo)
  }
  React.useEffect(() => {
    const target = resetUndo.current
    if (target && (locked || current.id !== target.themeId || current.revision !== target.revision)) {
      resetUndo.current = null
      toasts.close(RESET_TOAST_ID)
    }
  }, [current.id, current.revision, locked, toasts])

  /**
   * PUI-136: routine theme-action success (Save, Save As, Delete) is one transient toast on the shared surface instead of
   * a persistent inline notice; failures keep the inline notice or field error. Opening Theme code adds no feedback.
   */
  const showSuccess = (title: string, description?: string) => toasts.add({ id: SUCCESS_TOAST_ID, title, description })

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
    // Apply is one atomic, undoable history checkpoint; staging and Discard never touch history.
    writeTrack(current.id, record(trackOf(current.id), current, result.theme!))
    setActive(result.theme!)
    setProposalResult(`Applied ${id}. Revision is now ${result.theme!.revision}; not saved yet.`)
    setNotice("")
  }

  const evaluateCommand = async () => {
    // Flushing may land a pending picker write synchronously, so the base is read from the ref, not this render.
    endGesture()
    const commandBase = currentRef.current
    setCommandEvaluating(true)
    setCommandOutcome(null)
    const result = await evaluateDesignCommandClient(commandText, mode)
    if (result.outcome.kind !== "staged") {
      setCommandEvaluating(false)
      setCommandOutcome(result.outcome)
      return
    }
    // Everything mutating is locked from the moment evaluation started (see `locked`), so `commandBase`/`session` here
    // are still exactly what they were when the request was issued: the captured base cannot have raced anything.
    const seq = commandSeq + 1
    setCommandSeq(seq)
    const proposal = buildDesignCommandProposal(commandText, result.outcome.operations, { themeId: commandBase.id, revision: commandBase.revision }, `design-command-${seq}`, new Date().toISOString())
    const staged = stageProposal(session, commandBase, proposal, new Date().toISOString())
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
    endGesture()
    if (builtInCopy) {
      setSaveAsName(`${current.name} Custom`)
      setSaveAsIssues([])
      return
    }
    event.preventDefault()
    // Saving re-baselines the durable snapshot; session history is kept, so Undo after Save makes the theme dirty again.
    const result = saveTheme(window.localStorage, saved, currentRef.current, builtInIds, saved.bases[current.id] ?? DEFAULT_THEME_ID)
    if (!result.ok) return setNotice(`Not saved: ${describeIssues(result.issues)}`)
    setSaved(result.saved)
    setNotice("")
    showSuccess("Theme saved")
  }

  const saveAs = (event: React.FormEvent) => {
    event.preventDefault()
    if (locked || !builtInCopy) return
    const copy = createCustomTheme(current, saveAsName, knownIds)
    if (!copy.ok) return setSaveAsIssues(copy.issues)
    const result = saveTheme(window.localStorage, saved, copy.theme, builtInIds, builtInCopy.id)
    if (!result.ok) return setSaveAsIssues(result.issues)
    setSaved(result.saved)
    // The new custom theme starts a clean track; the immutable source built-in returns to its canonical fixture with a
    // clean track, since its edits now live in the copy.
    working.current = without(working.current, builtInCopy.id, copy.theme.id)
    writeTracks(without(tracksRef.current, builtInCopy.id, copy.theme.id))
    setActive(copy.theme)
    setSaveAsIssues([])
    setSaveAsOpen(false)
    setNotice("")
    showSuccess("Theme saved as custom theme")
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
    const fallback = working.current[DEFAULT_THEME_ID] ?? defaultTheme
    working.current = without(working.current, current.id, DEFAULT_THEME_ID)
    writeTracks(without(tracksRef.current, current.id))
    setActive(fallback)
    setDeleteOpen(false)
    setNotice("")
    showSuccess("Theme deleted", `“${name}” was removed. ${defaultTheme.name} is now active.`)
  }

  /**
   * Switching keeps each theme's in-session working state and history: leaving stores it, returning restores it.
   * `persist: false` is a URL-driven switch (browser back/forward), which never writes the stored selection.
   */
  const load = (id: string, persist = true) => {
    endGesture()
    const leaving = currentRef.current
    const next = working.current[id] ?? builtInById(id) ?? saved.themes[id]
    if (!next) return
    working.current = { ...without(working.current, id), [leaving.id]: leaving }
    setActive(next)
    // Only the selection is persisted; selecting never saves theme data.
    if (persist) setSaved(saveSelection(window.localStorage, saved, id))
    setNotice("")
  }

  /**
   * PUI-144: the address bar follows the active theme without adding history entries. A built-in's stable path becomes
   * current when it becomes active (selection, Delete's Default fallback); a local custom theme has no shareable URL,
   * so it makes plain `/workbench` current. The initially loaded path is left as it was opened.
   */
  const syncedThemeId = React.useRef(current.id)
  React.useEffect(() => {
    if (syncedThemeId.current === current.id) return
    syncedThemeId.current = current.id
    replacePath(workbenchPathFor(current.id))
  }, [current.id])
  // Back/forward onto another built-in's path while the Workbench stays mounted selects it like the initial load: no
  // stored-selection write, and every theme keeps its in-session working state and history. A staged or evaluating
  // proposal keeps the active theme, so the address bar returns to it.
  React.useEffect(() => {
    if (routeThemeId === null || routeThemeId === currentRef.current.id) return
    if (locked) replacePath(workbenchPathFor(currentRef.current.id))
    else load(routeThemeId, false)
  }, [routeThemeId])

  const numeric = (id: NumericControlId, labelPrefix?: string) => <LiveNumberField key={`${current.id}-${id}`} id={id} control={NUMERIC_CONTROLS[id]} labelPrefix={labelPrefix} theme={current} disabled={locked} apply={applyManual} endGesture={endGesture} />
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
  const rowTheme = (id: string) => (id === current.id ? current : (working.current[id] ?? builtInById(id) ?? saved.themes[id]!))
  const activeCustom = !builtInCopy && Object.hasOwn(saved.themes, current.id)

  return (
    <WorkbenchTooltipProvider>
    <SidebarProvider className="quiet-shell" data-theme-status={status} style={{ "--sidebar-width": "28rem" } as React.CSSProperties}>
      <style id="workbench-active-theme" data-theme-id={current.id} data-revision={current.revision}>{activeCss}</style>
      <Sidebar>
        {/* A fixed 64px row whose bottom edge meets the 64px preview toolbar; header px-2 plus selector px-2 = 16px inset. */}
        <SidebarHeader className="h-16 shrink-0 flex-row items-center border-b px-2 py-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <Select items={themeSelectItems} value={current.id} disabled={locked} onValueChange={(id) => { if (id && id !== current.id) load(id) }}>
                <SelectTrigger id="theme-select" aria-label="Active theme" data-tactile="flat" className="quiet-control quiet-theme-trigger h-12 w-full cursor-pointer border-0 bg-transparent px-2 font-medium shadow-none hover:bg-accent hover:text-accent-foreground data-[popup-open]:bg-accent dark:bg-transparent dark:hover:bg-accent">
                  <SelectValue>
                    <ThemeSwatches theme={current} mode={mode} />
                    <span className="truncate font-medium">{current.name}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false} sideOffset={0}>
                  <SelectGroup>
                    <SelectLabel>Built-in</SelectLabel>
                    {builtIns.map((theme) => (
                      <SelectItem key={theme.id} value={theme.id} className="cursor-pointer">
                        <ThemeSwatches theme={rowTheme(theme.id)} mode={mode} />
                        <span className="font-medium">{theme.name}</span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {savedIds.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Custom</SelectLabel>
                      {savedIds.map((id) => (
                        <SelectItem key={id} value={id} className="cursor-pointer">
                          <ThemeSwatches theme={rowTheme(id)} mode={mode} />
                          <span className="font-medium">{saved.themes[id]!.name}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent className="quiet-editor overflow-hidden" data-testid="sidebar-content">
          <Tabs value={category} onValueChange={setCategory} className="min-h-0 w-full min-w-0 flex-1 gap-0">
            {/* The horizontal owner spans the full sidebar width; the 16px inset lives inside its scrollable content. */}
            <SidebarGroup className="shrink-0 bg-sidebar p-0">
              <ScrollArea orientation="horizontal" type="auto" className="quiet-scroll-area w-full min-w-0 max-w-full overflow-hidden" viewportProps={{ role: "region", "aria-label": "Editor category navigation", tabIndex: 0 }}>
                <div data-testid="category-inset" className="w-max p-4">
                  {/* PUI-120: the default surface list (36px, 3px padding) keeps the accepted 29px triggers, radius, py-1 and type. */}
                  <TabsList className="w-max flex-nowrap justify-start" aria-label="Editor categories">
                    <TabsTrigger value="colors" className={CATEGORY_TRIGGER_CLASS} onMouseDown={focusCategoryTrigger}>Colors</TabsTrigger>
                    <TabsTrigger value="typography" className={CATEGORY_TRIGGER_CLASS} onMouseDown={focusCategoryTrigger}>Typography</TabsTrigger>
                    <TabsTrigger value="geometry" className={CATEGORY_TRIGGER_CLASS} onMouseDown={focusCategoryTrigger}>Geometry</TabsTrigger>
                    {/* Visible label only: the internal value stays `other`. */}
                    <TabsTrigger value="other" className={CATEGORY_TRIGGER_CLASS} onMouseDown={focusCategoryTrigger}>Effects</TabsTrigger>
                    <TabsTrigger value="command" className={CATEGORY_TRIGGER_CLASS} onMouseDown={focusCategoryTrigger}>Command</TabsTrigger>
                  </TabsList>
                </div>
              </ScrollArea>
            </SidebarGroup>
            <ScrollArea type="auto" className="quiet-scroll-area min-h-0 flex-1" data-testid="editor-scroll" viewportProps={{ role: "region", "aria-label": "Theme editor", tabIndex: 0 }}>
                <TabsContent className="data-[state=inactive]:hidden" value="colors" forceMount><div className="grid gap-6 px-4 pb-4">
          {manualLockNote}
          {EDITOR_COLOR_GROUPS.map((group) => (
            <ControlSection key={group.id} id={`colors-${group.id}`} title={group.title}>
              {group.id === "sidebar" && <SidebarTokensSwitch enabled={current.sidebar.useDedicatedTokens.$value} disabled={locked} apply={applyManual} />}
              {group.tokens.map((token) => (
                <LiveColorField
                  key={`${current.id}-${mode}-${token}`}
                  id={`color-${token}`}
                  label={colorTokenLabel(token)}
                  labelPrefix={isSidebarColorToken(token) ? "Sidebar" : undefined}
                  value={readEditorColor(current, mode, token)}
                  build={(raw) => ({ op: "setColor", mode, token, value: raw })}
                  disabled={locked}
                  apply={applyManual}
                  endGesture={endGesture}
                  picker={picker}
                />
              ))}
            </ControlSection>
          ))}
        </div></TabsContent>
                <TabsContent className="data-[state=inactive]:hidden" value="typography" forceMount><div className="grid gap-6 px-4 pb-4">
          {manualLockNote}
          {/* Semantic roles (STHG-06): Heading and Body each own Font, Weight, and Tracking; size and line height stay component-owned. */}
          {TYPE_ROLE_GROUPS.map(({ role, title, weight, tracking }) => (
            <ControlSection key={role} id={`type-${role}`} title={title}>
              <LiveFontField
                key={`${current.id}-font-${role}`}
                id={`font-${role}`}
                target={role}
                catalog="any"
                label="Font"
                labelPrefix={title}
                stack={readFontStack(current, role)}
                defaultStack={readFontStack(defaultTheme, role)}
                disabled={locked}
                apply={applyManual}
              />
              {numeric(weight, title)}
              {numeric(tracking, title)}
            </ControlSection>
          ))}
          {/* The mono primitive for code and preformatted content: a font choice only, not a third role. */}
          <ControlSection id="type-mono" title="Mono">
            <LiveFontField
              key={`${current.id}-font-mono`}
              id="font-mono"
              target="mono"
              catalog="mono"
              label="Font"
              labelPrefix="Mono"
              stack={readFontStack(current, "mono")}
              defaultStack={readFontStack(defaultTheme, "mono")}
              disabled={locked}
              apply={applyManual}
            />
          </ControlSection>
        </div></TabsContent>
                {/* PUI-94: Radius and Spacing define structure (Geometry); Shadow and Motion stay under Effects. */}
                <TabsContent className="data-[state=inactive]:hidden" value="geometry" forceMount><div className="grid gap-6 px-4 pb-4">
          {manualLockNote}
          <ControlSection id="radius" title="Radius">
            {numeric("radius")}
          </ControlSection>
          <ControlSection id="spacing" title="Spacing">
            {numeric("spacing")}
          </ControlSection>
        </div></TabsContent>
                <TabsContent className="data-[state=inactive]:hidden" value="other" forceMount><div className="grid gap-6 px-4 pb-4">
          {manualLockNote}
          <ControlSection id="shadow" title="Shadow">
            <LiveColorField
              key={`${current.id}-shadow-color`}
              id="shadow-color"
              label="Shadow color"
              value={readShadowColor(current)}
              build={buildShadowColorOperation}
              hint="Expected an opaque HEX, rgb, hsl, or oklch color; opacity is set separately."
              disabled={locked}
              apply={applyManual}
              endGesture={endGesture}
              picker={picker}
            />
            {numeric("shadowOpacity")}
            {numeric("shadowBlur")}
            {numeric("shadowSpread")}
            {numeric("shadowOffsetX")}
            {numeric("shadowOffsetY")}
          </ControlSection>
          {/* PUI-113: component-targeted UI effects sit between general Shadow and Motion. */}
          <ControlSection id="ui-effects" title="UI Effects">
            <UiEffectsFields theme={current} disabled={locked} apply={applyManual} />
            {/* Strength is kept but inactive while Off, so choosing Tactile again restores it. */}
            <LiveNumberField key={`${current.id}-uiEffectsStrength`} id="uiEffectsStrength" control={NUMERIC_CONTROLS.uiEffectsStrength} theme={current} disabled={locked} inactive={resolveUiEffects(current).effect === "off"} apply={applyManual} endGesture={endGesture} />
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
              className="quiet-control w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </Field>
          <Button className="cursor-pointer" disabled={locked || commandText.trim().length === 0} onClick={evaluateCommand} data-testid="design-command-evaluate">
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
            </ScrollArea>
          </Tabs>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="quiet-preview">
        <h1 className="sr-only">Personal UI Workbench</h1>
        <div data-testid="workbench-toolbar" className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          {/* PUI-139: every icon-only header control carries a concise tooltip beside its own accessible name. */}
          <WorkbenchTooltip label="Toggle sidebar"><SidebarTrigger className="size-8 cursor-pointer" /></WorkbenchTooltip>
          <div className="ml-auto flex items-center gap-2">
            {/* PUI-135: the active custom theme's Delete leads the right cluster, set apart from mode, history, Code and Save. */}
            {activeCustom && (
              <>
                <ResponsiveDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                  {/* PUI-139: the siblings' ghost icon Button, size-3.5 glyph and resting foreground; destructive only on interaction. */}
                  <WorkbenchTooltip label="Delete theme">
                  <ResponsiveDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Delete theme" data-testid="delete-theme" disabled={locked} className="size-8 enabled:cursor-pointer hover:bg-destructive/10 hover:text-destructive focus-visible:border-destructive focus-visible:text-destructive focus-visible:ring-destructive/20 disabled:cursor-default aria-expanded:text-destructive dark:hover:bg-destructive/20 dark:focus-visible:ring-destructive/40">
                      <Trash aria-hidden="true" className="size-3.5" />
                    </Button>
                  </ResponsiveDialogTrigger>
                  </WorkbenchTooltip>
                  <ResponsiveDialogContent>
                    <ResponsiveDialogHeader>
                      <ResponsiveDialogTitle><span className="type-heading">Delete custom theme?</span></ResponsiveDialogTitle>
                      <ResponsiveDialogDescription>
                        “{current.name}” is removed from this browser, including unsaved edits. {defaultTheme.name} becomes the active theme. This cannot be undone.
                      </ResponsiveDialogDescription>
                    </ResponsiveDialogHeader>
                    <ResponsiveDialogFooter>
                      <Button variant="destructive" className="cursor-pointer" onClick={deleteActive}>Delete theme</Button>
                      <ResponsiveDialogClose asChild><Button variant="outline" className="cursor-pointer">Cancel</Button></ResponsiveDialogClose>
                    </ResponsiveDialogFooter>
                  </ResponsiveDialogContent>
                </ResponsiveDialog>
                <ToolbarSeparator />
              </>
            )}
            {/* PUI-80: icon-only colour mode Switch; the thumb glyph mirrors the current mode. */}
            <WorkbenchTooltip label="Toggle dark mode">
            <Switch
              id="color-mode-switch"
              aria-label="Toggle dark mode"
              className="mx-1 cursor-pointer"
              checked={mode === "dark"}
              onCheckedChange={(checked) => { endGesture(); setMode(checked ? "dark" : "light") }}
              thumbContent={mode === "dark" ? <Moon aria-hidden="true" data-icon="moon" className="size-2.5" /> : <Sun aria-hidden="true" data-icon="sun" className="size-2.5" />}
            />
            </WorkbenchTooltip>
            <ToolbarSeparator />
            {/* Recovery group (PUI-3 owner decision): compact icon buttons immediately before Code and Save. */}
            <div role="group" aria-label="Edit history" data-testid="history-controls" className="flex items-center">
              <WorkbenchTooltip label="Undo">
                <Button variant="ghost" size="icon" className="size-8 enabled:cursor-pointer disabled:cursor-default" aria-label="Undo" disabled={locked || track.past.length === 0} onClick={undoEdit}>
                  <Undo2 aria-hidden="true" className="size-3.5" />
                </Button>
              </WorkbenchTooltip>
              <WorkbenchTooltip label="Redo">
                <Button variant="ghost" size="icon" className="size-8 enabled:cursor-pointer disabled:cursor-default" aria-label="Redo" disabled={locked || track.future.length === 0} onClick={redoEdit}>
                  <Redo2 aria-hidden="true" className="size-3.5" />
                </Button>
              </WorkbenchTooltip>
              <ResponsiveDialog open={resetOpen} onOpenChange={setResetOpen}>
                <WorkbenchTooltip label="Reset theme">
                <ResponsiveDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8 enabled:cursor-pointer disabled:cursor-default" aria-label="Reset" disabled={locked || !dirty || baseline === undefined}>
                    <RotateCcw aria-hidden="true" className="size-3.5" />
                  </Button>
                </ResponsiveDialogTrigger>
                </WorkbenchTooltip>
                <ResponsiveDialogContent>
                  <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle><span className="type-heading">Reset {current.name}?</span></ResponsiveDialogTitle>
                    <ResponsiveDialogDescription>
                      {builtInCopy
                        ? `Your edits are replaced by the built-in ${builtInCopy.name} values.`
                        : `Your unsaved edits are replaced by the last saved version of "${current.name}".`}{" "}
                      You can undo this.
                    </ResponsiveDialogDescription>
                  </ResponsiveDialogHeader>
                  <ResponsiveDialogFooter>
                    <Button className="cursor-pointer" onClick={resetToBaseline}>Reset theme</Button>
                    <ResponsiveDialogClose asChild><Button variant="outline" className="cursor-pointer">Cancel</Button></ResponsiveDialogClose>
                  </ResponsiveDialogFooter>
                </ResponsiveDialogContent>
              </ResponsiveDialog>
            </div>
            <ToolbarSeparator />
            <ThemeCodeDialog theme={current} disabled={locked} onOpen={endGesture} />
                  <ResponsiveDialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
                    <ResponsiveDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="cursor-pointer max-sm:w-8 max-sm:px-0" title="Save" disabled={locked} onClick={save}>
                        <Save aria-hidden="true" className="size-3.5" />
                        <span className="max-sm:sr-only">Save</span>
                      </Button>
                    </ResponsiveDialogTrigger>
                    <ResponsiveDialogContent>
                      <ResponsiveDialogHeader>
                        <ResponsiveDialogTitle><span className="type-heading">Save as a custom theme</span></ResponsiveDialogTitle>
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
                            className="quiet-control"
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
                        <Button type="submit" form={saveAsFormId} className="cursor-pointer">Save theme</Button>
                        <ResponsiveDialogClose asChild><Button variant="outline" className="cursor-pointer">Cancel</Button></ResponsiveDialogClose>
                      </ResponsiveDialogFooter>
                    </ResponsiveDialogContent>
                  </ResponsiveDialog>
          </div>
        </div>
        {(notice || staged || commandEvaluating) && <ScrollArea type="auto" className="quiet-scroll-area quiet-review" data-testid="review-scroll" viewportProps={{ role: "region", "aria-label": "Workbench status and proposal", tabIndex: 0 }}>
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
                <Button className="cursor-pointer" onClick={applyStaged}>Apply proposal</Button>
                <Button variant="outline" className="cursor-pointer" onClick={discardStaged}>
                  Discard proposal
                </Button>
              </div>
            </div>
          </Panel>
        )}

        </div>
        </ScrollArea>}
        <div className="quiet-preview-body">
          <div role="region" aria-label="Preview viewport" tabIndex={0} className="quiet-viewport outline-none focus-visible:ring-inset focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <iframe ref={iframeRef} title="Component preview" src="/workbench?preview=1" data-testid="preview-frame" className="block size-full border-0" />
          </div>
        </div>
      </SidebarInset>
      <Toast.Provider toastManager={toasts}><WorkbenchToasts /></Toast.Provider>
    </SidebarProvider>
    </WorkbenchTooltipProvider>
  )
}
