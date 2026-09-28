import { useState } from "react"
import { Heart, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react"

import { Button } from "../components/button"
import { Card, CardContent } from "../components/card"
import { Slider } from "../components/slider"

/** A fictional local queue; nothing streams or plays audio. Durations and positions are seconds. */
const QUEUE = [
  { title: "Slow Light", artist: "Harbor Lines", duration: 232, position: 84 },
  { title: "Paper Weather", artist: "Harbor Lines", duration: 198, position: 0 },
  { title: "Long Evening", artist: "Harbor Lines", duration: 261, position: 0 },
] as const
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

/**
 * PUI-106: the five transport controls share one treatment, the ghost Button at the system's `icon-lg` size, so none
 * dominates. lucide-react has no solid variants of these icons, so its official outline icons are used unfilled.
 */
const CONTROL = { variant: "ghost", size: "icon-lg" } as const

/**
 * PUI-92/99: a token-driven player. Each track shows only artwork, title, artist and a far-right favourite. Body-role
 * elapsed/remaining times sit above the progress Slider, and five equal, evenly distributed icon controls follow:
 * Shuffle, Previous, Play/Pause, Next, Repeat. Controls change only local state; text truncates and times use tabular
 * numerals, so no interaction changes the card's geometry. PUI-106: the Slider's thumb fills with the primary token and
 * keeps its primary border, focus ring and track.
 */
export function NowPlaying() {
  const [index, setIndex] = useState(0)
  const [position, setPosition] = useState<number>(QUEUE[0].position)
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(true)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const track = QUEUE[index]!
  const go = (step: number) => { const next = (index + step + QUEUE.length) % QUEUE.length; setIndex(next); setPosition(QUEUE[next]!.position) }
  const toggleClass = (on: boolean) => `cursor-pointer ${on ? "text-primary" : "text-muted-foreground"}`
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
            <h2 className="type-heading truncate text-lg">{track.title}</h2>
            <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Favorite" aria-pressed={liked} onClick={() => setLiked(value => !value)} className="shrink-0 cursor-pointer">
            <Heart className={liked ? "fill-current text-primary" : "text-muted-foreground"} />
          </Button>
        </div>
        <div className="grid gap-2">
          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>{clock(position)}</span>
            <span>-{clock(track.duration - position)}</span>
          </div>
          <Slider className="[&_[data-slot=slider-thumb]]:bg-primary" value={[position]} min={0} max={track.duration} step={1} onValueChange={([value]) => setPosition(value ?? 0)} aria-label="Track position" aria-valuetext={`${clock(position)} of ${clock(track.duration)}`} />
        </div>
        <div className="grid grid-cols-5 items-center justify-items-center">
          <Button {...CONTROL} aria-label="Shuffle" aria-pressed={shuffle} onClick={() => setShuffle(value => !value)} className={toggleClass(shuffle)}><Shuffle /></Button>
          <Button {...CONTROL} aria-label="Previous track" onClick={() => go(-1)} className="cursor-pointer"><SkipBack /></Button>
          <Button {...CONTROL} aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(value => !value)} className="cursor-pointer">{playing ? <Pause /> : <Play />}</Button>
          <Button {...CONTROL} aria-label="Next track" onClick={() => go(1)} className="cursor-pointer"><SkipForward /></Button>
          <Button {...CONTROL} aria-label="Repeat" aria-pressed={repeat} onClick={() => setRepeat(value => !value)} className={toggleClass(repeat)}><Repeat /></Button>
        </div>
      </CardContent>
    </Card>
  )
}
