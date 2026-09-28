import { useId } from "react"
import { SendHorizontal } from "lucide-react"

import { Bubble, BubbleContent, BubbleGroup } from "../components/bubble"
import { Button } from "../components/button"
import { Card, CardContent, CardFooter } from "../components/card"
import { Input } from "../components/input"
import { Label } from "../components/label"
import { Message, MessageContent, MessageGroup } from "../components/message"

const CONTACT = "Maya Chen"

type Turn = { id: string; sender: string; align: "start" | "end"; text: string }

/** A fixed, fictional two-party exchange: the contact start-aligned, the local user end-aligned. */
const THREAD: readonly Turn[] = [
  { id: "m1", sender: CONTACT, align: "start", text: "Pushed the calmer type scale to preview." },
  { id: "y1", sender: "You", align: "end", text: "Reads well in dark mode too." },
  { id: "m2", sender: CONTACT, align: "start", text: "Can it ride along with Friday's build?" },
  { id: "y2", sender: "You", align: "end", text: "Yes. I'll tag the release." },
]

/**
 * PUI-88/95: a compact two-party conversation on the official Message and Bubble resources. Bubbles carry no
 * per-message avatar, time or delivery metadata; each turn names its sender in sr-only text.
 * PUI-103: there is no contact header, so the thread leads (the heading remains for assistive technology). The composer
 * is one input-styled field, as in Quick find, holding the borderless Input and, at its far right, a disabled muted
 * icon-only send Button with an accessible name. Nothing is sent or inserted, so the card never changes height.
 */
export function TeamChat() {
  const inputId = useId()
  return (
    <Card>
      <CardContent>
        <h2 className="sr-only">{CONTACT}</h2>
        <MessageGroup role="log" aria-label={`Conversation with ${CONTACT}`}>
          {THREAD.map(turn => (
            <Message key={turn.id} align={turn.align}>
              <MessageContent>
                <span className="sr-only">{turn.sender}</span>
                <BubbleGroup>
                  <Bubble variant={turn.align === "end" ? "default" : "muted"}><BubbleContent>{turn.text}</BubbleContent></Bubble>
                </BubbleGroup>
              </MessageContent>
            </Message>
          ))}
        </MessageGroup>
      </CardContent>
      <CardFooter>
        <form className="w-full min-w-0" onSubmit={event => event.preventDefault()}>
          <Label htmlFor={inputId} className="sr-only">Message {CONTACT}</Label>
          <div data-slot="chat-composer" className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-input pr-0.5 pl-3 shadow-xs transition-[color,box-shadow] has-[input:focus-visible]:border-ring has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-ring/50 dark:bg-input/30">
            <Input id={inputId} name="message" autoComplete="off" placeholder="Type your message..."
              className="h-auto min-w-0 flex-1 border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 dark:bg-transparent" />
            <Button type="submit" variant="ghost" size="icon-sm" disabled aria-label="Send message" className="shrink-0 text-muted-foreground"><SendHorizontal /></Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  )
}
