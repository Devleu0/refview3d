import { useMemo } from 'react'
import { useViewerStore } from '../store/viewerStore'
import { createCameraRecorder, withCameraHistory } from '../viewer/cameraHistory'
import type { ViewPreset } from '../viewer/SceneManager'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

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

  // 화살표 키를 연달아 누른 것도 하나로 합친다.
  const recordFov = useMemo(() => createCameraRecorder('화각 변경'), [])
  const fovGesture = useGestureHistory(() => viewer?.getCameraState() ?? null, recordFov)

  return (
    <Panel title="카메라">
      <SliderField
        label="화각(FOV)"
        value={fov}
        min={10}
        max={120}
        format={(v) => `${Math.round(v)}°`}
        onChange={setFov}
        {...fovGesture}
      />

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
