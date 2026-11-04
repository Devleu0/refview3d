import { useModelStore } from '../store/modelStore'
import { useToastStore } from '../store/toastStore'

/** 뷰포트 아래 알림. 모델 오류가 다른 알림보다 우선한다. */
export function ToastHost() {
  const modelError = useModelStore((s) => s.error)
  const clearModelError = useModelStore((s) => s.clearError)
  const toast = useToastStore((s) => s.toast)
  const clearToast = useToastStore((s) => s.clear)

  const current = modelError ? { text: modelError, kind: 'error' as const } : toast
  if (!current) return null
  const close = modelError ? clearModelError : clearToast

  return (
    <div className={`toast ${current.kind}`} role={current.kind === 'error' ? 'alert' : 'status'}>
      <span>{current.text}</span>
      <button onClick={close} aria-label="알림 닫기">
        ✕
      </button>
    </div>
  )
}
