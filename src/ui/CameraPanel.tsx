import { useMemo } from 'react'
import { useT, type MessageKey } from '../i18n'
import { useViewerStore } from '../store/viewerStore'
import { createCameraRecorder, withCameraHistory } from '../viewer/cameraHistory'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

const FOV_PRESETS: { label: MessageKey; fov: number }[] = [
  { label: 'camera.tele', fov: 20 },
  { label: 'camera.standard', fov: 45 },
  { label: 'camera.wide', fov: 90 },
]

/** 시점 프리셋은 뷰포트 아래 독, 그리드는 툴바에 있다. */
export function CameraPanel() {
  const t = useT()
  const viewer = useViewerStore((s) => s.viewer)
  const fov = useViewerStore((s) => s.fov)
  const keepFraming = useViewerStore((s) => s.keepFraming)
  const setFov = useViewerStore((s) => s.setFov)
  const setKeepFraming = useViewerStore((s) => s.setKeepFraming)

  // 화살표 키를 연달아 누른 것도 하나로 합친다.
  const fovLabel = t('history.fov')
  const recordFov = useMemo(() => createCameraRecorder(fovLabel), [fovLabel])
  const fovGesture = useGestureHistory(() => viewer?.getCameraState() ?? null, recordFov)

  return (
    <Panel title={t('camera.fovPanel')}>
      <SliderField
        label={t('camera.fov')}
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
            onClick={() => withCameraHistory(t('history.fovPreset', { label: t(p.label) }), () => setFov(p.fov))}
            aria-pressed={Math.round(fov) === p.fov}
          >
            {t(p.label)} {p.fov}°
          </button>
        ))}
      </div>
      <p className="hint">{t('camera.fovHint')}</p>

      <label className="check">
        <input type="checkbox" checked={keepFraming} onChange={(e) => setKeepFraming(e.target.checked)} />
        {t('camera.keepFraming')}
      </label>
    </Panel>
  )
}
