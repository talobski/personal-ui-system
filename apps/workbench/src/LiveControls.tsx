import * as React from "react"

import type { Theme, ThemeOperation } from "@personal-ui/core"
import { Button } from "@personal-ui/ui/components/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@personal-ui/ui/components/collapsible"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxTrigger } from "@personal-ui/ui/components/combobox"
import { Field, FieldDescription, FieldError, FieldLabel } from "@personal-ui/ui/components/field"
import { Input } from "@personal-ui/ui/components/input"
import { Slider } from "@personal-ui/ui/components/slider"
import { cssFontStack, findFontOption, FONT_OPTIONS } from "@personal-ui/ui/lib/fonts"
import type { FontCategory, FontOption } from "@personal-ui/ui/lib/fonts"

import { buildFontOperation, fontControlCopy, formatFontStack, parseNumericDraft, pickedColorInput, pickerHex, roundToStep } from "./controls"
import type { NumericControl } from "./controls"
import type { WorkbenchIssue } from "./lifecycle"

/**
 * Applies one operation built against the *latest* active theme and returns the rejection issues (empty when applied).
 * Manual controls have no Apply step: a valid value becomes active state immediately, an invalid one changes nothing.
 */
export type ApplyManual = (build: (theme: Theme) => ThemeOperation) => WorkbenchIssue[]

/** The one ordinary field-label style across every editor tab; group headings stay visually distinct. */
export const FIELD_LABEL_CLASS = "text-xs font-normal text-muted-foreground"

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
      <h3 className="text-sm font-medium">
        <CollapsibleTrigger asChild>
          {/*
            muted-foreground on full-strength muted falls below 4.5:1 in Default light, so the label uses the weakest
            foreground step that is stronger than muted-foreground and clears normal-text contrast, at rest and on
            hover, in both built-ins and both modes (lower steps are weaker than muted-foreground in Quiet light).
            The explicit hover and dark-hover overrides replace the ghost variant's accent hover.
          */}
          <Button variant="ghost" size="sm" className="h-auto w-fit rounded-sm bg-muted px-2 py-0.5 text-[0.6875rem] font-medium uppercase tracking-wide text-foreground/75 ring-1 ring-border hover:bg-muted/80 hover:text-foreground/75 dark:hover:bg-muted/80 has-[>svg]:px-2 [&[data-state=open]>svg]:rotate-180">
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
export function LiveNumberField({ id, control, theme, disabled, apply }: { id: string; control: NumericControl; theme: Theme; disabled: boolean; apply: ApplyManual }) {
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

  const commit = (next: number) => {
    const rounded = roundToStep(next, control.step)
    const issues = apply((latest) => control.build(rounded, latest))
    setError(issues.length > 0 ? `Rejected, not applied: ${describeIssues(issues)}.` : null)
  }

  const unitText = control.unit ? ` ${control.unit}` : ""
  const range = `${control.min}${unitText} to ${control.max}${unitText}`
  const labelId = `${id}-label`
  const inputId = `${id}-input`
  const errorId = `${id}-error`
  const sliderValue = Number.isFinite(value) ? Math.min(control.max, Math.max(control.min, value)) : control.min

  return (
    <Field data-invalid={error !== null} data-testid={`control-${id}`}>
      <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)_max-content] items-center gap-[0.375rem]" data-testid={`${id}-row`}>
        <FieldLabel id={labelId} htmlFor={inputId} className={`${FIELD_LABEL_CLASS} w-full min-w-0`}>
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
          disabled={disabled}
          onValueChange={([next]) => {
            if (next === undefined) return
            setDraft(formatNumber(next, control.step))
            commit(next)
          }}
        />

        <div className="flex items-center gap-[0.375rem]">
          <Input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            disabled={disabled}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? errorId : undefined}
            className="quiet-control h-[2rem] w-[3.5rem] flex-none px-[0.25rem] text-right tabular-nums"
            onFocus={() => (focused.current = true)}
            onBlur={() => {
              focused.current = false
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
 * Valid values apply immediately and core normalizes them to canonical OKLCH; a rejected text draft stays visible and
 * never activates.
 */
export function LiveColorField({
  id,
  label,
  value,
  build,
  hint = COLOR_HINT,
  disabled,
  apply,
}: {
  id: string
  label: string
  value: string
  build: (raw: string, theme: Theme) => ThemeOperation
  hint?: string
  disabled: boolean
  apply: ApplyManual
}) {
  const [draft, setDraft] = React.useState(value)
  const [error, setError] = React.useState<string | null>(null)
  const focused = React.useRef(false)
  React.useEffect(() => {
    if (focused.current) return
    setDraft(value)
    setError(null)
  }, [value])
  useReportInvalid(id, error !== null)

  const inputId = `${id}-input`
  const errorId = `${id}-error`
  const commit = (raw: string) => {
    const issues = apply((latest) => build(raw, latest))
    setError(issues.length > 0 ? `Rejected, not applied: ${describeIssues(issues)}. ${hint}` : null)
  }

  return (
    <Field data-invalid={error !== null} data-testid={`control-${id}`} className="gap-1.5">
      <FieldLabel htmlFor={inputId} className={FIELD_LABEL_CLASS}>
        {label}
      </FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          data-testid={`${id}-picker`}
          value={pickerHex(value)}
          disabled={disabled}
          onChange={(event) => commit(pickedColorInput(event.target.value, value))}
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
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false
            if (error === null) setDraft(value)
          }}
          onChange={(event) => {
            setDraft(event.target.value)
            commit(event.target.value.trim())
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
 * through `setFontFamily` immediately; typed search text is never a value. A theme whose stack is not a catalog option
 * shows concise category copy with accessible exact-stack detail.
 */
export function LiveFontField({
  id,
  category,
  label,
  stack,
  defaultStack,
  disabled,
  apply,
}: {
  id: string
  category: FontCategory
  label: string
  stack: readonly string[]
  defaultStack: readonly string[]
  disabled: boolean
  apply: ApplyManual
}) {
  const selected = findFontOption(category, stack) ?? null
  const [error, setError] = React.useState<string | null>(null)
  useReportInvalid(id, error !== null)

  const inputId = `${id}-input`
  const errorId = `${id}-error`
  const noteId = `${id}-note`
  const describedBy = [selected === null ? noteId : null, error !== null ? errorId : null].filter(Boolean).join(" ") || undefined

  return (
    <Field data-invalid={error !== null} data-testid={`control-${id}`} data-font={selected?.id ?? ""} className="gap-1.5">
      <FieldLabel htmlFor={inputId} className="sr-only">
        {label}
      </FieldLabel>
      <Combobox
        items={FONT_OPTIONS[category]}
        value={selected}
        disabled={disabled}
        itemToStringLabel={(option: FontOption) => option.label}
        itemToStringValue={(option: FontOption) => option.id}
        isItemEqualToValue={(option: FontOption, value: FontOption) => option.id === value.id}
        onValueChange={(next: FontOption | null) => {
          if (next === null) return
          const issues = apply(() => buildFontOperation(category, next.stack))
          setError(issues.length > 0 ? `Rejected, not applied: ${describeIssues(issues)}.` : null)
        }}
      >
        <ComboboxTrigger
          id={inputId}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={error !== null}
          className="quiet-control h-8 w-full justify-between rounded-md border border-input px-3 text-sm shadow-xs"
        >
          <span className="truncate">{selected?.label ?? fontControlCopy(category, stack, defaultStack)}</span>
        </ComboboxTrigger>
        <ComboboxContent>
          <div className="p-1">
            <ComboboxInput id={`${inputId}-search`} aria-label={`Search ${label}`} placeholder="Search fonts" showTrigger={false} className="quiet-control-group h-8" />
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
      {selected === null && (
        <FieldDescription id={noteId} data-testid={`${id}-stack`} className="sr-only">
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
