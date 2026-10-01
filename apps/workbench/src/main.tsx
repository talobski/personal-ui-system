import * as React from "react"
import { createRoot } from "react-dom/client"

import { App } from "./App"
import { Landing, NotFound } from "./Landing"
import { PreviewFrame } from "./PreviewFrame"
import { initialRoute, useRoute } from "./routes"
import type { Route } from "./routes"
import "@personal-ui/ui/lib/font-faces"
import "./styles.css"

// The preview is this same app loaded in an iframe at `/workbench?preview=1`, so its viewport (and thus the
// ResponsiveDialog's media query) is the preview panel. Only that exact Workbench URL selects the preview entry.
const isPreview = initialRoute().kind === "preview"

// Both documents (the Workbench and the isolated preview iframe) render with Tailwind's `antialiased` smoothing at their
// root, so portalled popups and the mobile sidebar sheet inherit it too. Typography tokens and authored type are unchanged.
document.documentElement.classList.add("antialiased")

const TITLES: Record<Route["kind"], string> = {
  landing: "Personal UI — a personal design system on shadcn/ui",
  workbench: "Personal UI Workbench",
  preview: "Personal UI Workbench",
  "not-found": "Page not found · Personal UI",
}

/** The top-level document: one route at a time, switched by the History API without reloading. */
function Root() {
  const route = useRoute()
  React.useEffect(() => {
    document.title = TITLES[route.kind]
  }, [route.kind])
  switch (route.kind) {
    case "landing":
      return <Landing />
    case "workbench":
      return <App routeThemeId={route.themeId} />
    case "preview":
      return <PreviewFrame />
    case "not-found":
      return <NotFound />
  }
}

createRoot(document.getElementById("root")!).render(<React.StrictMode>{isPreview ? <PreviewFrame /> : <Root />}</React.StrictMode>)
