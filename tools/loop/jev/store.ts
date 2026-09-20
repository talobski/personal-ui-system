import { appendFile, mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { TimeoutError } from "./types.ts"
import type { Clock, JevFs } from "./types.ts"

export const nodeFs: JevFs = {
  readFile: (path) => readFile(path, "utf8"),
  writeFile: (path, data) => writeFile(path, data, "utf8"),
  rename,
  appendFile: (path, data) => appendFile(path, data, "utf8"),
  mkdir: async (path) => {
    await mkdir(path, { recursive: true })
  },
  async createExclusive(path, data) {
    const handle = await open(path, "wx")
    try {
      await handle.writeFile(data, "utf8")
    } finally {
      await handle.close()
    }
  },
  unlink,
  exists: async (path) => {
    try {
      await stat(path)
      return true
    } catch (error) {
      if (errorCode(error) === "ENOENT") return false
      throw error
    }
  },
}

export const realClock: Clock = {
  now: () => new Date(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeout(ms) {
    let handle: ReturnType<typeof setTimeout> | undefined
    const promise = new Promise<never>((_, reject) => {
      handle = setTimeout(() => reject(new TimeoutError(ms)), ms)
    })
    promise.catch(() => {})
    return { promise, cancel: () => clearTimeout(handle) }
  },
}

export const errorCode = (error: unknown): string | undefined =>
  typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : undefined

export type ProjectPaths = {
  loopDir: string
  statePath: string
  eventsPath: string
  lockPath: string
  decisionPath(runId: string, decisionId: string): string
}

export const projectPaths = (projectDir: string): ProjectPaths => {
  const loopDir = join(projectDir, ".loop")
  return {
    loopDir,
    statePath: join(loopDir, "state.json"),
    eventsPath: join(loopDir, "events.jsonl"),
    lockPath: join(loopDir, "jev.lock"),
    decisionPath: (runId, decisionId) => join(loopDir, "runs", runId, "decisions", `${decisionId}.json`),
  }
}

let tmpCounter = 0

/** Write-then-rename so readers never observe a partial file. */
export async function writeJsonAtomic(fs: JevFs, path: string, value: unknown, clock: Clock): Promise<void> {
  await fs.mkdir(dirname(path))
  const tmp = `${path}.${process.pid}.${clock.now().getTime()}.${++tmpCounter}.tmp`
  try {
    await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`)
    await fs.rename(tmp, path)
  } catch (error) {
    await fs.unlink(tmp).catch(() => {})
    throw error
  }
}

export async function readJson(fs: JevFs, path: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(path))
}

export async function appendEvent(fs: JevFs, path: string, event: unknown): Promise<void> {
  await fs.mkdir(dirname(path))
  await fs.appendFile(path, `${JSON.stringify(event)}\n`)
}

export class LockError extends Error {}

export type LockOptions = { retries?: number; retryMs?: number }

/**
 * Exclusive project lock (create-if-absent). Held only for short counter/log
 * critical sections, never across the network call. A crashed holder leaves
 * the lock file in place and the adapter then fails closed; an operator must
 * inspect and remove it. Stale locks are never broken automatically.
 */
export async function withLock<T>(fs: JevFs, clock: Clock, lockPath: string, options: LockOptions, body: () => Promise<T>): Promise<T> {
  const retries = options.retries ?? 100
  const retryMs = options.retryMs ?? 25
  const token = `${process.pid}@${clock.now().toISOString()}#${++tmpCounter}`
  await fs.mkdir(dirname(lockPath))
  let held = false
  for (let attempt = 0; attempt <= retries && !held; attempt++) {
    try {
      await fs.createExclusive(lockPath, token)
      held = true
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw new LockError(`cannot create lock ${lockPath}: ${String(error)}`)
      if (attempt < retries) await clock.sleep(retryMs)
    }
  }
  if (!held) throw new LockError(`project lock ${lockPath} is held; refusing to proceed`)
  try {
    return await body()
  } finally {
    // Release only our own lock.
    try {
      if ((await fs.readFile(lockPath)) === token) await fs.unlink(lockPath)
    } catch {
      /* lock already gone */
    }
  }
}
