import { useState } from "react"
import { Heart, Pause, Play, Repeat, SkipBack, SkipForward } from "lucide-react"

import { Button } from "../components/button"
import { Card, CardContent } from "../components/card"
import { Slider } from "../components/slider"

/** A fictional local queue; nothing streams or plays audio. Durations and positions are seconds. */
const QUEUE = [
  { title: "Slow Light", artist: "Harbor Lines", album: "Side A · 03", duration: 232, position: 84 },
  { title: "Paper Weather", artist: "Harbor Lines", album: "Side A · 04", duration: 198, position: 0 },
  { title: "Long Evening", artist: "Harbor Lines", album: "Side B · 01", duration: 261, position: 0 },
] as const
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

/**
 * PUI-92: a token-driven player. Controls change only local state (track, position, play/pause, like, repeat); text
 * truncates and times use fixed-width mono numerals, so no interaction changes the card's geometry.
 */
export function NowPlaying() {
  const [index, setIndex] = useState(0)
  const [position, setPosition] = useState<number>(QUEUE[0].position)
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(true)
  const [repeat, setRepeat] = useState(false)
  const track = QUEUE[index]!
  const go = (step: number) => { const next = (index + step + QUEUE.length) % QUEUE.length; setIndex(next); setPosition(QUEUE[next]!.position) }
  return (
    <Card>
      <CardContent className="grid gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <div aria-hidden="true" className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-linear-135 from-chart-1 via-chart-2 to-chart-4 shadow-sm">
            <span className="grid size-9 place-items-center rounded-full border-2 border-background/60">
              <span className="size-2 rounded-full bg-background/80" />
            </span>
          </div>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <h2 className="font-mono text-xs text-muted-foreground uppercase">Now playing</h2>
            <p className="type-heading truncate text-lg">{track.title}</p>
            <p className="truncate text-sm text-muted-foreground">{track.artist} · <span className="font-mono text-xs">{track.album}</span></p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Like" aria-pressed={liked} onClick={() => setLiked(value => !value)} className="shrink-0 cursor-pointer">
            <Heart className={liked ? "fill-current text-primary" : "text-muted-foreground"} />
          </Button>
        </div>
        <div className="grid gap-2">
          <Slider value={[position]} min={0} max={track.duration} step={1} onValueChange={([value]) => setPosition(value ?? 0)} aria-label="Track position" aria-valuetext={`${clock(position)} of ${clock(track.duration)}`} />
          <div className="flex justify-between font-mono text-xs text-muted-foreground tabular-nums">
            <span>{clock(position)}</span>
            <span>-{clock(track.duration - position)}</span>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <span />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Previous track" onClick={() => go(-1)} className="cursor-pointer"><SkipBack /></Button>
            <Button size="icon-lg" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(value => !value)} className="cursor-pointer rounded-full">
              {playing ? <Pause className="fill-current" /> : <Play className="fill-current" />}
            </Button>
            <Button variant="ghost" size="icon" aria-label="Next track" onClick={() => go(1)} className="cursor-pointer"><SkipForward /></Button>
          </div>
          <Button variant="ghost" size="icon" aria-label="Repeat" aria-pressed={repeat} onClick={() => setRepeat(value => !value)} className={`cursor-pointer justify-self-end ${repeat ? "text-primary" : "text-muted-foreground"}`}><Repeat /></Button>
        </div>
      </CardContent>
    </Card>
  )
}
