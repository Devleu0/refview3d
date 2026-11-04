import { useHistoryStore } from '../store/historyStore'

export function HistoryButtons() {
  const last = useHistoryStore((s) => s.past.at(-1))
  const next = useHistoryStore((s) => s.future[0])
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)

  return (
    <div className="toolbar-group">
      <button className="icon" aria-label="실행 취소" onClick={undo} disabled={!last} title={last ? `실행 취소: ${last.label} (Ctrl+Z)` : '실행 취소 (Ctrl+Z)'}>
        ↶
      </button>
      <button className="icon" aria-label="다시 실행" onClick={redo} disabled={!next} title={next ? `다시 실행: ${next.label} (Ctrl+Y)` : '다시 실행 (Ctrl+Y)'}>
        ↷
      </button>
    </div>
  )
}
