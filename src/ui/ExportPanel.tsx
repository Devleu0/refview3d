import { useT } from '../i18n'
import { EXPORT_SCALES, useExportStore } from '../store/exportStore'
import { useModelStore } from '../store/modelStore'
import { useViewerStore } from '../store/viewerStore'
import { Panel } from './Panel'

export function ExportPanel() {
  const t = useT()
  const viewer = useViewerStore((s) => s.viewer)
  const hasModel = useModelStore((s) => s.model !== null)
  const { scale, busy, setScale, run } = useExportStore()
  const canvas = viewer?.renderer.domElement
  const size = canvas ? `${Math.floor(canvas.clientWidth * scale)} × ${Math.floor(canvas.clientHeight * scale)} px` : ''

  return (
    <>
      <Panel title={t('export.sizePanel')}>
        <div className="button-row" role="group" aria-label={t('export.scales')}>
          {EXPORT_SCALES.map((s) => (
            <button key={s} aria-pressed={scale === s} onClick={() => setScale(s)} title={t('export.scaleTitle', { scale: s })}>
              {s}x
            </button>
          ))}
        </div>
        {size && <p className="hint">{t('export.sizeHint', { size })}</p>}
      </Panel>

      <Panel title={t('export.savePanel')}>
        <button className="wide" onClick={() => void run('png')} disabled={!hasModel || busy}>
          {t('export.png')} <kbd>Ctrl+E</kbd>
        </button>
        <p className="hint">{t('export.pngHint')}</p>
        <button className="wide" onClick={() => void run('psd')} disabled={!hasModel || busy}>
          {t('export.psd')} <kbd>Ctrl+Shift+E</kbd>
        </button>
        <p className="hint">{t('export.psdHint')}</p>
      </Panel>
    </>
  )
}
