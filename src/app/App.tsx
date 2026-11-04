import { useModelStore } from '../store/modelStore'
import { EmptyState } from '../ui/EmptyState'
import { ShortcutHelp } from '../ui/ShortcutHelp'
import { SidePanel } from '../ui/SidePanel'
import { StatusBar } from '../ui/StatusBar'
import { ToastHost } from '../ui/ToastHost'
import { Toolbar } from '../ui/Toolbar'
import { ViewDock } from '../ui/ViewDock'
import { Viewport } from '../viewer/Viewport'
import { useModelDrop } from './useModelDrop'
import { useShortcuts } from './useShortcuts'
import './App.css'

export default function App() {
  useShortcuts()
  const dragging = useModelDrop()
  const hasModel = useModelStore((s) => s.model !== null)
  const loading = useModelStore((s) => s.loading)

  return (
    <div className="app">
      <Toolbar />
      <main className="workspace">
        <section className="viewport-slot">
          <Viewport />
          {!hasModel && !loading && <EmptyState />}
          {hasModel && <StatusBar />}
          {hasModel && <ViewDock />}
          {loading && <div className="overlay-badge">불러오는 중…</div>}
          {dragging && <div className="drop-overlay">여기에 놓아 열기</div>}
          <ToastHost />
        </section>
        <SidePanel />
      </main>
      <ShortcutHelp />
    </div>
  )
}
