import { useId } from "react"
import { SendHorizontal } from "lucide-react"

import { Avatar, AvatarFallback, avatarInitial } from "../components/avatar"
import { Bubble, BubbleContent, BubbleGroup } from "../components/bubble"
import { Button } from "../components/button"
import { Card, CardContent, CardFooter } from "../components/card"
import { Input } from "../components/input"
import { Label } from "../components/label"
import { Message, MessageAvatar, MessageContent, MessageGroup } from "../components/message"

const CONTACT = "Maya Chen"

type Turn = { id: string; sender: string; align: "start" | "end"; text: string }

/** A fixed, fictional two-party exchange: the contact start-aligned, the local user end-aligned. */
const THREAD: readonly Turn[] = [
  { id: "m1", sender: CONTACT, align: "start", text: "Pushed the calmer type scale to preview." },
  { id: "y1", sender: "You", align: "end", text: "Reads well in dark mode too." },
  { id: "m2", sender: CONTACT, align: "start", text: "Can it ride along with Friday's build?" },
  { id: "y2", sender: "You", align: "end", text: "Yes. I'll tag the release." },
]

type Run = { id: string; sender: string; align: "start" | "end"; turns: readonly Turn[] }

/**
 * Consecutive turns from one sender form one run, rendered as one Message with one avatar and a BubbleGroup, as in the
 * shadcn Message pattern. The current thread alternates, so every run holds one turn, but a sender's follow-up bubble
 * joins its run instead of repeating the avatar.
 */
export const chatRuns = (thread: readonly Turn[]): Run[] => thread.reduce<Run[]>((runs, turn) => {
  const last = runs[runs.length - 1]
  if (last && last.sender === turn.sender && last.align === turn.align) runs[runs.length - 1] = { ...last, turns: [...last.turns, turn] }
  else runs.push({ id: turn.id, sender: turn.sender, align: turn.align, turns: [turn] })
  return runs
}, [])

/**
 * PUI-88/95: a compact two-party conversation on the official Message and Bubble resources. Bubbles carry no time or
 * delivery metadata; each run names its sender in sr-only text.
 * PUI-103: there is no contact header, so the thread leads (the heading remains for assistive technology).
 * PUI-111: each run leads with a compact decorative single-initial Avatar in a MessageAvatar, so it sits at the start
 * for the contact and, through the Message's own end alignment, at the end for the local user. The card is a
 * full-height column: the thread expands to fill any height the card is given (its stretched pair), so the composer
 * stays on the card's bottom edge. The composer is one input-styled field holding the borderless Input and, at its far
 * right, an enabled filled semantic-primary icon-only send Button with an accessible name. Sending is a no-op: nothing
 * is sent, inserted or stored, so the card never changes height. PUI-128: the send Button is a fixed local circle
 * (`rounded-full`), a deliberate exception to theme radius; the composer field keeps following the theme radius.
 * PUI-141: the borderless Input inside it is `rounded-none`, as in Quick find, so its native selection stays square.
 */
export function TeamChat() {
  const inputId = useId()
  return (
    <Card>
      <CardContent className="flex-1">
        <h2 className="sr-only">{CONTACT}</h2>
        <MessageGroup role="log" aria-label={`Conversation with ${CONTACT}`}>
          {chatRuns(THREAD).map(run => (
            <Message key={run.id} align={run.align}>
              <MessageAvatar>
                <Avatar aria-hidden="true" className="size-6"><AvatarFallback className="text-xs font-medium">{avatarInitial(run.sender)}</AvatarFallback></Avatar>
              </MessageAvatar>
              <MessageContent>
                <span className="sr-only">{run.sender}</span>
                <BubbleGroup>
                  {run.turns.map(turn => <Bubble key={turn.id} variant={run.align === "end" ? "default" : "muted"}><BubbleContent>{turn.text}</BubbleContent></Bubble>)}
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
              className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 dark:bg-transparent" />
            <Button type="submit" size="icon-sm" aria-label="Send message" className="size-7 shrink-0 cursor-pointer rounded-full"><SendHorizontal /></Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  )
}
