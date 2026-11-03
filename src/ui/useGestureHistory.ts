import { useRef } from 'react'

/**
 * 끌기·키 입력 한 번을 히스토리 한 항목으로 묶는다.
 * capture는 현재 상태 스냅샷을, record는 시작·끝 스냅샷으로 기록을 남긴다.
 */
export function useGestureHistory<T>(capture: () => T | null, record: (before: T, after: T) => void) {
  const start = useRef<T | null>(null)
  return {
    onBegin: () => {
      if (start.current === null) start.current = capture()
    },
    onEnd: () => {
      const before = start.current
      start.current = null
      if (before === null) return
      const after = capture()
      if (after !== null) record(before, after)
    },
  }
}
