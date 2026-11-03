import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="toolbar">
        <span className="brand">RefView3D</span>
      </header>
      <main className="workspace">
        <section className="viewport-slot">
          <p className="empty-hint">뷰포트 준비 중</p>
        </section>
        <aside className="side-panel" />
      </main>
    </div>
  )
}
