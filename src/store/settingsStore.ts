import { create } from 'zustand'
import { createMergingRecorder, useHistoryStore } from './historyStore'

export interface SettingsState<T> {
  settings: T
  /** 일부 값을 바꾼다. 히스토리는 호출하는 쪽에서 기록한다. */
  update: (partial: Partial<T>) => void
  /** 설정을 통째로 적용한다 (Undo/Redo용). */
  apply: (settings: T) => void
}

/**
 * 값 몇 개로 이루어진 설정 묶음(조명, 선화, 색 보정 등)의 스토어와 히스토리 헬퍼를 만든다.
 * - useStore: zustand 스토어
 * - createRecorder: 슬라이더처럼 연달아 바뀌는 변경을 한 항목으로 합치는 기록기
 * - updateWithHistory: 값을 바꾸고 한 번의 히스토리 항목으로 기록
 */
export function createSettingsStore<T extends object>(defaults: T) {
  const useStore = create<SettingsState<T>>((set) => ({
    settings: defaults,
    update: (partial) => set((s) => ({ settings: { ...s.settings, ...partial } })),
    apply: (settings) => set({ settings }),
  }))

  const same = (a: T, b: T) => (Object.keys(a) as (keyof T)[]).every((k) => a[k] === b[k])
  const apply = (settings: T) => useStore.getState().apply(settings)

  return {
    useStore,
    createRecorder: (label: string) => createMergingRecorder(label, apply, same),
    updateWithHistory: (label: string, partial: Partial<T>) => {
      const before = useStore.getState().settings
      useStore.getState().update(partial)
      const after = useStore.getState().settings
      if (same(before, after)) return
      useHistoryStore.getState().push({ label, undo: () => apply(before), redo: () => apply(after) })
    },
  }
}
