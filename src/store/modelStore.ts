import { create } from 'zustand'
import type { LoadedModel } from '../loaders/loadModel'
import { openModelFromFile, openModelFromPath } from '../loaders/openModel'
import { useHistoryStore } from './historyStore'
import { useViewerStore } from './viewerStore'

type ModelInfo = Omit<LoadedModel, 'object'>

interface ModelState {
  model: ModelInfo | null
  loading: string | null
  error: string | null

  openPath: (path: string) => Promise<void>
  openFile: (file: File) => Promise<void>
  close: () => void
  clearError: () => void
}

let loadToken = 0

export const useModelStore = create<ModelState>((set) => {
  async function run(label: string, load: () => Promise<LoadedModel>) {
    const token = ++loadToken
    set({ loading: label, error: null })
    try {
      const loaded = await load()
      // 로딩 중에 다른 파일을 열었다면 이 결과는 버린다.
      if (token !== loadToken) return
      useViewerStore.getState().viewer?.setModel(loaded.object)
      // 이전 모델 기준의 기록은 새 모델에 의미가 없으므로 비운다.
      useHistoryStore.getState().clear()
      const { object: _object, ...info } = loaded
      set({ model: info, loading: null })
    } catch (err) {
      if (token !== loadToken) return
      set({ loading: null, error: describeError(err) })
    }
  }

  return {
    model: null,
    loading: null,
    error: null,

    openPath: (path) => run(path, () => openModelFromPath(path)),
    openFile: (file) => run(file.name, () => openModelFromFile(file)),
    close: () => {
      loadToken++
      useViewerStore.getState().viewer?.setModel(null)
      useHistoryStore.getState().clear()
      set({ model: null, loading: null })
    },
    clearError: () => set({ error: null }),
  }
})

function describeError(err: unknown) {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return '모델을 불러오지 못했습니다.'
}
