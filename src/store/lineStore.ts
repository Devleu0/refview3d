import { create } from 'zustand'
import { createMergingRecorder, useHistoryStore } from './historyStore'

export interface LineSettings {
  /** 실루엣·겹치는 경계(깊이 차)에 선을 그린다 */
  outline: boolean
  /** 접힌 모서리(면 방향 차)에도 선을 그린다 */
  creases: boolean
  /** 선 굵기(px) */
  lineWidth: number
  /** 가려진 모서리를 점선으로 그린다 (스킨드 메시 제외) */
  hiddenLines: boolean
}

export const DEFAULT_LINES: LineSettings = {
  outline: false,
  creases: true,
  lineWidth: 1.5,
  hiddenLines: false,
}

interface LineState {
  settings: LineSettings
  /** 일부 값을 바꾼다. 히스토리는 호출하는 쪽에서 기록한다. */
  update: (partial: Partial<LineSettings>) => void
  /** 설정을 통째로 적용한다 (Undo/Redo용). */
  apply: (settings: LineSettings) => void
}

export const useLineStore = create<LineState>((set) => ({
  settings: DEFAULT_LINES,
  update: (partial) => set((s) => ({ settings: { ...s.settings, ...partial } })),
  apply: (settings) => set({ settings }),
}))

function sameSettings(a: LineSettings, b: LineSettings) {
  return (Object.keys(a) as (keyof LineSettings)[]).every((k) => a[k] === b[k])
}

const applySettings = (settings: LineSettings) => useLineStore.getState().apply(settings)

/** 연달아 바꾼 선화 설정(슬라이더 등)을 한 항목으로 합치는 기록기 */
export function createLineRecorder(label: string) {
  return createMergingRecorder(label, applySettings, sameSettings)
}

/** 선화 설정을 바꾸고 한 번의 히스토리 항목으로 기록한다. */
export function updateLinesWithHistory(label: string, partial: Partial<LineSettings>) {
  const before = useLineStore.getState().settings
  useLineStore.getState().update(partial)
  const after = useLineStore.getState().settings
  if (sameSettings(before, after)) return
  useHistoryStore.getState().push({ label, undo: () => applySettings(before), redo: () => applySettings(after) })
}
