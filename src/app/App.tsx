import { CameraPanel } from '../ui/CameraPanel'
import { Viewport } from '../viewer/Viewport'
import { useShortcuts } from './useShortcuts'
import './App.css'

export default function App() {
  useShortcuts()

  return (
    <div className="app">
      <header className="toolbar">
        <span className="brand">RefView3D</span>
      </header>
      <main className="workspace">
        <section className="viewport-slot">
          <Viewport />
        </section>
        <aside className="side-panel">
          <CameraPanel />
        </aside>
      </main>
    </div>
  )
}
