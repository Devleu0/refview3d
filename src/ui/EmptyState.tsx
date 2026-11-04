import { openModelDialog } from '../app/openModelDialog'
import { MODEL_FORMATS } from '../loaders/formats'

/** 모델이 없을 때 뷰포트 가운데 안내 */
export function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-card">
        <p className="empty-title">레퍼런스 모델을 열어 시작하세요</p>
        <button className="primary" onClick={() => void openModelDialog()}>
          모델 열기 <kbd>Ctrl+O</kbd>
        </button>
        <p className="empty-sub">또는 파일을 창에 끌어다 놓으세요</p>
        <p className="empty-formats">{MODEL_FORMATS.map((f) => f.toUpperCase()).join(' · ')}</p>
      </div>
    </div>
  )
}
