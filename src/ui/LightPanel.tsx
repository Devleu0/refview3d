import { useMemo } from 'react'
import { SHADING_MODES, setShading } from '../app/actions'
import { useT, type MessageKey } from '../i18n'
import {
  createLightRecorder,
  DEFAULT_LIGHT,
  LIGHT_PRESETS,
  updateLightWithHistory,
  useLightStore,
  type LightSettings,
} from '../store/lightStore'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

const degrees = (v: number) => `${Math.round(v)}°`
const decimal = (v: number) => v.toFixed(1)

/** 조명 슬라이더 하나. 끌기·연속 키 입력을 한 히스토리 항목으로 기록한다. */
function LightSlider({
  label,
  field,
  ...range
}: {
  label: MessageKey
  field: keyof LightSettings
  min: number
  max: number
  step?: number
  format?: (v: number) => string
}) {
  const t = useT()
  const text = t(label)
  const value = useLightStore((s) => s.settings[field]) as number
  const update = useLightStore((s) => s.update)
  const record = useMemo(() => createLightRecorder(text), [text])
  const gesture = useGestureHistory(() => useLightStore.getState().settings, record)
  return <SliderField label={text} value={value} onChange={(v) => update({ [field]: v })} {...range} {...gesture} />
}

export function LightPanel() {
  const t = useT()
  const shading = useLightStore((s) => s.settings.shading)
  const shadows = useLightStore((s) => s.settings.shadows)
  const azimuth = useLightStore((s) => s.settings.keyAzimuth)
  const elevation = useLightStore((s) => s.settings.keyElevation)

  return (
    <>
      <Panel title={t('light.shadingPanel')}>
        <div className="button-row" role="group" aria-label={t('toolbar.shadingGroup')}>
          {SHADING_MODES.map((m) => (
            <button key={m.mode} title={t(m.title)} aria-pressed={shading === m.mode} onClick={() => setShading(m.mode)}>
              {t(m.label)}
            </button>
          ))}
        </div>
        {shading === 'toon' && (
          <LightSlider label="light.toonSteps" field="toonSteps" min={2} max={5} format={(v) => t('light.toonStepsValue', { count: v })} />
        )}
      </Panel>

      <Panel title={t('light.keyPanel')}>
        <div className="button-grid">
          {LIGHT_PRESETS.map((p) => (
            <button
              key={p.label}
              aria-pressed={azimuth === p.azimuth && elevation === p.elevation}
              onClick={() => updateLightWithHistory(t('history.lightPreset', { label: t(p.label) }), { keyAzimuth: p.azimuth, keyElevation: p.elevation })}
            >
              {t(p.label)}
            </button>
          ))}
        </div>

        <LightSlider label="light.direction" field="keyAzimuth" min={-180} max={180} format={degrees} />
        <LightSlider label="light.height" field="keyElevation" min={-45} max={90} format={degrees} />
        <LightSlider label="light.intensity" field="keyIntensity" min={0} max={5} step={0.1} format={decimal} />
        <label className="check">
          <input
            type="checkbox"
            checked={shadows}
            onChange={(e) => updateLightWithHistory(t(e.target.checked ? 'history.shadowsOn' : 'history.shadowsOff'), { shadows: e.target.checked })}
          />
          {t('light.shadows')}
        </label>
      </Panel>

      <Panel title={t('light.fillPanel')}>
        <LightSlider label="light.fill" field="fillIntensity" min={0} max={2} step={0.05} format={decimal} />
        <LightSlider label="light.ambient" field="ambientIntensity" min={0} max={2} step={0.05} format={decimal} />
        <button className="wide" onClick={() => updateLightWithHistory(t('history.lightReset'), DEFAULT_LIGHT)}>
          {t('light.reset')}
        </button>
      </Panel>
    </>
  )
}
