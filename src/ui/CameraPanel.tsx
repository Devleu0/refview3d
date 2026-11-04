import { useMemo } from 'react'
import { useViewerStore } from '../store/viewerStore'
import { createCameraRecorder, withCameraHistory } from '../viewer/cameraHistory'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

const FOV_PRESETS = [
  { label: '망원', fov: 20 },
  { label: '표준', fov: 45 },
  { label: '광각', fov: 90 },
] as const

/** 시점 프리셋은 뷰포트 아래 독, 그리드는 툴바에 있다. */
export function CameraPanel() {
  const viewer = useViewerStore((s) => s.viewer)
  const fov = useViewerStore((s) => s.fov)
  const keepFraming = useViewerStore((s) => s.keepFraming)
  const setFov = useViewerStore((s) => s.setFov)
  const setKeepFraming = useViewerStore((s) => s.setKeepFraming)

  // 화살표 키를 연달아 누른 것도 하나로 합친다.
  const recordFov = useMemo(() => createCameraRecorder('화각 변경'), [])
  const fovGesture = useGestureHistory(() => viewer?.getCameraState() ?? null, recordFov)

  return (
    <Panel title="화각">
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
      <p className="hint">망원은 평면적이고, 광각은 원근이 과장됩니다.</p>

      <label className="check">
        <input type="checkbox" checked={keepFraming} onChange={(e) => setKeepFraming(e.target.checked)} />
        화각을 바꿔도 대상 크기 유지
      </label>
    </Panel>
  )
}
