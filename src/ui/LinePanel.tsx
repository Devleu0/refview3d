import { useMemo } from 'react'
import { createLineRecorder, updateLinesWithHistory, useLineStore } from '../store/lineStore'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

export function LinePanel() {
  const { outline, creases, lineWidth, hiddenLines } = useLineStore((s) => s.settings)
  const update = useLineStore((s) => s.update)
  const recordWidth = useMemo(() => createLineRecorder('선 굵기'), [])
  const widthGesture = useGestureHistory(() => useLineStore.getState().settings, recordWidth)

  return (
    <Panel title="선화">
      <label className="check">
        <input
          type="checkbox"
          checked={outline}
          onChange={(e) => updateLinesWithHistory(e.target.checked ? '외곽선 켜기' : '외곽선 끄기', { outline: e.target.checked })}
        />
        외곽선
      </label>
      <label className="check indent">
        <input
          type="checkbox"
          checked={creases}
          disabled={!outline}
          onChange={(e) => updateLinesWithHistory(e.target.checked ? '접힌 모서리 켜기' : '접힌 모서리 끄기', { creases: e.target.checked })}
        />
        접힌 모서리 포함
      </label>
      <SliderField
        label="선 굵기"
        value={lineWidth}
        min={0.5}
        max={5}
        step={0.5}
        format={(v) => `${v.toFixed(1)}px`}
        disabled={!outline}
        onChange={(v) => update({ lineWidth: v })}
        {...widthGesture}
      />
      <label className="check" title="가려진 모서리를 점선으로 표시합니다. 뼈대가 있는 메시는 제외됩니다.">
        <input
          type="checkbox"
          checked={hiddenLines}
          onChange={(e) => updateLinesWithHistory(e.target.checked ? '은선 켜기' : '은선 끄기', { hiddenLines: e.target.checked })}
        />
        은선 (가려진 모서리)
      </label>
    </Panel>
  )
}
