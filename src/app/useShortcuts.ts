import { useEffect } from 'react'
import { useExportStore } from '../store/exportStore'
import { useHistoryStore } from '../store/historyStore'
import { useUiStore } from '../store/uiStore'
import {
  applyViewPreset,
  cycleShading,
  frameModel,
  toggleGrayscale,
  toggleGrid,
  toggleGuides,
  toggleHiddenLines,
  toggleOutline,
  VIEW_PRESETS,
} from './actions'
import { openModelDialog } from './openModelDialog'

/** 입력 필드에 포커스가 있을 때는 단축키를 가로채지 않는다. */
export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button'].includes(target.type)
}

/** 한 글자 단축키 → 동작 */
const KEY_ACTIONS: Record<string, () => void> = {
  f: frameModel,
  s: cycleShading,
  l: toggleOutline,
  h: toggleHiddenLines,
  g: toggleGrid,
  b: toggleGrayscale,
  p: toggleGuides,
  ...Object.fromEntries(VIEW_PRESETS.map((v) => [v.key, () => applyViewPreset(v.preset)])),
}

export function useShortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.altKey) return
      // 단축키 도움말(모달)이 열려 있을 때는 Esc 등 대화상자 기본 동작만 둔다.
      if (useUiStore.getState().helpOpen) return
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
        } else if (key === 'b' && !e.shiftKey) {
          e.preventDefault()
          useUiStore.getState().toggleLibrary()
        } else if (key === 'e') {
          e.preventDefault()
          void useExportStore.getState().run(e.shiftKey ? 'psd' : 'png')
        }
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        useUiStore.getState().setHelpOpen(true)
        return
      }
      if (e.shiftKey || e.repeat) return
      const action = KEY_ACTIONS[key]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
