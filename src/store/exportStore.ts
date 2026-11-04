import { create } from 'zustand'
import { defaultExportName, exportImage, type ExportFormat } from '../export/exportImage'
import { t } from '../i18n'
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
      toast.show(t('export.noModel'), 'error')
      return
    }
    set({ busy: true })
    try {
      const name = model.format === 'mannequin' ? t('mannequin.name') : model.name
      const saved = await exportImage(viewer, format, get().scale, defaultExportName(name))
      if (saved) toast.show(t('export.saved', { format: format.toUpperCase() }))
    } catch (err) {
      toast.show(t('export.failed', { detail: err instanceof Error ? err.message : String(err) }), 'error')
    } finally {
      set({ busy: false })
    }
  },
}))
