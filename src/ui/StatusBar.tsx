import { useModelStore } from '../store/modelStore'

/** 뷰포트 위 한 줄짜리 모델 정보 */
export function StatusBar() {
  const model = useModelStore((s) => s.model)
  const close = useModelStore((s) => s.close)
  if (!model) return null

  const details = [
    model.format.toUpperCase(),
    `삼각형 ${model.stats.triangles.toLocaleString()}`,
    `메시 ${model.stats.meshes.toLocaleString()}`,
    model.hasSkeleton ? '뼈대 있음' : null,
    model.animations.length > 0 ? `애니메이션 ${model.animations.length}개` : null,
  ].filter(Boolean)

  return (
    <div className="status-bar">
      <strong className="status-name" title={model.path ?? model.name}>
        {model.name}
      </strong>
      <span className="status-details">{details.join(' · ')}</span>
      <button className="status-close" onClick={close} title="모델 닫기" aria-label="모델 닫기">
        ✕
      </button>
    </div>
  )
}
