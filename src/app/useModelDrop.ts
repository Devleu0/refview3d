import { useEffect, useState } from 'react'
import { isTauri } from '../platform/env'
import { useModelStore } from '../store/modelStore'

/**
 * 창에 파일을 끌어다 놓으면 모델을 연다.
 * Tauri에서는 네이티브 드롭 이벤트로 실제 경로를 받고, 브라우저에서는 File 객체를 쓴다.
 * 반환값: 파일을 끌고 있는 중인지 (드롭 안내 표시용)
 */
export function useModelDrop() {
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (isTauri) {
      let unlisten: (() => void) | undefined
      let cancelled = false
      import('@tauri-apps/api/webview').then(({ getCurrentWebview }) =>
        getCurrentWebview()
          .onDragDropEvent((event) => {
            const p = event.payload
            if (p.type === 'enter' || p.type === 'over') setDragging(true)
            else if (p.type === 'leave') setDragging(false)
            else if (p.type === 'drop') {
              setDragging(false)
              const [first] = p.paths
              if (first) void useModelStore.getState().openPath(first)
            }
          })
          .then((fn) => {
            if (cancelled) fn()
            else unlisten = fn
          }),
      )
      return () => {
        cancelled = true
        unlisten?.()
      }
    }

    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth++
      setDragging(true)
    }
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      const file = e.dataTransfer?.files[0]
      if (file) void useModelStore.getState().openFile(file)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return dragging
}
