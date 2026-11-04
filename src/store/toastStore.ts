import { create } from 'zustand'

export interface Toast {
  text: string
  kind: 'info' | 'error'
}

interface ToastState {
  toast: Toast | null
  /** 알림을 띄운다. 오류는 직접 닫을 때까지, 안내는 잠시 뒤 사라진다. */
  show: (text: string, kind?: Toast['kind']) => void
  clear: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (text, kind = 'info') => {
    clearTimeout(timer)
    set({ toast: { text, kind } })
    if (kind === 'info') timer = setTimeout(() => set({ toast: null }), 2500)
  },
  clear: () => {
    clearTimeout(timer)
    set({ toast: null })
  },
}))
