import * as React from "react"

import { Button } from "@personal-ui/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@personal-ui/ui/components/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@personal-ui/ui/components/drawer"

// Hard replacement: the Drawer is used for viewport widths <= 640px.
const MOBILE_QUERY = "(max-width: 640px)"

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  )
}

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean } | null>(null)

function useResponsiveDialog() {
  const context = React.useContext(ResponsiveDialogContext)
  if (!context) throw new Error("ResponsiveDialog parts must be rendered inside <ResponsiveDialog>")
  return context
}

function ResponsiveDialog(props: React.ComponentProps<typeof Dialog>) {
  const isMobile = useIsMobile()
  const Root = isMobile ? Drawer : Dialog
  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      <Root {...props} />
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  const Part = useResponsiveDialog().isMobile ? DrawerTrigger : DialogTrigger
  return <Part {...props} />
}

function ResponsiveDialogContent(props: React.ComponentProps<typeof DialogContent>) {
  const { isMobile } = useResponsiveDialog()
  if (isMobile) {
    // Dialog-only props (e.g. showCloseButton) do not apply to the Drawer.
    const { showCloseButton: _ignored, ...drawerProps } = props
    return <DrawerContent {...drawerProps} />
  }
  return <DialogContent {...props} />
}

function ResponsiveDialogHeader(props: React.ComponentProps<typeof DialogHeader>) {
  const Part = useResponsiveDialog().isMobile ? DrawerHeader : DialogHeader
  return <Part {...props} />
}

function ResponsiveDialogFooter(props: React.ComponentProps<typeof DialogFooter>) {
  const { isMobile } = useResponsiveDialog()
  if (isMobile) {
    const { showCloseButton, children, ...footerProps } = props
    return (
      <DrawerFooter {...footerProps}>
        {children}
        {showCloseButton && (
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        )}
      </DrawerFooter>
    )
  }
  return <DialogFooter {...props} />
}

function ResponsiveDialogTitle(props: React.ComponentProps<typeof DialogTitle>) {
  const Part = useResponsiveDialog().isMobile ? DrawerTitle : DialogTitle
  return <Part {...props} />
}

function ResponsiveDialogDescription(props: React.ComponentProps<typeof DialogDescription>) {
  const Part = useResponsiveDialog().isMobile ? DrawerDescription : DialogDescription
  return <Part {...props} />
}

function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
  const Part = useResponsiveDialog().isMobile ? DrawerClose : DialogClose
  return <Part {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
}
