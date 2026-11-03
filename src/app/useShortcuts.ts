import { useEffect } from 'react'
import { useHistoryStore } from '../store/historyStore'
import { withCameraHistory } from '../viewer/cameraHistory'
import { openModelDialog } from './openModelDialog'

/** 입력 필드에 포커스가 있을 때는 단축키를 가로채지 않는다. */
export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button'].includes(target.type)
}

export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.altKey) return
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (ctrl) {
        if (key === 'o' && !e.shiftKey) {
          e.preventDefault()
          void openModelDialog()
        } else if (key === 'z' && !e.shiftKey) {
          e.preventDefault()
          useHistoryStore.getState().undo()
        } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault()
          useHistoryStore.getState().redo()
        }
        return
      }

      if (key === 'f') {
        e.preventDefault()
        withCameraHistory('화면 맞추기', (viewer) => viewer.frame())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
