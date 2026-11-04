import { useMemo } from 'react'
import { togglePoseMode } from '../app/actions'
import { useModelStore } from '../store/modelStore'
import { createPoseRecorder, usePoseStore } from '../store/poseStore'
import { useViewerStore } from '../store/viewerStore'
import type { PoseSnapshot } from '../viewer/PoseController'
import { Panel } from './Panel'
import { SliderField } from './SliderField'
import { useGestureHistory } from './useGestureHistory'

function ScaleSlider({ name, scale }: { name: string; scale: number }) {
  const viewer = useViewerStore((s) => s.viewer)
  // 관절마다 따로 기록되도록 이름을 라벨에 넣는다.
  const record = useMemo(() => createPoseRecorder(`${name} 크기`), [name])
  const gesture = useGestureHistory<PoseSnapshot>(() => viewer?.pose.snapshot() ?? null, record)
  return (
    <SliderField
      label="크기 (데포르메)"
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
  const model = useModelStore((s) => s.model)
  const openMannequin = useModelStore((s) => s.openMannequin)
  const viewer = useViewerStore((s) => s.viewer)
  const { enabled, mode, chainLength, selection, setMode, setChainLength } = usePoseStore()
  const rigged = !!model?.hasSkeleton

  if (!rigged) {
    return (
      <Panel title="포즈">
        <p className="hint">
          {model ? '이 모델에는 뼈대가 없어 포즈를 잡을 수 없습니다.' : '뼈대가 있는 FBX·GLTF 모델을 열면 관절을 움직일 수 있습니다.'}
        </p>
        <button className="wide" onClick={() => void openMannequin()}>
          기본 마네킹 열기
        </button>
        <p className="hint">뼈대가 있는 목각 마네킹으로 바로 포즈를 잡습니다.</p>
      </Panel>
    )
  }

  return (
    <>
      <Panel title="포즈">
        <label className="check">
          <input type="checkbox" checked={enabled} onChange={togglePoseMode} />
          포즈 편집 <kbd>R</kbd>
        </label>
        <div className="button-row" role="group" aria-label="조작 방식">
          <button aria-pressed={mode === 'rotate'} disabled={!enabled} onClick={() => setMode('rotate')} title="고른 관절을 직접 돌립니다 (T로 전환)">
            회전
          </button>
          <button aria-pressed={mode === 'ik'} disabled={!enabled} onClick={() => setMode('ik')} title="고른 관절을 끌면 위쪽 관절이 따라 굽습니다 (T로 전환)">
            IK
          </button>
        </div>
        {mode === 'ik' && (
          <div className="button-row" role="group" aria-label="IK로 굽힐 관절 수">
            {[2, 3].map((n) => (
              <button key={n} aria-pressed={chainLength === n} disabled={!enabled} onClick={() => setChainLength(n)}>
                위 관절 {n}개
              </button>
            ))}
          </div>
        )}
        <p className="hint">
          {enabled
            ? mode === 'ik'
              ? '손·발 같은 끝 관절을 고르고 화살표를 끌면 팔꿈치·무릎이 따라 굽습니다. 맨 위 관절은 몸 전체를 옮깁니다.'
              : '노란 관절 점을 눌러 고르고, 고리를 끌어 돌립니다. Esc로 선택 해제.'
            : '포즈 편집을 켜면 관절이 표시됩니다.'}
        </p>
      </Panel>

      <Panel title={selection ? `관절: ${selection.name}` : '관절'}>
        {selection ? (
          <>
            <ScaleSlider name={selection.name} scale={selection.scale} />
            <p className="hint">머리를 키우거나 팔다리를 줄여 캐릭터 비율로 바꿉니다. 아래 관절도 함께 바뀝니다.</p>
            <button className="wide" onClick={() => viewer?.pose.resetSelected()}>
              이 관절 초기화
            </button>
          </>
        ) : (
          <p className="hint">{enabled ? '관절을 고르면 크기를 바꿀 수 있습니다.' : '포즈 편집을 켜고 관절을 고르세요.'}</p>
        )}
        <button className="wide" onClick={() => viewer?.pose.resetAll()}>
          포즈 전체 초기화
        </button>
      </Panel>
    </>
  )
}
