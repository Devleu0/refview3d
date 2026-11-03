import { useModelStore } from '../store/modelStore'
import { CameraPanel } from '../ui/CameraPanel'
import { HistoryButtons } from '../ui/HistoryButtons'
import { ModelPanel } from '../ui/ModelPanel'
import { OpenModelButton } from '../ui/OpenModelButton'
import { Viewport } from '../viewer/Viewport'
import { useModelDrop } from './useModelDrop'
import { useShortcuts } from './useShortcuts'
import './App.css'

export default function App() {
  useShortcuts()
  const dragging = useModelDrop()
  const hasModel = useModelStore((s) => s.model !== null)
  const loading = useModelStore((s) => s.loading)
  const error = useModelStore((s) => s.error)
  const clearError = useModelStore((s) => s.clearError)

  return (
    <div className="app">
      <header className="toolbar">
        <span className="brand">RefView3D</span>
        <OpenModelButton />
        <HistoryButtons />
      </header>
      <main className="workspace">
        <section className="viewport-slot">
          <Viewport />
          {!hasModel && !loading && (
            <p className="empty-hint">모델 파일을 끌어다 놓거나 [열기]를 누르세요 · OBJ, STL, FBX, GLTF, GLB</p>
          )}
          {loading && <div className="overlay-badge">불러오는 중…</div>}
          {dragging && <div className="drop-overlay">여기에 놓아 열기</div>}
          {error && (
            <div className="error-toast" role="alert">
              <span>{error}</span>
              <button onClick={clearError} aria-label="닫기">
                ✕
              </button>
            </div>
          )}
        </section>
        <aside className="side-panel">
          <ModelPanel />
          <CameraPanel />
        </aside>
      </main>
    </div>
  )
}
