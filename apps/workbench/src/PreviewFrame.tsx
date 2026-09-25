import { Gallery } from "./Gallery"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@personal-ui/ui/components/select"
import * as React from "react"

import { Button } from "@personal-ui/ui/components/button"
import { Input } from "@personal-ui/ui/components/input"
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from "@personal-ui/ui/components/responsive-dialog"
import { ScrollArea } from "@personal-ui/ui/components/scroll-area"

import type { PreviewReady, PreviewState } from "./messages"

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const

/** Runs inside the preview iframe: applies the workbench's theme variables and renders the pilot component states. */
export function PreviewFrame() {
  const [state, setState] = React.useState<PreviewState | null>(null)
  const [view, setView] = React.useState("cards")
  const [buttonActivations, setButtonActivations] = React.useState(0)

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return
      if ((event.data as PreviewState | undefined)?.type === "workbench-preview-state") setState(event.data as PreviewState)
    }
    window.addEventListener("message", onMessage)
    window.parent.postMessage({ type: "workbench-preview-ready" } satisfies PreviewReady, window.location.origin)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", state?.mode === "dark")
  }, [state?.mode])

  // The root ScrollArea is this document's only scroll owner; the document root itself must never scroll.
  React.useLayoutEffect(() => {
    document.documentElement.classList.add("quiet-preview-document")
    return () => document.documentElement.classList.remove("quiet-preview-document")
  }, [])

  return (
    <ScrollArea type="auto" className="quiet-scroll-area h-dvh w-full" data-testid="preview-scroll" viewportProps={{ role: "group", "aria-label": "Preview document", tabIndex: 0 }}>
    <main
      className="grid gap-4 p-4"
      data-testid="preview"
      data-ready={state ? "true" : "false"}
      data-mode={state?.mode}
      data-theme-id={state?.themeId}
      data-revision={state?.revision}
    >
      <style id="workbench-theme">{state?.css ?? ""}</style>
      <div className="flex justify-center">
        <Select value={view} onValueChange={(next) => { if (next) setView(next) }} items={[{ value: "cards", label: "Cards" }, { value: "states", label: "States" }]}>
          {/* Ghost trigger: no resting border, fill, or shadow; semantic accent hover and the primitive focus ring remain. */}
          <SelectTrigger size="sm" aria-label="Preview views" className="quiet-control quiet-preview-view min-w-[6rem] cursor-pointer border-transparent bg-transparent shadow-none hover:bg-accent hover:text-accent-foreground data-[popup-open]:bg-accent dark:bg-transparent dark:hover:bg-accent/50"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="cards">Cards</SelectItem><SelectItem value="states">States</SelectItem></SelectContent>
        </Select>
      </div>
      <div hidden={view !== "cards"}><Gallery /></div>
      <div hidden={view !== "states"} className={view === "states" ? "grid gap-6" : "hidden"}>
      <section aria-labelledby="pv-buttons" className="grid gap-2">
        <h2 id="pv-buttons" className="text-sm font-semibold">
          Button
        </h2>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant} onClick={variant === "default" ? () => setButtonActivations((count) => count + 1) : undefined}>
              {variant}
            </Button>
          ))}
        </div>
        <output className="text-xs text-muted-foreground" data-testid="button-activations" aria-live="polite">
          Default button activations: {buttonActivations}
        </output>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section aria-labelledby="pv-inputs" className="grid gap-3">
        <h2 id="pv-inputs" className="text-sm font-semibold">
          Input
        </h2>
        <label className="grid gap-1 text-sm">
          Default
          <Input placeholder="Placeholder text" />
        </label>
        <label className="grid gap-1 text-sm">
          With value
          <Input defaultValue="Ada Lovelace" />
        </label>
        <label className="grid gap-1 text-sm">
          Invalid
          <Input defaultValue="not-an-email" aria-invalid="true" />
        </label>
        <label className="grid gap-1 text-sm">
          Disabled
          <Input defaultValue="Read only value" disabled />
        </label>
      </section>

      <section aria-labelledby="pv-elevation" className="grid gap-2">
        <h2 id="pv-elevation" className="text-sm font-semibold">
          Elevation
        </h2>
        <div data-testid="elevation-sample" className="rounded-md bg-card p-3 text-sm text-card-foreground shadow-md">
          Raised surface
        </div>
      </section>

      <section aria-labelledby="pv-typography" className="grid gap-1">
        <h2 id="pv-typography" className="text-sm font-semibold">
          Typography
        </h2>
        <p data-testid="type-sans" className="font-sans text-sm">Sans: a calm, readable paragraph.</p>
        <p data-testid="type-serif" className="font-serif text-sm">Serif: a calm, readable paragraph.</p>
        <p data-testid="type-mono" className="font-mono text-sm">Mono: const revision = 1</p>
      </section>

      <section aria-labelledby="pv-dialog" className="grid gap-2">
        <h2 id="pv-dialog" className="text-sm font-semibold">
          Responsive dialog
        </h2>
        <div>
          <ResponsiveDialog>
            <ResponsiveDialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>Edit profile</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>Change how your name appears to others.</ResponsiveDialogDescription>
              </ResponsiveDialogHeader>
              <div className="grid gap-2 px-4 sm:px-0">
                <label htmlFor="pv-display-name" className="text-sm font-medium">
                  Display name
                </label>
                <Input id="pv-display-name" defaultValue="Ada Lovelace" autoComplete="name" />
              </div>
              <ResponsiveDialogFooter>
                <Button>Save changes</Button>
                <ResponsiveDialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </ResponsiveDialogClose>
              </ResponsiveDialogFooter>
            </ResponsiveDialogContent>
          </ResponsiveDialog>
        </div>
      </section>
      </div>
    </main>
    </ScrollArea>
  )
}
