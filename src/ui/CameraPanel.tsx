import { useViewerStore } from '../store/viewerStore'
import type { ViewPreset } from '../viewer/SceneManager'
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
          onChange={(e) => setFov(Number(e.target.value))}
        />
      </label>

      <div className="button-row">
        {FOV_PRESETS.map((p) => (
          <button key={p.fov} onClick={() => setFov(p.fov)} aria-pressed={Math.round(fov) === p.fov}>
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
          <button key={v.preset} onClick={() => viewer?.setViewPreset(v.preset)} disabled={!viewer}>
            {v.label}
          </button>
        ))}
      </div>
      <button className="wide" onClick={() => viewer?.frame()} disabled={!viewer}>
        화면에 맞추기 (F)
      </button>
    </Panel>
  )
}
