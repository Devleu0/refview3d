import { useEffect, useRef } from 'react'
import { useViewerStore } from '../store/viewerStore'
import { SceneManager } from './SceneManager'

/** SceneManager를 DOM에 붙이고 스토어에 등록하는 컴포넌트 */
export function Viewport() {
  const containerRef = useRef<HTMLDivElement>(null)
  const setViewer = useViewerStore((s) => s.setViewer)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const viewer = new SceneManager(container)
    setViewer(viewer)
    return () => {
      setViewer(null)
      viewer.dispose()
    }
  }, [setViewer])

  return <div ref={containerRef} className="viewport" />
}
