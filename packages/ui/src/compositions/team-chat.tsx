import { useId } from "react"
import { SendHorizontal } from "lucide-react"

import { Avatar, AvatarFallback, avatarInitial } from "../components/avatar"
import { Bubble, BubbleContent, BubbleGroup } from "../components/bubble"
import { Button } from "../components/button"
import { Card, CardContent, CardFooter, CardHeader } from "../components/card"
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
 * PUI-88/95: a compact two-party conversation on the official Message and Bubble resources. The one contact header
 * (Avatar and name) identifies the other party, so bubbles carry no per-message avatar, time or delivery metadata;
 * each turn still names its sender in sr-only text. The composer is a harmless local affordance: sending is prevented,
 * so nothing is inserted and the card never changes height.
 */
export function TeamChat() {
  const inputId = useId()
  return (
    <Card>
      <CardHeader className="flex items-center gap-3 border-b">
        <Avatar aria-hidden="true"><AvatarFallback className="text-xs font-medium">{avatarInitial(CONTACT)}</AvatarFallback></Avatar>
        <h2 className="type-heading truncate text-base">{CONTACT}</h2>
      </CardHeader>
      <CardContent>
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
        <form className="flex w-full min-w-0 items-center gap-2" onSubmit={event => event.preventDefault()}>
          <Label htmlFor={inputId} className="sr-only">Message {CONTACT}</Label>
          <Input id={inputId} name="message" autoComplete="off" placeholder="Type your message..." className="flex-1" />
          <Button type="submit" size="icon" aria-label="Send message" className="shrink-0 cursor-pointer"><SendHorizontal /></Button>
        </form>
      </CardFooter>
    </Card>
  )
}
