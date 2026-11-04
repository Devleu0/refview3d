import { useT } from '../i18n'
import { useModelStore } from '../store/modelStore'
import { EmptyState } from '../ui/EmptyState'
import { LibraryPanel } from '../ui/LibraryPanel'
import { PerspectiveOverlay } from '../ui/PerspectiveOverlay'
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
  const t = useT()
  useShortcuts()
  const dragging = useModelDrop()
  const hasModel = useModelStore((s) => s.model !== null)
  const loading = useModelStore((s) => s.loading)

  return (
    <div className="app">
      <Toolbar />
      <main className="workspace">
        <LibraryPanel />
        <section className="viewport-slot">
          <Viewport />
          <PerspectiveOverlay />
          {!hasModel && !loading && <EmptyState />}
          {hasModel && <StatusBar />}
          {hasModel && <ViewDock />}
          {loading && <div className="overlay-badge">{t('viewport.loading')}</div>}
          {dragging && <div className="drop-overlay">{t('viewport.dropHere')}</div>}
          <ToastHost />
        </section>
        <SidePanel />
      </main>
      <ShortcutHelp />
    </div>
  )
}
