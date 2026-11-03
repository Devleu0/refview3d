import { useEffect, useRef } from 'react'
import { useLightStore } from '../store/lightStore'
import { useViewerStore } from '../store/viewerStore'
import { trackOrbitHistory } from './cameraHistory'
import { SceneManager } from './SceneManager'

/** SceneManager를 DOM에 붙이고 스토어에 등록하는 컴포넌트 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const setViewer = useViewerStore((s) => s.setViewer)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const viewer = new SceneManager(container)
    const stopTracking = trackOrbitHistory(viewer)
    viewer.setLighting(useLightStore.getState().settings)
    const stopLighting = useLightStore.subscribe((s, prev) => {
      if (s.settings !== prev.settings) viewer.setLighting(s.settings)
    })
    setViewer(viewer)
    return () => {
      stopLighting()
      stopTracking()
      setViewer(null)
      viewer.dispose()
    }
  }, [setViewer])

  return <div ref={containerRef} className="viewport" />
}
