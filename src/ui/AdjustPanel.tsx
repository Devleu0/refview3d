import { useMemo } from 'react'
import { toggleGrayscale } from '../app/actions'
import { useT, type MessageKey } from '../i18n'
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
  label: MessageKey
  field: Exclude<keyof AdjustSettings, 'grayscale'>
  min: number
  max: number
  format: (v: number) => string
}) {
  const t = useT()
  const text = t(label)
  const value = useAdjustStore((s) => s.settings[field])
  const update = useAdjustStore((s) => s.update)
  const record = useMemo(() => createAdjustRecorder(text), [text])
  const gesture = useGestureHistory(() => useAdjustStore.getState().settings, record)
  return <SliderField label={text} value={value} onChange={(v) => update({ [field]: v })} {...range} {...gesture} />
}

const percent = (v: number) => `${Math.round(v)}%`

export function AdjustPanel() {
  const t = useT()
  const grayscale = useAdjustStore((s) => s.settings.grayscale)

  return (
    <>
      <Panel title={t('adjust.valuePanel')}>
        <label className="check">
          <input type="checkbox" checked={grayscale} onChange={toggleGrayscale} />
          {t('adjust.grayscale')} <kbd>B</kbd>
        </label>
        <p className="hint">{t('adjust.grayscaleHint')}</p>
      </Panel>

      <Panel title={t('adjust.colorPanel')}>
        <AdjustSlider label="adjust.hue" field="hue" min={-180} max={180} format={(v) => `${Math.round(v)}°`} />
        <AdjustSlider label="adjust.saturation" field="saturation" min={0} max={200} format={percent} />
        <AdjustSlider label="adjust.brightness" field="brightness" min={20} max={200} format={percent} />
        <AdjustSlider label="adjust.contrast" field="contrast" min={20} max={200} format={percent} />
        <button className="wide" onClick={() => updateAdjustWithHistory(t('history.adjustReset'), DEFAULT_ADJUST)}>
          {t('adjust.reset')}
        </button>
        <p className="hint">{t('adjust.hint')}</p>
      </Panel>
    </>
  )
}
