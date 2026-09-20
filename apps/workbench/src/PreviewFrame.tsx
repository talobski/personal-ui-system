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

import type { PreviewReady, PreviewState } from "./messages"

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const

/** Runs inside the preview iframe: applies the workbench's theme variables and renders the pilot component states. */
export function PreviewFrame() {
  const [state, setState] = React.useState<PreviewState | null>(null)

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

  return (
    <main
      className="grid gap-6 p-4"
      data-testid="preview"
      data-ready={state ? "true" : "false"}
      data-mode={state?.mode}
      data-theme-id={state?.themeId}
      data-revision={state?.revision}
    >
      <style id="workbench-theme">{state?.css ?? ""}</style>
      <section aria-labelledby="pv-buttons" className="grid gap-2">
        <h2 id="pv-buttons" className="text-sm font-semibold">
          Button
        </h2>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
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
    </main>
  )
}
