import { useMemo } from 'react'
import { applyPerspectivePreset, PERSPECTIVE_PRESETS, toggleGuides } from '../app/actions'
import { useT, type MessageKey } from '../i18n'
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
  label: MessageKey
  field: 'lineCount' | 'opacity'
  min: number
  max: number
  step?: number
  format: (v: number) => string
}) {
  const t = useT()
  const text = t(label)
  const value = useGuideStore((s) => s.settings[field])
  const enabled = useGuideStore((s) => s.settings.enabled)
  const update = useGuideStore((s) => s.update)
  const record = useMemo(() => createGuideRecorder(text), [text])
  const gesture = useGestureHistory<GuideSettings>(() => useGuideStore.getState().settings, record)
  return <SliderField label={text} value={value} disabled={!enabled} onChange={(v) => update({ [field]: v })} {...range} {...gesture} />
}

const POINT_LABELS: MessageKey[] = ['perspective.points0', 'perspective.points1', 'perspective.points2', 'perspective.points3']

export function PerspectivePanel() {
  const t = useT()
  const enabled = useGuideStore((s) => s.settings.enabled)
  const horizon = useGuideStore((s) => s.settings.horizon)
  const points = usePerspectivePoints((s) => s.points)

  return (
    <Panel title={t('perspective.panel')}>
      <label className="check">
        <input type="checkbox" checked={enabled} onChange={toggleGuides} />
        {t('perspective.show')} <kbd>P</kbd>
      </label>
      {enabled && points !== null && (
        <p className="perspective-readout" role="status">
          {t('perspective.now')} <strong>{t(POINT_LABELS[points])}</strong>
        </p>
      )}

      <div className="button-row" role="group" aria-label={t('perspective.presets')}>
        {PERSPECTIVE_PRESETS.map((p) => (
          <button key={p.kind} title={t(p.title)} onClick={() => applyPerspectivePreset(p.kind)}>
            {t(p.label)}
          </button>
        ))}
      </div>
      <p className="hint">{t('perspective.presetHint')}</p>

      <GuideSlider label="perspective.lineCount" field="lineCount" min={6} max={40} format={(v) => t('perspective.lineCountValue', { count: v })} />
      <GuideSlider label="perspective.opacity" field="opacity" min={15} max={100} format={(v) => `${v}%`} />
      <label className="check">
        <input
          type="checkbox"
          checked={horizon}
          disabled={!enabled}
          onChange={(e) => updateGuidesWithHistory(t(e.target.checked ? 'history.horizonOn' : 'history.horizonOff'), { horizon: e.target.checked })}
        />
        {t('perspective.horizon')}
      </label>
      <p className="hint axis-legend">
        <span style={{ color: AXIS_COLORS.x }}>■ {t('perspective.axisX')}</span> <span style={{ color: AXIS_COLORS.y }}>■ {t('perspective.axisY')}</span>{' '}
        <span style={{ color: AXIS_COLORS.z }}>■ {t('perspective.axisZ')}</span>
      </p>
    </Panel>
  )
}
