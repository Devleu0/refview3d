import { openModelDialog } from '../app/openModelDialog'
import { MODEL_FORMATS } from '../loaders/formats'
import { useModelStore } from '../store/modelStore'

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
        <button onClick={() => void useModelStore.getState().openMannequin()} title="뼈대가 있는 목각 마네킹으로 바로 포즈를 잡습니다">
          기본 마네킹으로 시작
        </button>
        <p className="empty-formats">{MODEL_FORMATS.map((f) => f.toUpperCase()).join(' · ')}</p>
      </div>
    </div>
  )
}
