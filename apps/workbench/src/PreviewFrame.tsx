import { Gallery } from "./Gallery"
import { DesignSystemPreview } from "./DesignSystemPreview"
import { AppShells } from "@personal-ui/ui/compositions/app-shells"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@personal-ui/ui/components/tabs"
import { CATEGORY_TRIGGER_CLASS } from "./workbenchTabs"
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
      <Tabs value={view} onValueChange={setView} className="min-w-0 gap-4">
        <TabsList className="quiet-categories w-max flex-nowrap justify-start bg-transparent p-0" aria-label="Preview views">
          <TabsTrigger value="cards" className={CATEGORY_TRIGGER_CLASS}>Cards</TabsTrigger>
          <TabsTrigger value="design-system" className={CATEGORY_TRIGGER_CLASS}>Design system</TabsTrigger>
          <TabsTrigger value="app-shells" className={CATEGORY_TRIGGER_CLASS}>App shells</TabsTrigger>
          <TabsTrigger value="states" className={CATEGORY_TRIGGER_CLASS}>States</TabsTrigger>
        </TabsList>
        <TabsContent value="cards" forceMount className="data-[state=inactive]:hidden"><Gallery /></TabsContent>
        {/* PUI-101/102: read-only views of the same posted CSS; the Workbench sidebar remains the only editor. */}
        <TabsContent value="design-system" forceMount className="data-[state=inactive]:hidden"><DesignSystemPreview source={`${state?.mode ?? ""}\n${state?.css ?? ""}`} /></TabsContent>
        <TabsContent value="app-shells" forceMount className="data-[state=inactive]:hidden"><AppShells /></TabsContent>
        <TabsContent value="states" forceMount className="grid gap-6 data-[state=inactive]:hidden">
      <section aria-labelledby="pv-buttons" className="grid gap-2">
        <h2 id="pv-buttons" className="type-heading text-sm">
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
        <h2 id="pv-inputs" className="type-heading text-sm">
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
        <h2 id="pv-elevation" className="type-heading text-sm">
          Elevation
        </h2>
        <div data-testid="elevation-sample" className="rounded-md bg-card p-3 text-sm text-card-foreground shadow-md">
          Raised surface
        </div>
      </section>

      <section aria-labelledby="pv-typography" className="grid gap-1">
        <h2 id="pv-typography" className="type-heading text-sm">
          Typography
        </h2>
        {/* One sample per semantic role and the mono primitive; sizes stay component-owned. */}
        <p data-testid="type-heading" className="type-heading text-lg">Heading: a calm, clear title</p>
        <p data-testid="type-body" className="text-sm">Body: a calm, readable paragraph.</p>
        <p data-testid="type-mono" className="font-mono text-sm">Mono: const revision = 1</p>
      </section>

      <section aria-labelledby="pv-dialog" className="grid gap-2">
        <h2 id="pv-dialog" className="type-heading text-sm">
          Responsive dialog
        </h2>
        <div>
          <ResponsiveDialog>
            <ResponsiveDialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </ResponsiveDialogTrigger>
            <ResponsiveDialogContent>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle><span className="type-heading">Edit profile</span></ResponsiveDialogTitle>
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
        </TabsContent>
      </Tabs>
    </main>
    </ScrollArea>
  )
}
