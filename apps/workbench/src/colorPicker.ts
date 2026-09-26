export const PICKER_DEBOUNCE_MS = 120
export type PickerOwner = { readonly key: string }

/** One Workbench-local scheduler for semantic and shadow pickers. Never stores theme data. */
export class ColorPickerController {
  private generation = 0
  private timer: ReturnType<typeof setTimeout> | undefined
  private session: { owner: PickerOwner; pending: (() => void) | null } | null = null

  constructor(private readonly begin: (key: string) => void, private readonly end: () => void) {}

  active(owner: PickerOwner) { return this.session?.owner === owner }

  move(owner: PickerOwner, commit: () => void) {
    if (!this.active(owner)) {
      this.finish()
      this.begin(owner.key)
      this.session = { owner, pending: null }
    }
    this.clearTimer()
    this.session!.pending = commit
    const generation = this.generation
    this.timer = setTimeout(() => {
      if (generation !== this.generation || !this.active(owner)) return
      this.timer = undefined
      this.commitPending()
      // A movement pause is not the end of a continuous gesture. Keep its one history base until completion.
    }, PICKER_DEBOUNCE_MS)
  }

  finish(owner?: PickerOwner) {
    if (owner && !this.active(owner)) return
    this.clearTimer()
    const session = this.session
    this.session = null
    if (!session) return
    session.pending?.()
    this.end()
  }

  /** Unmount/lock invalidates callbacks without applying a pending value to a replacement control/theme. */
  cancel(owner?: PickerOwner) {
    if (owner && !this.active(owner)) return
    this.clearTimer()
    const hadSession = this.session !== null
    this.session = null
    if (hadSession) this.end()
  }

  private clearTimer() {
    this.generation++
    clearTimeout(this.timer)
    this.timer = undefined
  }

  private commitPending() {
    const commit = this.session?.pending
    if (this.session) this.session.pending = null
    commit?.()
  }
}
