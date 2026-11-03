import { useEffect } from 'react'
import { useViewerStore } from '../store/viewerStore'

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
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'f' || e.key === 'F') {
        useViewerStore.getState().viewer?.frame()
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
