import { useMemo } from 'react'
import { toggleHiddenLines, toggleOutline } from '../app/actions'
import { useT } from '../i18n'
import { createLineRecorder, updateLinesWithHistory, useLineStore } from '../store/lineStore'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

export function LinePanel() {
  const t = useT()
  const { outline, creases, lineWidth, hiddenLines } = useLineStore((s) => s.settings)
  const update = useLineStore((s) => s.update)
  const widthLabel = t('history.lineWidth')
  const recordWidth = useMemo(() => createLineRecorder(widthLabel), [widthLabel])
  const widthGesture = useGestureHistory(() => useLineStore.getState().settings, recordWidth)

  return (
    <>
      <Panel title={t('lines.outlinePanel')}>
        <label className="check">
          <input type="checkbox" checked={outline} onChange={toggleOutline} />
          {t('lines.outline')} <kbd>L</kbd>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={creases}
            disabled={!outline}
            onChange={(e) => updateLinesWithHistory(t(e.target.checked ? 'history.creasesOn' : 'history.creasesOff'), { creases: e.target.checked })}
          />
          {t('lines.creases')}
        </label>
        <SliderField
          label={t('lines.width')}
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

      <Panel title={t('lines.hiddenPanel')}>
        <label className="check">
          <input type="checkbox" checked={hiddenLines} onChange={toggleHiddenLines} />
          {t('lines.hidden')} <kbd>H</kbd>
        </label>
        <p className="hint">{t('lines.hiddenHint')}</p>
      </Panel>
    </>
  )
}
