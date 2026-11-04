import { openModelDialog } from '../app/openModelDialog'
import { useT } from '../i18n'
import { MODEL_FORMATS } from '../loaders/formats'
import { useModelStore } from '../store/modelStore'

/** 모델이 없을 때 뷰포트 가운데 안내 */
export function EmptyState() {
  const t = useT()
  return (
    <div className="empty-state">
      <div className="empty-card">
        <p className="empty-title">{t('empty.title')}</p>
        <button className="primary" onClick={() => void openModelDialog()}>
          {t('empty.open')} <kbd>Ctrl+O</kbd>
        </button>
        <p className="empty-sub">{t('empty.drop')}</p>
        <button onClick={() => void useModelStore.getState().openMannequin()} title={t('empty.mannequinTitle')}>
          {t('empty.mannequin')}
        </button>
        <p className="empty-formats">{MODEL_FORMATS.map((f) => f.toUpperCase()).join(' · ')}</p>
      </div>
    </div>
  )
}
