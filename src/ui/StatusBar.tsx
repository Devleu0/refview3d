import { useT } from '../i18n'
import { useModelStore } from '../store/modelStore'

/** 뷰포트 위 한 줄짜리 모델 정보 */
export function StatusBar() {
  const t = useT()
  const model = useModelStore((s) => s.model)
  const close = useModelStore((s) => s.close)
  if (!model) return null

  const mannequin = model.format === 'mannequin'
  const details = [
    // 기본 마네킹은 이름이 곧 종류라 형식을 따로 적지 않는다.
    mannequin ? null : model.format.toUpperCase(),
    t('status.triangles', { count: model.stats.triangles.toLocaleString() }),
    t('status.meshes', { count: model.stats.meshes.toLocaleString() }),
    model.hasSkeleton ? t('status.skeleton') : null,
    model.animations.length > 0 ? t('status.animations', { count: model.animations.length }) : null,
  ].filter(Boolean)
  // 마네킹 이름은 언어를 바꾸면 따라 바뀌게 그릴 때 번역한다.
  const name = mannequin ? t('mannequin.name') : model.name

  return (
    <div className="status-bar">
      <strong className="status-name" title={model.path ?? name}>
        {name}
      </strong>
      <span className="status-details">{details.join(' · ')}</span>
      <button className="status-close" onClick={close} title={t('status.close')} aria-label={t('status.close')}>
        ✕
      </button>
    </div>
  )
}
