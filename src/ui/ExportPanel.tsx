import { useState } from 'react'
import { defaultExportName, exportImage, type ExportFormat } from '../export/exportImage'
import { useModelStore } from '../store/modelStore'
import { useViewerStore } from '../store/viewerStore'
import { Panel } from './Panel'

const SCALES = [1, 2, 4] as const

export function ExportPanel() {
  const viewer = useViewerStore((s) => s.viewer)
  const hasModel = useModelStore((s) => s.model !== null)
  const [scale, setScale] = useState<number>(2)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)

  const run = async (format: ExportFormat) => {
    if (!viewer || busy) return
    setBusy(true)
    setMessage(null)
    try {
      const saved = await exportImage(viewer, format, scale, defaultExportName(useModelStore.getState().model?.name))
      if (saved) setMessage({ text: `${format.toUpperCase()} 저장 완료` })
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : String(err), error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="내보내기">
      <div className="button-row" role="group" aria-label="배율">
        {SCALES.map((s) => (
          <button key={s} aria-pressed={scale === s} onClick={() => setScale(s)} title={`화면 크기의 ${s}배`}>
            {s}x
          </button>
        ))}
      </div>
      <div className="button-row">
        <button onClick={() => void run('png')} disabled={!viewer || !hasModel || busy} title="배경이 투명한 PNG">
          PNG
        </button>
        <button onClick={() => void run('psd')} disabled={!viewer || !hasModel || busy} title="음영·그림자·은선·선화 레이어로 나눈 PSD">
          PSD (레이어)
        </button>
      </div>
      <p className="hint">배경은 투명, 그리드는 빠집니다.</p>
      {message && (
        <p className={message.error ? 'hint error' : 'hint'} role={message.error ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </Panel>
  )
}
