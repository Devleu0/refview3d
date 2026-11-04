import { useMemo } from 'react'
import { toggleHiddenLines, toggleOutline } from '../app/actions'
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
    <>
      <Panel title="외곽선">
        <label className="check">
          <input type="checkbox" checked={outline} onChange={toggleOutline} />
          외곽선 그리기 <kbd>L</kbd>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={creases}
            disabled={!outline}
            onChange={(e) => updateLinesWithHistory(e.target.checked ? '접힌 모서리 켜기' : '접힌 모서리 끄기', { creases: e.target.checked })}
          />
          접힌 모서리도 그리기
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
      </Panel>

      <Panel title="은선">
        <label className="check">
          <input type="checkbox" checked={hiddenLines} onChange={toggleHiddenLines} />
          가려진 모서리를 점선으로 <kbd>H</kbd>
        </label>
        <p className="hint">상자·건물처럼 각진 모델에 알맞습니다. 뼈대가 있는 메시는 제외됩니다.</p>
      </Panel>
    </>
  )
}
