import { useRef } from 'react'
import { useViewerStore } from '../store/viewerStore'
import { recordCameraChange, withCameraHistory } from '../viewer/cameraHistory'
import type { CameraState, ViewPreset } from '../viewer/SceneManager'
import { Panel } from './Panel'

const FOV_PRESETS = [
  { label: '망원', fov: 20 },
  { label: '표준', fov: 45 },
  { label: '광각', fov: 90 },
] as const

const VIEW_PRESETS: { label: string; preset: ViewPreset }[] = [
  { label: '정면', preset: 'front' },
  { label: '후면', preset: 'back' },
  { label: '좌측', preset: 'left' },
  { label: '우측', preset: 'right' },
  { label: '상단', preset: 'top' },
  { label: '3/4', preset: 'threeQuarter' },
]

export function CameraPanel() {
  const viewer = useViewerStore((s) => s.viewer)
  const fov = useViewerStore((s) => s.fov)
  const keepFraming = useViewerStore((s) => s.keepFraming)
  const gridVisible = useViewerStore((s) => s.gridVisible)
  const setFov = useViewerStore((s) => s.setFov)
  const setKeepFraming = useViewerStore((s) => s.setKeepFraming)
  const setGridVisible = useViewerStore((s) => s.setGridVisible)

  // 슬라이더를 끄는 동안은 실시간으로 적용하고, 손을 뗄 때 한 번만 기록한다.
  const dragStart = useRef<CameraState | null>(null)
  const beginFovEdit = () => {
    if (viewer && !dragStart.current) dragStart.current = viewer.getCameraState()
  }
  const endFovEdit = () => {
    if (viewer && dragStart.current) recordCameraChange('화각 변경', dragStart.current, viewer.getCameraState())
    dragStart.current = null
  }

  return (
    <Panel title="카메라">
      <label className="field">
        <span className="field-label">
          화각(FOV) <output>{Math.round(fov)}°</output>
        </span>
        <input
          type="range"
          min={10}
          max={120}
          step={1}
          value={fov}
          onPointerDown={beginFovEdit}
          onKeyDown={beginFovEdit}
          onChange={(e) => {
            beginFovEdit()
            setFov(Number(e.target.value))
          }}
          onPointerUp={endFovEdit}
          onKeyUp={endFovEdit}
          onBlur={endFovEdit}
        />
      </label>

      <div className="button-row">
        {FOV_PRESETS.map((p) => (
          <button
            key={p.fov}
            onClick={() => withCameraHistory(`화각 ${p.label}`, () => setFov(p.fov))}
            aria-pressed={Math.round(fov) === p.fov}
          >
            {p.label} {p.fov}°
          </button>
        ))}
      </div>

      <label className="check">
        <input type="checkbox" checked={keepFraming} onChange={(e) => setKeepFraming(e.target.checked)} />
        화각 변경 시 대상 크기 유지
      </label>
      <label className="check">
        <input type="checkbox" checked={gridVisible} onChange={(e) => setGridVisible(e.target.checked)} />
        바닥 그리드
      </label>

      <div className="button-grid">
        {VIEW_PRESETS.map((v) => (
          <button
            key={v.preset}
            onClick={() => withCameraHistory(`${v.label} 시점`, (vw) => vw.setViewPreset(v.preset))}
            disabled={!viewer}
          >
            {v.label}
          </button>
        ))}
      </div>
      <button className="wide" onClick={() => withCameraHistory('화면 맞추기', (vw) => vw.frame())} disabled={!viewer}>
        화면에 맞추기 (F)
      </button>
    </Panel>
  )
}
