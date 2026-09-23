import type { Meta, StoryObj } from "@storybook/react-vite"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./resizable-panel"

function Example() {
  return <div className="h-80 w-[min(900px,90vw)]"><ResizablePanelGroup orientation="horizontal">
    <ResizablePanel id="editor" defaultSize="35%" minSize="25%" maxSize="50%"><div className="p-4">Editor</div></ResizablePanel>
    <ResizableHandle aria-label="Resize editor" />
    <ResizablePanel id="preview"><div className="p-4">Preview</div></ResizablePanel>
  </ResizablePanelGroup></div>
}
export default { title: "Components/Resizable Panel", component: Example } satisfies Meta<typeof Example>
export const Default: StoryObj<typeof Example> = {}
