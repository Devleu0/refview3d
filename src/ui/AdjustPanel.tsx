import { useMemo } from 'react'
import { toggleGrayscale } from '../app/actions'
import { createAdjustRecorder, DEFAULT_ADJUST, updateAdjustWithHistory, useAdjustStore, type AdjustSettings } from '../store/adjustStore'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

/** 보정 슬라이더 하나. 끌기·연속 키 입력을 한 히스토리 항목으로 기록한다. */
function AdjustSlider({
  label,
  field,
  ...range
}: {
  label: string
  field: Exclude<keyof AdjustSettings, 'grayscale'>
  min: number
  max: number
  format: (v: number) => string
}) {
  const value = useAdjustStore((s) => s.settings[field])
  const update = useAdjustStore((s) => s.update)
  const record = useMemo(() => createAdjustRecorder(label), [label])
  const gesture = useGestureHistory(() => useAdjustStore.getState().settings, record)
  return <SliderField label={label} value={value} onChange={(v) => update({ [field]: v })} {...range} {...gesture} />
}

const percent = (v: number) => `${Math.round(v)}%`

export function AdjustPanel() {
  const grayscale = useAdjustStore((s) => s.settings.grayscale)

  return (
    <>
      <Panel title="명도 확인">
        <label className="check">
          <input type="checkbox" checked={grayscale} onChange={toggleGrayscale} />
          흑백으로 보기 <kbd>B</kbd>
        </label>
        <p className="hint">색을 빼고 명암 단계만 봅니다. 다른 보정을 반영한 뒤의 명도입니다.</p>
      </Panel>

      <Panel title="색 보정">
        <AdjustSlider label="색상" field="hue" min={-180} max={180} format={(v) => `${Math.round(v)}°`} />
        <AdjustSlider label="채도" field="saturation" min={0} max={200} format={percent} />
        <AdjustSlider label="명도" field="brightness" min={20} max={200} format={percent} />
        <AdjustSlider label="대비" field="contrast" min={20} max={200} format={percent} />
        <button className="wide" onClick={() => updateAdjustWithHistory('보정 초기화', DEFAULT_ADJUST)}>
          보정 초기화
        </button>
        <p className="hint">뷰포트와 내보낸 PNG/PSD에 똑같이 적용됩니다.</p>
      </Panel>
    </>
  )
}
