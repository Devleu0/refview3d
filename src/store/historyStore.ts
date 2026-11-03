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
