import { create } from 'zustand'
import {
  addLibraryFolder,
  CHANGED_EVENT,
  listLibrary,
  markThumbnailFailed,
  pickFolder,
  removeLibraryFolder,
  rescanLibrary,
  saveThumbnail,
  type LibraryFolder,
  type LibraryModel,
  type LibrarySnapshot,
} from '../library/libraryApi'
import { thumbnailer } from '../library/thumbnailer'
import { isTauri } from '../platform/env'
import { useModelStore } from './modelStore'
import { useToastStore } from './toastStore'

interface LibraryState {
  /** 데스크톱 앱에서만 쓸 수 있다 (폴더 감시·DB가 Rust 쪽에 있다) */
  available: boolean
  folders: LibraryFolder[]
  models: LibraryModel[]
  loaded: boolean
  query: string
  /** 폴더 필터. null이면 전체 */
  folderId: number | null
  /** 썸네일 만드는 진행 상황 */
  thumbProgress: { done: number; total: number } | null

  setQuery: (query: string) => void
  setFolderId: (id: number | null) => void
  refresh: () => Promise<void>
  addFolder: () => Promise<void>
  removeFolder: (id: number) => Promise<void>
  rescan: () => Promise<void>
  open: (model: LibraryModel) => Promise<void>
}

export const useLibraryStore = create<LibraryState>((set, get) => {
  function applySnapshot(snapshot: LibrarySnapshot) {
    const folderId = get().folderId
    set({
      folders: snapshot.folders,
      models: snapshot.models,
      loaded: true,
      // 필터로 고른 폴더가 빠졌으면 전체로 돌아간다.
      folderId: folderId !== null && snapshot.folders.some((f) => f.id === folderId) ? folderId : null,
    })
    void generateThumbnails()
  }

  async function guard(task: () => Promise<LibrarySnapshot>) {
    try {
      applySnapshot(await task())
    } catch (err) {
      useToastStore.getState().show(String(err), 'error')
    }
  }

  let generating = false
  /** 썸네일이 없거나 오래된 모델을 하나씩 그려 저장한다. 도중에 목록이 바뀌면 남은 것을 다시 계산한다. */
  async function generateThumbnails() {
    if (generating) return
    generating = true
    try {
      let done = 0
      for (;;) {
        const pending = get().models.filter((m) => !m.thumb && !m.thumbFailed)
        if (pending.length === 0) break
        set({ thumbProgress: { done, total: done + pending.length } })
        const model = pending[0]
        let thumb: string | null = null
        try {
          thumb = await saveThumbnail(model, await thumbnailer().render(model.path))
        } catch {
          await markThumbnailFailed(model).catch(() => {})
        }
        done++
        set((s) => ({
          models: s.models.map((m) => (m.id === model.id && m.modified === model.modified ? { ...m, thumb, thumbFailed: !thumb } : m)),
        }))
        // 뷰포트 조작이 끊기지 않게 한 장마다 잠깐 양보한다.
        await new Promise((r) => setTimeout(r, 16))
      }
    } finally {
      generating = false
      set({ thumbProgress: null })
    }
  }

  return {
    available: isTauri,
    folders: [],
    models: [],
    loaded: false,
    query: '',
    folderId: null,
    thumbProgress: null,

    setQuery: (query) => set({ query }),
    setFolderId: (folderId) => set({ folderId }),
    refresh: () => guard(listLibrary),
    addFolder: async () => {
      const path = await pickFolder()
      if (path) await guard(() => addLibraryFolder(path))
    },
    removeFolder: (id) => guard(() => removeLibraryFolder(id)),
    rescan: () => guard(rescanLibrary),
    open: (model) => useModelStore.getState().openPath(model.path),
  }
})

/** 앱 시작 시 한 번: 목록을 읽고, Rust가 폴더 변화를 알리면 다시 읽는다. */
export async function initLibrary() {
  if (!isTauri) return
  const { listen } = await import('@tauri-apps/api/event')
  await listen(CHANGED_EVENT, () => void useLibraryStore.getState().refresh())
  await useLibraryStore.getState().refresh()
}

/** 검색어·폴더 필터를 적용한 목록 */
export function filterModels(models: LibraryModel[], query: string, folderId: number | null) {
  const q = query.trim().toLowerCase()
  return models.filter((m) => (folderId === null || m.folderId === folderId) && (!q || m.name.toLowerCase().includes(q)))
}
