import { useEffect, useRef } from 'react'
import { toFilter, useAdjustStore } from '../store/adjustStore'
import { useLightStore } from '../store/lightStore'
import { useLineStore } from '../store/lineStore'
import { recordPose, usePoseStore } from '../store/poseStore'
import type { SettingsState } from '../store/settingsStore'
import { useViewerStore } from '../store/viewerStore'
import type { StoreApi } from 'zustand'
import { trackOrbitHistory } from './cameraHistory'
import { SceneManager } from './SceneManager'

/** 설정 스토어의 현재 값을 적용하고, 바뀔 때마다 다시 적용한다. 반환값: 구독 해제 함수 */
function bindSettings<T>(store: StoreApi<SettingsState<T>>, apply: (settings: T) => void) {
  apply(store.getState().settings)
  return store.subscribe((s, prev) => {
    if (s.settings !== prev.settings) apply(s.settings)
  })
}

/** 포즈 화면 상태를 SceneManager에 적용하고, 포즈 편집 결과를 히스토리·스토어로 돌려준다. */
function bindPose(viewer: SceneManager) {
  const apply = (s: ReturnType<typeof usePoseStore.getState>) => {
    viewer.pose.setEnabled(s.enabled)
    viewer.pose.setMode(s.mode)
    viewer.pose.setChainLength(s.chainLength)
  }
  apply(usePoseStore.getState())
  viewer.onPoseCommit = recordPose
  viewer.onPoseSelect = (selection) => usePoseStore.setState({ selection })
  const stop = usePoseStore.subscribe((s, prev) => {
    if (s.enabled !== prev.enabled || s.mode !== prev.mode || s.chainLength !== prev.chainLength) apply(s)
  })
  return () => {
    stop()
    viewer.onPoseCommit = null
    viewer.onPoseSelect = null
  }
}

/** SceneManager를 DOM에 붙이고 스토어에 등록하는 컴포넌트 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const setViewer = useViewerStore((s) => s.setViewer)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const viewer = new SceneManager(container)
    const unbind = [
      trackOrbitHistory(viewer),
      bindSettings(useLightStore, (s) => viewer.setLighting(s)),
      bindSettings(useLineStore, (s) => viewer.setLines(s)),
      bindSettings(useAdjustStore, (s) => viewer.setColorFilter(toFilter(s))),
      bindPose(viewer),
    ]
    setViewer(viewer)
    return () => {
      for (const fn of unbind) fn()
      setViewer(null)
      viewer.dispose()
    }
  }, [setViewer])

  return <div ref={containerRef} className="viewport" />
}
