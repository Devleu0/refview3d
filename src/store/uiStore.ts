import { create } from 'zustand'

export type SideTab = 'camera' | 'light' | 'lines' | 'adjust' | 'export' | 'history'

interface UiState {
  sideTab: SideTab
  sideOpen: boolean
  helpOpen: boolean
  setSideTab: (tab: SideTab) => void
  toggleSide: () => void
  setHelpOpen: (open: boolean) => void
}

const STORAGE_KEY = 'refview3d.ui'

/** 탭·패널 열림은 다음 실행에도 유지한다. 저장소를 못 쓰면 기본값으로 동작한다. */
function loadSaved(): Partial<Pick<UiState, 'sideTab' | 'sideOpen'>> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save(state: Pick<UiState, 'sideTab' | 'sideOpen'>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sideTab: state.sideTab, sideOpen: state.sideOpen }))
  } catch {
    // 저장 실패는 무시한다.
  }
}

const saved = loadSaved()

export const useUiStore = create<UiState>((set, get) => ({
  sideTab: saved.sideTab ?? 'camera',
  sideOpen: saved.sideOpen ?? true,
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
  setHelpOpen: (helpOpen) => set({ helpOpen }),
}))
