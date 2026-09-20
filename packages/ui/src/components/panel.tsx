import * as React from "react"
import { cn } from "cn"

import { Card, CardContent, CardHeader, CardTitle } from "@personal-ui/ui/components/card"

/** A titled workbench surface: a semantic labelled section composed from shadcn Card. */
function Panel({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id}>
      <Card className="gap-4 py-4">
        <CardHeader className="px-4">
          <CardTitle>
            <h2 id={id} className="text-base font-semibold">
              {title}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("grid gap-3 px-4", className)}>{children}</CardContent>
      </Card>
    </section>
  )
}

export { Panel }
