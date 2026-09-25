import * as React from "react"
import { createRoot } from "react-dom/client"

import { App } from "./App"
import { PreviewFrame } from "./PreviewFrame"
import "@personal-ui/ui/lib/font-faces"
import "./styles.css"

// The preview is this same app loaded in an iframe, so its viewport (and thus the
// ResponsiveDialog's media query) is the selected preview width.
const isPreview = new URLSearchParams(window.location.search).has("preview")

// Both documents (the Workbench and the isolated preview iframe) render with Tailwind's `antialiased` smoothing at their
// root, so portalled popups and the mobile sidebar sheet inherit it too. Typography tokens and authored type are unchanged.
document.documentElement.classList.add("antialiased")

createRoot(document.getElementById("root")!).render(<React.StrictMode>{isPreview ? <PreviewFrame /> : <App />}</React.StrictMode>)
