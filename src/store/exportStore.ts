import { create } from 'zustand'
import { defaultExportName, exportImage, type ExportFormat } from '../export/exportImage'
import { useModelStore } from './modelStore'
import { useToastStore } from './toastStore'
import { useViewerStore } from './viewerStore'

export const EXPORT_SCALES = [1, 2, 4] as const

interface ExportState {
  scale: number
  busy: boolean
  setScale: (scale: number) => void
  /** 현재 시점을 저장한다. 결과는 알림으로 보여준다. */
  run: (format: ExportFormat) => Promise<void>
}

export const useExportStore = create<ExportState>((set, get) => ({
  scale: 2,
  busy: false,
  setScale: (scale) => set({ scale }),
  run: async (format) => {
    const viewer = useViewerStore.getState().viewer
    const model = useModelStore.getState().model
    const toast = useToastStore.getState()
    if (!viewer || get().busy) return
    if (!model) {
      toast.show('내보낼 모델이 없습니다. 먼저 모델을 여세요.', 'error')
      return
    }
    set({ busy: true })
    try {
      const saved = await exportImage(viewer, format, get().scale, defaultExportName(model.name))
      if (saved) toast.show(`${format.toUpperCase()} 저장 완료`)
    } catch (err) {
      toast.show(`저장하지 못했습니다: ${err instanceof Error ? err.message : String(err)}`, 'error')
    } finally {
      set({ busy: false })
    }
  },
}))
