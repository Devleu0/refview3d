import { useMemo } from 'react'
import { applyPerspectivePreset, PERSPECTIVE_PRESETS, toggleGuides } from '../app/actions'
import { createGuideRecorder, updateGuidesWithHistory, useGuideStore, usePerspectivePoints, type GuideSettings } from '../store/guideStore'
import { AXIS_COLORS } from '../viewer/perspective'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

function GuideSlider({
  label,
  field,
  ...range
}: {
  label: string
  field: 'lineCount' | 'opacity'
  min: number
  max: number
  step?: number
  format: (v: number) => string
}) {
  const value = useGuideStore((s) => s.settings[field])
  const enabled = useGuideStore((s) => s.settings.enabled)
  const update = useGuideStore((s) => s.update)
  const record = useMemo(() => createGuideRecorder(label), [label])
  const gesture = useGestureHistory<GuideSettings>(() => useGuideStore.getState().settings, record)
  return <SliderField label={label} value={value} disabled={!enabled} onChange={(v) => update({ [field]: v })} {...range} {...gesture} />
}

const POINT_LABELS = ['평행 투시에 가까움', '1점 투시', '2점 투시', '3점 투시']

export function PerspectivePanel() {
  const enabled = useGuideStore((s) => s.settings.enabled)
  const horizon = useGuideStore((s) => s.settings.horizon)
  const points = usePerspectivePoints((s) => s.points)

  return (
    <Panel title="투시">
      <label className="check">
        <input type="checkbox" checked={enabled} onChange={toggleGuides} />
        투시선 보기 <kbd>P</kbd>
      </label>
      {enabled && points !== null && (
        <p className="perspective-readout" role="status">
          지금 시점: <strong>{POINT_LABELS[points]}</strong>
        </p>
      )}

      <div className="button-row" role="group" aria-label="투시 시점">
        {PERSPECTIVE_PRESETS.map((p) => (
          <button key={p.kind} title={p.title} onClick={() => applyPerspectivePreset(p.kind)}>
            {p.label}
          </button>
        ))}
      </div>
      <p className="hint">대상과 거리는 그대로 두고, 지금 보는 쪽에서 가장 가까운 방향으로 돌립니다.</p>

      <GuideSlider label="선 개수" field="lineCount" min={6} max={40} format={(v) => `${v}개`} />
      <GuideSlider label="선 진하기" field="opacity" min={15} max={100} format={(v) => `${v}%`} />
      <label className="check">
        <input
          type="checkbox"
          checked={horizon}
          disabled={!enabled}
          onChange={(e) => updateGuidesWithHistory(e.target.checked ? '눈높이선 켜기' : '눈높이선 끄기', { horizon: e.target.checked })}
        />
        눈높이선(지평선)
      </label>
      <p className="hint axis-legend">
        <span style={{ color: AXIS_COLORS.x }}>■ 좌우(X)</span> <span style={{ color: AXIS_COLORS.y }}>■ 세로(Y)</span>{' '}
        <span style={{ color: AXIS_COLORS.z }}>■ 앞뒤(Z)</span>
      </p>
    </Panel>
  )
}
