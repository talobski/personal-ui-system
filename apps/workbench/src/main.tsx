import * as React from "react"
import { createRoot } from "react-dom/client"

import { App } from "./App"
import { PreviewFrame } from "./PreviewFrame"
import "./styles.css"

// The preview is this same app loaded in an iframe, so its viewport (and thus the
// ResponsiveDialog's media query) is the selected preview width.
const isPreview = new URLSearchParams(window.location.search).has("preview")

createRoot(document.getElementById("root")!).render(<React.StrictMode>{isPreview ? <PreviewFrame /> : <App />}</React.StrictMode>)
