import { useEffect } from 'react'
import { useViewerStore } from '../store/viewerStore'
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
      if (isTypingTarget(e.target)) return
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()

      if (ctrl && !e.shiftKey && !e.altKey && key === 'o') {
        e.preventDefault()
        void openModelDialog()
        return
      }
      if (!ctrl && !e.altKey && key === 'f') {
        e.preventDefault()
        useViewerStore.getState().viewer?.frame()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
