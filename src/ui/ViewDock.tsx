import { applyViewPreset, frameModel, VIEW_PRESETS } from '../app/actions'
import { useT } from '../i18n'

/** 뷰포트 아래에 떠 있는 시점 바로가기 */
export function ViewDock() {
  const t = useT()
  return (
    <div className="view-dock" role="toolbar" aria-label={t('view.dock')}>
      {VIEW_PRESETS.map((v) => (
        <button key={v.preset} onClick={() => applyViewPreset(v.preset)} title={t('view.presetTitle', { label: t(v.label), key: v.key })}>
          {t(v.label)}
        </button>
      ))}
      <span className="dock-sep" />
      <button onClick={frameModel} title={t('view.fitTitle')}>
        {t('view.fit')}
      </button>
    </div>
  )
}
