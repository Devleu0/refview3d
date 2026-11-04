import { useEffect, useRef } from 'react'
import { useGuideStore, usePerspectivePoints } from '../store/guideStore'
import { useViewerStore } from '../store/viewerStore'
import { computeGuides, drawGuides } from '../viewer/perspective'

/** 뷰포트 위에 투시선·지평선을 그리는 2D 캔버스. 3D 렌더 직후 같은 프레임에 다시 그린다. */
export function PerspectiveOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewer = useViewerStore((s) => s.viewer)
  const settings = useGuideStore((s) => s.settings)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!viewer || !canvas) return

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const ratio = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (!settings.enabled || width === 0) {
        usePerspectivePoints.setState({ points: null })
        return
      }
      const guides = computeGuides(viewer.camera, canvas.width, canvas.height)
      drawGuides(ctx, guides, canvas.width, canvas.height, {
        lineCount: settings.lineCount,
        opacity: settings.opacity / 100,
        horizon: settings.horizon,
        scale: ratio,
      })
      if (usePerspectivePoints.getState().points !== guides.points) usePerspectivePoints.setState({ points: guides.points })
    }

    const stop = viewer.onRender(draw)
    // 설정이 바뀌면 카메라가 그대로여도 다시 그린다.
    viewer.requestRender()
    return stop
  }, [viewer, settings])

  return <canvas ref={canvasRef} className="perspective-overlay" aria-hidden="true" />
}
