import { EXPORT_SCALES, useExportStore } from '../store/exportStore'
import { useModelStore } from '../store/modelStore'
import { useViewerStore } from '../store/viewerStore'
import { Panel } from './Panel'

export function ExportPanel() {
  const viewer = useViewerStore((s) => s.viewer)
  const hasModel = useModelStore((s) => s.model !== null)
  const { scale, busy, setScale, run } = useExportStore()
  const canvas = viewer?.renderer.domElement
  const size = canvas ? `${Math.floor(canvas.clientWidth * scale)} × ${Math.floor(canvas.clientHeight * scale)} px` : ''

  return (
    <>
      <Panel title="크기">
        <div className="button-row" role="group" aria-label="배율">
          {EXPORT_SCALES.map((s) => (
            <button key={s} aria-pressed={scale === s} onClick={() => setScale(s)} title={`화면 크기의 ${s}배`}>
              {s}x
            </button>
          ))}
        </div>
        {size && <p className="hint">지금 화면 기준 {size}</p>}
      </Panel>

      <Panel title="저장">
        <button className="wide" onClick={() => void run('png')} disabled={!hasModel || busy}>
          PNG 저장 <kbd>Ctrl+E</kbd>
        </button>
        <p className="hint">배경이 투명하고 그리드는 빠집니다.</p>
        <button className="wide" onClick={() => void run('psd')} disabled={!hasModel || busy}>
          PSD 저장 (레이어) <kbd>Ctrl+Shift+E</kbd>
        </button>
        <p className="hint">음영 · 그림자 · 은선 · 선화를 각각 레이어로 나눕니다. 켜져 있는 것만 들어갑니다.</p>
      </Panel>
    </>
  )
}
