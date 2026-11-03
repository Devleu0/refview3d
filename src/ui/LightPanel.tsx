import { useMemo } from 'react'
import {
  createLightRecorder,
  DEFAULT_LIGHT,
  LIGHT_PRESETS,
  updateLightWithHistory,
  useLightStore,
  type LightSettings,
  type ShadingMode,
} from '../store/lightStore'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

const SHADING_MODES: { label: string; mode: ShadingMode; title: string }[] = [
  { label: '원본', mode: 'original', title: '모델의 원래 재질' },
  { label: '클레이', mode: 'clay', title: '회색 단색으로 형태와 명암만 보기' },
  { label: '툰', mode: 'toon', title: '명암을 몇 단계로 끊어 보기' },
]

const degrees = (v: number) => `${Math.round(v)}°`
const decimal = (v: number) => v.toFixed(1)

/** 조명 슬라이더 하나. 끌기·연속 키 입력을 한 히스토리 항목으로 기록한다. */
function LightSlider({
  label,
  field,
  ...range
}: {
  label: string
  field: keyof LightSettings
  min: number
  max: number
  step?: number
  format?: (v: number) => string
}) {
  const value = useLightStore((s) => s.settings[field]) as number
  const update = useLightStore((s) => s.update)
  const record = useMemo(() => createLightRecorder(label), [label])
  const gesture = useGestureHistory(() => useLightStore.getState().settings, record)
  return <SliderField label={label} value={value} onChange={(v) => update({ [field]: v })} {...range} {...gesture} />
}

export function LightPanel() {
  const shading = useLightStore((s) => s.settings.shading)
  const shadows = useLightStore((s) => s.settings.shadows)
  const azimuth = useLightStore((s) => s.settings.keyAzimuth)
  const elevation = useLightStore((s) => s.settings.keyElevation)

  return (
    <Panel title="조명">
      <div className="button-row" role="group" aria-label="음영 방식">
        {SHADING_MODES.map((m) => (
          <button
            key={m.mode}
            title={m.title}
            aria-pressed={shading === m.mode}
            onClick={() => updateLightWithHistory(`음영: ${m.label}`, { shading: m.mode })}
          >
            {m.label}
          </button>
        ))}
      </div>
      {shading === 'toon' && <LightSlider label="툰 단계" field="toonSteps" min={2} max={5} format={(v) => `${v}단계`} />}

      <div className="button-grid">
        {LIGHT_PRESETS.map((p) => (
          <button
            key={p.label}
            aria-pressed={azimuth === p.azimuth && elevation === p.elevation}
            onClick={() => updateLightWithHistory(`조명: ${p.label}`, { keyAzimuth: p.azimuth, keyElevation: p.elevation })}
          >
            {p.label}
          </button>
        ))}
      </div>

      <LightSlider label="주광원 방향" field="keyAzimuth" min={-180} max={180} format={degrees} />
      <LightSlider label="주광원 높이" field="keyElevation" min={-45} max={90} format={degrees} />
      <LightSlider label="주광원 세기" field="keyIntensity" min={0} max={5} step={0.1} format={decimal} />
      <LightSlider label="보조광 세기" field="fillIntensity" min={0} max={2} step={0.05} format={decimal} />
      <LightSlider label="환경광 세기" field="ambientIntensity" min={0} max={2} step={0.05} format={decimal} />

      <label className="check">
        <input
          type="checkbox"
          checked={shadows}
          onChange={(e) => updateLightWithHistory(e.target.checked ? '그림자 켜기' : '그림자 끄기', { shadows: e.target.checked })}
        />
        그림자
      </label>
      <button className="wide" onClick={() => updateLightWithHistory('조명 초기화', DEFAULT_LIGHT)}>
        조명 초기화
      </button>
    </Panel>
  )
}
