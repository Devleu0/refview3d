import { create } from 'zustand'
import type { CameraState, SceneManager } from '../viewer/SceneManager'

interface ViewerState {
  /** 마운트된 뷰포트의 SceneManager. 뷰포트가 없으면 null. */
  viewer: SceneManager | null
  fov: number
  /** 화각 변경 시 대상 크기를 유지(돌리 줌)할지 여부 */
  keepFraming: boolean
  gridVisible: boolean

  setViewer: (viewer: SceneManager | null) => void
  /** 화각을 바꾼다. 히스토리는 호출하는 쪽(UI)에서 기록한다. */
  setFov: (fov: number) => void
  /** 카메라 위치·대상·화각을 통째로 적용한다 (Undo/Redo용). */
  applyCameraState: (state: CameraState) => void
  setKeepFraming: (keep: boolean) => void
  setGridVisible: (visible: boolean) => void
}

export const useViewerStore = create<ViewerState>((set, get) => ({
  viewer: null,
  fov: 45,
  keepFraming: true,
  gridVisible: true,

  setViewer: (viewer) => {
    if (viewer) {
      viewer.setFov(get().fov, false)
      viewer.setGridVisible(get().gridVisible)
    }
    set({ viewer })
  },
  setFov: (fov) => {
    get().viewer?.setFov(fov, get().keepFraming)
    set({ fov })
  },
  applyCameraState: (state) => {
    get().viewer?.setCameraState(state)
    set({ fov: state.fov })
  },
  setKeepFraming: (keepFraming) => set({ keepFraming }),
  setGridVisible: (gridVisible) => {
    get().viewer?.setGridVisible(gridVisible)
    set({ gridVisible })
  },
}))
