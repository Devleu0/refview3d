import { useT } from '../i18n'
import { useHistoryStore } from '../store/historyStore'

export function HistoryButtons() {
  const t = useT()
  const last = useHistoryStore((s) => s.past.at(-1))
  const next = useHistoryStore((s) => s.future[0])
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)

  return (
    <div className="toolbar-group">
      <button
        className="icon"
        aria-label={t('toolbar.undo')}
        onClick={undo}
        disabled={!last}
        title={last ? t('toolbar.undoNamed', { label: last.label }) : t('toolbar.undoTitle')}
      >
        ↶
      </button>
      <button
        className="icon"
        aria-label={t('toolbar.redo')}
        onClick={redo}
        disabled={!next}
        title={next ? t('toolbar.redoNamed', { label: next.label }) : t('toolbar.redoTitle')}
      >
        ↷
      </button>
    </div>
  )
}
