import { create } from 'zustand'

/**
 * 되돌릴 수 있는 작업 하나.
 * 모든 편집 기능(카메라, 조명, 포즈, 색 보정 등)은 이 형태로 기록한다.
 */
export interface Command {
  label: string
  undo: () => void
  redo: () => void
}

const LIMIT = 100

interface HistoryState {
  past: Command[]
  future: Command[]

  /** 이미 적용된 작업을 기록한다. */
  push: (command: Command) => void
  /** 작업을 적용하고 기록한다. */
  execute: (command: Command) => void
  undo: () => void
  redo: () => void
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  push: (command) =>
    set((s) => ({
      past: [...s.past, command].slice(-LIMIT),
      future: [],
    })),
  execute: (command) => {
    command.redo()
    get().push(command)
  },
  undo: () => {
    const { past, future } = get()
    const command = past.at(-1)
    if (!command) return
    command.undo()
    set({ past: past.slice(0, -1), future: [command, ...future] })
  },
  redo: () => {
    const { past, future } = get()
    const [command, ...rest] = future
    if (!command) return
    command.redo()
    set({ past: [...past, command], future: rest })
  },
  clear: () => set({ past: [], future: [] }),
}))

/**
 * 상태 스냅샷 before → after 변경을 기록하는 함수를 만든다.
 * 짧은 간격으로 이어지는 변경(슬라이더를 화살표 키로 여러 번 누르는 경우 등)은 한 항목으로 합치고,
 * 그 사이 다른 작업이 기록되었으면 새 항목을 만든다.
 */
export function createMergingRecorder<T>(
  label: string,
  apply: (state: T) => void,
  same: (a: T, b: T) => boolean,
  mergeWindowMs = 800,
) {
  let last: { command: Command; after: T; at: number } | null = null

  return (before: T, after: T) => {
    const now = performance.now()
    const top = useHistoryStore.getState().past.at(-1)
    if (last && top === last.command && now - last.at < mergeWindowMs) {
      last.after = after
      last.at = now
      return
    }
    if (same(before, after)) return
    const entry: { command: Command; after: T; at: number } = {
      after,
      at: now,
      // after는 합쳐지면서 바뀌므로 실행 시점에 읽는다.
      command: { label, undo: () => apply(before), redo: () => apply(entry.after) },
    }
    last = entry
    useHistoryStore.getState().push(entry.command)
  }
}
