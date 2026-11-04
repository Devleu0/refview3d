import { create } from 'zustand'

export type SideTab = 'camera' | 'light' | 'lines' | 'adjust' | 'pose' | 'export' | 'history'

interface UiState {
  sideTab: SideTab
  sideOpen: boolean
  /** 왼쪽 라이브러리 서랍 */
  libraryOpen: boolean
  helpOpen: boolean
  setSideTab: (tab: SideTab) => void
  toggleSide: () => void
  toggleLibrary: () => void
  setHelpOpen: (open: boolean) => void
}

const STORAGE_KEY = 'refview3d.ui'

/** 탭·패널 열림은 다음 실행에도 유지한다. 저장소를 못 쓰면 기본값으로 동작한다. */
type Saved = Pick<UiState, 'sideTab' | 'sideOpen' | 'libraryOpen'>

function loadSaved(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save({ sideTab, sideOpen, libraryOpen }: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sideTab, sideOpen, libraryOpen }))
  } catch {
    // 저장 실패는 무시한다.
  }
}

const saved = loadSaved()

export const useUiStore = create<UiState>((set, get) => ({
  sideTab: saved.sideTab ?? 'camera',
  sideOpen: saved.sideOpen ?? true,
  libraryOpen: saved.libraryOpen ?? false,
  helpOpen: false,
  setSideTab: (sideTab) => {
    // 접혀 있을 때 탭을 고르면 펼친다.
    set({ sideTab, sideOpen: true })
    save(get())
  },
  toggleSide: () => {
    set((s) => ({ sideOpen: !s.sideOpen }))
    save(get())
  },
  toggleLibrary: () => {
    set((s) => ({ libraryOpen: !s.libraryOpen }))
    save(get())
  },
  setHelpOpen: (helpOpen) => set({ helpOpen }),
}))
