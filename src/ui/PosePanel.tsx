import { useMemo } from 'react'
import { togglePoseMode } from '../app/actions'
import { boneLabel, useT } from '../i18n'
import { useModelStore } from '../store/modelStore'
import { createPoseRecorder, usePoseStore } from '../store/poseStore'
import { useViewerStore } from '../store/viewerStore'
import type { PoseSnapshot } from '../viewer/PoseController'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

function ScaleSlider({ name, scale }: { name: string; scale: number }) {
  const t = useT()
  const viewer = useViewerStore((s) => s.viewer)
  // 관절마다 따로 기록되도록 이름을 라벨에 넣는다.
  const label = t('history.boneScale', { name: boneLabel(name) })
  const record = useMemo(() => createPoseRecorder(label), [label])
  const gesture = useGestureHistory<PoseSnapshot>(() => viewer?.pose.snapshot() ?? null, record)
  return (
    <SliderField
      label={t('pose.scale')}
      value={scale}
      min={0.5}
      max={2}
      step={0.05}
      format={(v) => `${Math.round(v * 100)}%`}
      onChange={(v) => {
        viewer?.pose.setSelectedScale(v)
        usePoseStore.setState((s) => (s.selection ? { selection: { ...s.selection, scale: v } } : s))
      }}
      {...gesture}
    />
  )
}

export function PosePanel() {
  const t = useT()
  const model = useModelStore((s) => s.model)
  const openMannequin = useModelStore((s) => s.openMannequin)
  const viewer = useViewerStore((s) => s.viewer)
  const { enabled, mode, chainLength, selection, setMode, setChainLength } = usePoseStore()
  const rigged = !!model?.hasSkeleton

  if (!rigged) {
    return (
      <Panel title={t('pose.panel')}>
        <p className="hint">{t(model ? 'pose.noSkeleton' : 'pose.noModel')}</p>
        <button className="wide" onClick={() => void openMannequin()}>
          {t('pose.openMannequin')}
        </button>
        <p className="hint">{t('pose.mannequinHint')}</p>
      </Panel>
    )
  }

  return (
    <>
      <Panel title={t('pose.panel')}>
        <label className="check">
          <input type="checkbox" checked={enabled} onChange={togglePoseMode} />
          {t('pose.edit')} <kbd>R</kbd>
        </label>
        <div className="button-row" role="group" aria-label={t('pose.tools')}>
          <button aria-pressed={mode === 'rotate'} disabled={!enabled} onClick={() => setMode('rotate')} title={t('pose.rotateTitle')}>
            {t('pose.rotate')}
          </button>
          <button aria-pressed={mode === 'ik'} disabled={!enabled} onClick={() => setMode('ik')} title={t('pose.ikTitle')}>
            {t('pose.ik')}
          </button>
        </div>
        {mode === 'ik' && (
          <div className="button-row" role="group" aria-label={t('pose.chain')}>
            {[2, 3].map((n) => (
              <button key={n} aria-pressed={chainLength === n} disabled={!enabled} onClick={() => setChainLength(n)}>
                {t('pose.chainValue', { count: n })}
              </button>
            ))}
          </div>
        )}
        <p className="hint">{t(enabled ? (mode === 'ik' ? 'pose.ikHint' : 'pose.rotateHint') : 'pose.offHint')}</p>
      </Panel>

      <Panel title={selection ? t('pose.jointNamed', { name: boneLabel(selection.name) }) : t('pose.joint')}>
        {selection ? (
          <>
            <ScaleSlider name={selection.name} scale={selection.scale} />
            <p className="hint">{t('pose.scaleHint')}</p>
            <button className="wide" onClick={() => viewer?.pose.resetSelected()}>
              {t('pose.resetJoint')}
            </button>
          </>
        ) : (
          <p className="hint">{t(enabled ? 'pose.selectToScale' : 'pose.enableToSelect')}</p>
        )}
        <button className="wide" onClick={() => viewer?.pose.resetAll()}>
          {t('pose.resetAll')}
        </button>
      </Panel>
    </>
  )
}
