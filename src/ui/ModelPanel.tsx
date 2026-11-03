import { useModelStore } from '../store/modelStore'
import { Panel } from './Panel'

export function ModelPanel() {
  const model = useModelStore((s) => s.model)
  const close = useModelStore((s) => s.close)

  if (!model) return null

  return (
    <Panel title="모델">
      <dl className="info-list">
        <dt>이름</dt>
        <dd title={model.path ?? model.name}>{model.name}</dd>
        <dt>형식</dt>
        <dd>{model.format.toUpperCase()}</dd>
        <dt>메시</dt>
        <dd>{model.stats.meshes.toLocaleString()}</dd>
        <dt>삼각형</dt>
        <dd>{model.stats.triangles.toLocaleString()}</dd>
        <dt>뼈대</dt>
        <dd>{model.hasSkeleton ? '있음' : '없음'}</dd>
        <dt>애니메이션</dt>
        <dd>{model.animations.length > 0 ? `${model.animations.length}개` : '없음'}</dd>
      </dl>
      <button className="wide" onClick={close}>
        닫기
      </button>
    </Panel>
  )
}
