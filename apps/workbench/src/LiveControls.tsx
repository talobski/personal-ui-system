import * as React from "react"

import { resolveUiEffects } from "@personal-ui/core"
import type { FontFamilyTarget, Theme, ThemeOperation, UiEffect } from "@personal-ui/core"
import { Button } from "@personal-ui/ui/components/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@personal-ui/ui/components/collapsible"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from "@personal-ui/ui/components/combobox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { Label } from "@personal-ui/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@personal-ui/ui/components/select"
import { Slider } from "@personal-ui/ui/components/slider"
import { Switch } from "@personal-ui/ui/components/switch"
import { cssFontStack, findFontOption, FONT_CATALOG, FONT_OPTIONS } from "@personal-ui/ui/lib/fonts"
import type { FontCategory, FontOption } from "@personal-ui/ui/lib/fonts"

import { buildFontOperation, buildUiEffectsOperation, fontControlCopy, formatFontStack, parseNumericDraft, pickedColorInput, pickerHex, roundToStep, UI_EFFECT_OPTIONS, UI_EFFECTS_HELP } from "./controls"
import type { NumericControl } from "./controls"
import type { ColorPickerController } from "./colorPicker"
import type { WorkbenchIssue } from "./lifecycle"

/**
 * Applies one operation and returns the rejection issues (empty when applied). Manual controls have no Apply step: a
 * valid value becomes active state immediately, an invalid one changes nothing.
 *
 * Without `gesture` the operation is built against the latest active theme and is one committed history entry. With a
 * `gesture` key (a slider drag, or one focus session of a text draft) every step is rebuilt against the theme captured
 * when that gesture began: the preview stays live, but the revision advances at most once and history records one
 * entry when the gesture ends (`EndGesture`, or any other control or action).
 */
export type ApplyManual = (build: (theme: Theme) => ThemeOperation, gesture?: string) => WorkbenchIssue[]

/** Closes the open manual gesture, recording its one history checkpoint when it changed the design. */
export type EndGesture = () => void

/** The one ordinary field-label style across every editor tab; group headings stay visually distinct. */
export const FIELD_LABEL_CLASS = "text-xs font-normal text-muted-foreground"

/**
 * Shared physical row geometry for left-labelled controls: a fixed 5rem label column that never scales with the
 * editable theme spacing, then the flexible control, then (numeric rows) the intrinsic value and unit.
 */
export const LABELLED_ROW_CLASS = "grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-center gap-[0.375rem]"
export const NUMERIC_ROW_CLASS = "grid min-w-0 grid-cols-[5rem_minmax(0,1fr)_max-content] items-center gap-[0.375rem]"

/*
 * Workbench editable controls use quiet-control typography so they compute to 14px at every viewport; the public Input, Textarea, and
 * Combobox defaults (16px below md) are unchanged. Accepted tradeoff: iOS Safari may zoom on focus of sub-16px text.
 */

const describeIssues = (issues: WorkbenchIssue[]) => issues.map((i) => `${i.ruleId} at ${i.path || "(root)"}`).join("; ")

/** Lets a section keep itself open while any control inside it holds a rejected draft (`collapsible.hidden-error`). */
const InvalidReport = React.createContext<(id: string, invalid: boolean) => void>(() => {})

function useReportInvalid(id: string, invalid: boolean) {
  const report = React.useContext(InvalidReport)
  React.useEffect(() => {
    report(id, invalid)
    return () => report(id, false)
  }, [report, id, invalid])
}

export function ControlSection({ id, title, children, defaultOpen = true }: { id: string; title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [invalid, setInvalid] = React.useState<ReadonlySet<string>>(new Set())
  const report = React.useCallback((control: string, isInvalid: boolean) => {
    setInvalid((previous) => {
      if (previous.has(control) === isInvalid) return previous
      const next = new Set(previous)
      if (isInvalid) next.add(control)
      else next.delete(control)
      return next
    })
  }, [])
  const hasError = invalid.size > 0
  return (
    <Collapsible open={open || hasError} onOpenChange={(next) => setOpen(next || hasError)} data-testid={`section-${id}`} data-has-error={hasError} className="grid gap-2">
      {/* Editor section labels inherit Body; content headings retain Heading. */}
      <h3 className="text-sm">
        <CollapsibleTrigger asChild>
          {/*
            PUI-120: the accepted Secondary variant (semantic secondary pair and its hover), so the shared UI Effects
            recipe reaches it with no local treatment. The compact geometry overrides keep the accepted height, width,
            padding, 11px uppercase type, radius and 12px chevron instead of the Button size defaults.
          */}
          <Button variant="secondary" size="sm" className="h-auto w-fit cursor-pointer rounded-sm px-2 py-0.5 quiet-section-trigger text-[0.6875rem] uppercase has-[>svg]:px-2 [&[data-state=open]>svg]:rotate-180">
            {title}
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3 transition-transform motion-reduce:transition-none">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </Button>
        </CollapsibleTrigger>
      </h3>
      <CollapsibleContent className="grid gap-4">
        <InvalidReport.Provider value={report}>{children}</InvalidReport.Provider>
      </CollapsibleContent>
    </Collapsible>
  )
}

const formatNumber = (value: number, step: number) => (Number.isFinite(value) ? String(roundToStep(value, step)) : "")

/** Slider + numeric field + visible unit, both bound to one canonical theme value. */
export function LiveNumberField({
  id,
  control,
  labelPrefix,
  theme,
  disabled,
  apply,
  endGesture,
  inactive = false,
}: {
  id: string
  control: NumericControl
  /** Screen-reader-only group context prepended to the visible label, e.g. `Body` for the visible `Weight`. */
  labelPrefix?: string
  theme: Theme
  disabled: boolean
  apply: ApplyManual
  endGesture: EndGesture
  /** Semantically disabled and visually de-emphasized (label included) because the setting it scales is off. */
  inactive?: boolean
}) {
  const value = control.read(theme)
  const formatted = formatNumber(value, control.step)
  const [draft, setDraft] = React.useState(formatted)
  const [error, setError] = React.useState<string | null>(null)
  const focused = React.useRef(false)
  // The field follows the active value unless the person is typing in it; a rejected draft is never active state.
  React.useEffect(() => {
    if (focused.current) return
    setDraft(formatted)
    setError(null)
  }, [formatted, theme.id])
  useReportInvalid(id, error !== null)

  // The slider and the text draft share one gesture key: a drag (pointer down to up, or one key press) or one focus
  // session of typing is one history entry.
  const commit = (next: number) => {
    const rounded = roundToStep(next, control.step)
    const issues = apply((base) => control.build(rounded, base), id)
    setError(issues.length > 0 ? `Rejected, not applied: ${describeIssues(issues)}.` : null)
  }

  const unitText = control.unit ? ` ${control.unit}` : ""
  const range = `${control.min}${unitText} to ${control.max}${unitText}`
  const labelId = `${id}-label`
  const inputId = `${id}-input`
  const errorId = `${id}-error`
  const sliderValue = Number.isFinite(value) ? Math.min(control.max, Math.max(control.min, value)) : control.min

  return (
    <Field data-invalid={error !== null} data-disabled={inactive || undefined} data-testid={`control-${id}`}>
      <div className={NUMERIC_ROW_CLASS} data-testid={`${id}-row`}>
        <FieldLabel id={labelId} htmlFor={inputId} className={`${FIELD_LABEL_CLASS} w-full min-w-0`}>
          {labelPrefix && <span className="sr-only">{labelPrefix} </span>}
          {control.label}
        </FieldLabel>
        <Slider
          className="min-w-0"
          aria-labelledby={labelId}
          aria-valuetext={`${formatted}${unitText}`}
          min={control.min}
          max={control.max}
          step={control.step}
          value={[sliderValue]}
          disabled={disabled || inactive}
          aria-disabled={disabled || inactive || undefined}
          onValueChange={([next]) => {
            if (next === undefined) return
            setDraft(formatNumber(next, control.step))
            commit(next)
          }}
          // Radix reports a keyboard step's commit before its value change, so the gesture closes after both have run.
          onValueCommit={() => queueMicrotask(endGesture)}
        />

        <div className="flex items-center gap-[0.375rem]">
          <Input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            disabled={disabled || inactive}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? errorId : undefined}
            className="quiet-control h-[2rem] w-[3.5rem] flex-none px-[0.25rem] text-right tabular-nums"
            onFocus={() => (focused.current = true)}
            onBlur={() => {
              focused.current = false
              endGesture()
              if (error === null) setDraft(formatted)
            }}
            onChange={(event) => {
              setDraft(event.target.value)
              const parsed = parseNumericDraft(control, event.target.value)
              if (parsed === null) return setError(`Enter a number from ${range}. Not applied.`)
              commit(parsed)
            }}
          />
          <span aria-hidden={!control.unit || undefined} className="w-[1.5rem] flex-none text-xs text-muted-foreground" data-testid={`${id}-unit`}>
            {control.unit}
          </span>
        </div>
      </div>

      {error !== null && (
        <FieldError id={errorId} data-testid={`${id}-error`}>
          {error}
        </FieldError>
      )}
    </Field>
  )
}

const COLOR_HINT = "Expected HEX, rgb(a), hsl(a), or oklch inside the Display P3 gamut."

/**
 * One colour row: a native colour picker (display sRGB) and the canonical text input, both entering through the same
 * operation (`setColor` for tokens, `setShadowProfile` for the shadow colour), built against the latest active theme.
 * Picker feedback is local and immediate; the shared scheduler debounces canonical writes. Text applies immediately.
 * Core normalizes valid values to canonical OKLCH; a rejected text draft stays visible and
 * never activates.
 */
export function LiveColorField({
  id,
  label,
  labelPrefix,
  value,
  build,
  hint = COLOR_HINT,
  disabled,
  apply,
  endGesture,
  picker,
}: {
  id: string
  label: string
  /** Screen-reader-only context prepended to the visible label, e.g. `Sidebar` for the dedicated Sidebar colours. */
  labelPrefix?: string
  value: string
  build: (raw: string, theme: Theme) => ThemeOperation
  hint?: string
  disabled: boolean
  apply: ApplyManual
  endGesture: EndGesture
  picker: ColorPickerController
}) {
  const pickerInput = React.useRef<HTMLInputElement>(null)
  // A per-mount identity: a remounted field with the same key can never finish or cancel its predecessor's gesture.
  const [owner] = React.useState(() => ({ key: `${id}-picker` }))
  // Picker-local feedback. It follows the canonical value except while this field owns the open picker gesture.
  const [localHex, setLocalHex] = React.useState(() => pickerHex(value))
  React.useLayoutEffect(() => {
    if (disabled) picker.cancel(owner)
    if (!picker.active(owner)) setLocalHex(pickerHex(value))
  }, [value, disabled, owner, picker])
  /** Shows the picked colour now and schedules its canonical write; the latest movement always supersedes earlier ones. */
  const move = (hex: string) => {
    if (disabled) return
    setLocalHex(hex)
    const raw = pickedColorInput(hex, value)
    picker.move(owner, () => commit(raw, owner.key))
  }
  // The native listener below is attached once, so it reads this render's handler rather than a stale closure.
  const latestMove = React.useRef(move)
  latestMove.current = move
  React.useEffect(() => {
    const input = pickerInput.current!
    const finish = () => picker.finish(owner)
    // Completion is a native listener: React may deduplicate a `change` that follows an `input` with the same value.
    const change = () => {
      latestMove.current(input.value)
      finish()
    }
    input.addEventListener("change", change)
    window.addEventListener("pointerup", finish)
    window.addEventListener("pointercancel", finish)
    return () => {
      input.removeEventListener("change", change)
      window.removeEventListener("pointerup", finish)
      window.removeEventListener("pointercancel", finish)
      picker.cancel(owner)
    }
  }, [owner, picker])
  const [draft, setDraft] = React.useState(value)
  const [error, setError] = React.useState<string | null>(null)
  // Only a draft being typed is protected from canonical updates; a focused, untouched field still follows the value
  // (for example the picker write that focusing it flushes).
  const typing = React.useRef(false)
  React.useEffect(() => {
    if (typing.current) return
    setDraft(value)
    setError(null)
  }, [value])
  useReportInvalid(id, error !== null)

  const inputId = `${id}-input`
  const errorId = `${id}-error`
  // Picker drags and one focus session of typing are each one gesture, so one history entry.
  const commit = (raw: string, gesture: string) => {
    const issues = apply((base) => build(raw, base), gesture)
    setError(issues.length > 0 ? `Rejected, not applied: ${describeIssues(issues)}. ${hint}` : null)
  }

  return (
    <Field data-invalid={error !== null} data-testid={`control-${id}`} className="gap-1.5">
      <FieldLabel htmlFor={inputId} className={FIELD_LABEL_CLASS}>
        {labelPrefix && <span className="sr-only">{labelPrefix} </span>}
        {label}
      </FieldLabel>
      <div className="flex items-center gap-2">
        <input
          ref={pickerInput}
          type="color"
          aria-label={`${labelPrefix ? `${labelPrefix} ` : ""}${label} picker`}
          data-testid={`${id}-picker`}
          value={localHex}
          disabled={disabled}
          onInput={(event) => move(event.currentTarget.value)}
          // Completion is handled by the native `change` listener above; this only satisfies React's controlled input.
          onChange={() => {}}
          onPointerUp={() => picker.finish(owner)}
          onBlur={() => picker.finish(owner)}
          className="size-8 shrink-0 cursor-pointer appearance-none rounded-md border border-input bg-transparent p-0.5 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <Input
          id={inputId}
          value={draft}
          placeholder="HEX, rgb, hsl, or oklch"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error !== null}
          aria-describedby={error !== null ? errorId : undefined}
          className="quiet-control h-8"
          onFocus={() => picker.finish()}
          onBlur={() => {
            typing.current = false
            endGesture()
            if (error === null) setDraft(value)
          }}
          onChange={(event) => {
            picker.finish()
            typing.current = true
            setDraft(event.target.value)
            commit(event.target.value.trim(), id)
          }}
        />
      </div>
      {error !== null && (
        <FieldError id={errorId} data-testid={`${id}-error`}>
          {error}
        </FieldError>
      )}
    </Field>
  )
}

/**
 * A searchable font choice over the closed local catalog. Selecting an option writes that option's full canonical stack
 * through `setFontFamily` for its `target` immediately; typed search text is never a value. `catalog` is `"any"` for the
 * Heading and Body roles (every family, whatever its category) and a single category for the Mono primitive. A theme
 * whose stack is not a catalog option shows concise category copy with accessible exact-stack detail.
 */
export function LiveFontField({
  id,
  target,
  catalog,
  label,
  labelPrefix,
  stack,
  defaultStack,
  disabled,
  apply,
}: {
  id: string
  target: FontFamilyTarget
  catalog: FontCategory | "any"
  label: string
  /** Screen-reader-only group context prepended to the visible label, e.g. `Heading` for the visible `Font`. */
  labelPrefix?: string
  stack: readonly string[]
  defaultStack: readonly string[]
  disabled: boolean
  apply: ApplyManual
}) {
  const selected = findFontOption(catalog, stack) ?? null
  const items = catalog === "any" ? FONT_CATALOG : FONT_OPTIONS[catalog]
  const [error, setError] = React.useState<string | null>(null)
  useReportInvalid(id, error !== null)

  const inputId = `${id}-input`
  const errorId = `${id}-error`
  const noteId = `${id}-note`
  const describedBy = [selected === null ? noteId : null, error !== null ? errorId : null].filter(Boolean).join(" ") || undefined

  return (
    <Field data-invalid={error !== null} data-testid={`control-${id}`} data-font={selected?.id ?? ""} className="gap-1.5">
      <div className={LABELLED_ROW_CLASS} data-testid={`${id}-row`}>
        <FieldLabel htmlFor={inputId} className={`${FIELD_LABEL_CLASS} w-full min-w-0`}>
          {labelPrefix && <span className="sr-only">{labelPrefix} </span>}
          {label}
        </FieldLabel>
        <div className="min-w-0">
          <Combobox
            items={items}
            value={selected}
            disabled={disabled}
            itemToStringLabel={(option: FontOption) => option.label}
            itemToStringValue={(option: FontOption) => option.id}
            isItemEqualToValue={(option: FontOption, value: FontOption) => option.id === value.id}
            onValueChange={(next: FontOption | null) => {
              if (next === null) return
              const issues = apply(() => buildFontOperation(target, next.stack))
              setError(issues.length > 0 ? `Rejected, not applied: ${describeIssues(issues)}.` : null)
            }}
          >
            <ComboboxTrigger
              id={inputId}
              disabled={disabled}
              aria-describedby={describedBy}
              aria-invalid={error !== null}
              className="quiet-control h-8 w-full cursor-pointer justify-between rounded-md border border-input px-3 text-sm shadow-xs disabled:cursor-not-allowed"
            >
              <span className="truncate">{selected?.label ?? fontControlCopy(stack, defaultStack)}</span>
            </ComboboxTrigger>
            <ComboboxContent>
              <div className="p-1">
                <ComboboxInput id={`${inputId}-search`} aria-label={`Search ${labelPrefix ?? label} fonts`} placeholder="Search fonts" showTrigger={false} className="quiet-control-group h-8" />
              </div>
              <ComboboxEmpty>No fonts found.</ComboboxEmpty>
              <ComboboxList>
                {(option: FontOption) => (
                  <ComboboxItem key={option.id} value={option} style={{ fontFamily: cssFontStack(option.stack) }}>
                    {option.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </div>
      {selected === null && (
        <FieldDescription id={noteId} data-testid={`${id}-stack`} className="sr-only !w-px">
          <span className="break-all">{formatFontStack(stack)}</span>
        </FieldDescription>
      )}
      {error !== null && (
        <FieldError id={errorId} data-testid={`${id}-error`}>
          {error}
        </FieldError>
      )}
    </Field>
  )
}

/**
 * The UI EFFECTS Effect select (PUI-119): Off or Tactile, with one short helper naming what Tactile affects. There are
 * no per-target toggles; the recipe owns its targets. Each change is one committed `setUiEffects` edit; the shared
 * Strength row is a `LiveNumberField` that is inactive while the effect is Off.
 */
export function UiEffectsFields({ theme, disabled, apply }: { theme: Theme; disabled: boolean; apply: ApplyManual }) {
  const [error, setError] = React.useState<string | null>(null)
  useReportInvalid("ui-effects", error !== null)
  const effects = resolveUiEffects(theme)
  const edit = (patch: Parameters<typeof buildUiEffectsOperation>[1]) => {
    const issues = apply((base) => buildUiEffectsOperation(base, patch))
    setError(issues.length > 0 ? `Rejected, not applied: ${describeIssues(issues)}.` : null)
  }
  return (
    <>
      <Field data-testid="control-ui-effect" className="gap-1.5">
        <div className={LABELLED_ROW_CLASS}>
          <FieldLabel id="ui-effect-label" htmlFor="ui-effect-select" className={`${FIELD_LABEL_CLASS} w-full min-w-0`}>Effect</FieldLabel>
          <Select items={UI_EFFECT_OPTIONS} value={effects.effect} disabled={disabled} onValueChange={(value) => { if (value && value !== effects.effect) edit({ effect: value as UiEffect }) }}>
            <SelectTrigger id="ui-effect-select" aria-labelledby="ui-effect-label" aria-describedby="ui-effect-help" className="quiet-control h-8 w-full min-w-0 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UI_EFFECT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="cursor-pointer">{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FieldDescription id="ui-effect-help" data-testid="ui-effect-help" className="pl-[calc(5rem+0.375rem)] text-xs">{UI_EFFECTS_HELP}</FieldDescription>
      </Field>
      {error !== null && <FieldError data-testid="ui-effects-error">{error}</FieldError>}
    </>
  )
}

/**
 * The persistent Sidebar source mode (`setSidebarTokensEnabled`), applied immediately like every manual control. It
 * never hides or disables the dedicated colour fields: off, they stay editable but unapplied; on, they are live.
 * PUI-93: the row sits a small gap below the SIDEBAR trigger with a quieter one-step-smaller muted label. PUI-98: no
 * helper or status note renders in either state, so the Switch carries only its label and no description reference.
 */
export function SidebarTokensSwitch({ enabled, disabled, apply }: { enabled: boolean; disabled: boolean; apply: ApplyManual }) {
  const [error, setError] = React.useState<string | null>(null)
  useReportInvalid("sidebar-tokens", error !== null)
  return (
    <Field data-invalid={error !== null} data-testid="control-sidebar-tokens" className="mt-2 gap-1.5">
      <div className="flex items-center gap-2">
        <Switch
          id="sidebar-tokens-switch"
          className="cursor-pointer"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(checked) => {
            const issues = apply(() => ({ op: "setSidebarTokensEnabled", value: checked }))
            setError(issues.length > 0 ? `Rejected, not applied: ${describeIssues(issues)}.` : null)
          }}
        />
        <Label htmlFor="sidebar-tokens-switch" className="text-xs text-muted-foreground">Use sidebar tokens</Label>
      </div>
      {error !== null && <FieldError data-testid="sidebar-tokens-error">{error}</FieldError>}
    </Field>
  )
}
