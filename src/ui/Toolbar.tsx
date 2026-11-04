import { SHADING_MODES, setShading, toggleGrid, toggleHiddenLines, toggleOutline } from '../app/actions'
import { useExportStore } from '../store/exportStore'
import { useLightStore } from '../store/lightStore'
import { useLineStore } from '../store/lineStore'
import { useModelStore } from '../store/modelStore'
import { useUiStore } from '../store/uiStore'
import { useViewerStore } from '../store/viewerStore'
import { HistoryButtons } from './HistoryButtons'
import { OpenModelButton } from './OpenModelButton'

export function Toolbar() {
  const shading = useLightStore((s) => s.settings.shading)
  const outline = useLineStore((s) => s.settings.outline)
  const hiddenLines = useLineStore((s) => s.settings.hiddenLines)
  const gridVisible = useViewerStore((s) => s.gridVisible)
  const hasModel = useModelStore((s) => s.model !== null)
  const exportBusy = useExportStore((s) => s.busy)
  const runExport = useExportStore((s) => s.run)
  const scale = useExportStore((s) => s.scale)
  const sideOpen = useUiStore((s) => s.sideOpen)
  const toggleSide = useUiStore((s) => s.toggleSide)
  const setHelpOpen = useUiStore((s) => s.setHelpOpen)

  return (
    <header className="toolbar">
      <span className="brand">RefView3D</span>
      <OpenModelButton />
      <HistoryButtons />

      <span className="toolbar-sep" />
      <div className="segmented" role="group" aria-label="음영 방식">
        {SHADING_MODES.map((m) => (
          <button key={m.mode} title={`${m.title} (S로 전환)`} aria-pressed={shading === m.mode} onClick={() => setShading(m.mode)}>
            {m.label}
          </button>
        ))}
      </div>

      <span className="toolbar-sep" />
      <div className="toolbar-group" role="group" aria-label="표시">
        <button className="toggle" aria-pressed={outline} onClick={toggleOutline} title="외곽선 (L)">
          외곽선
        </button>
        <button className="toggle" aria-pressed={hiddenLines} onClick={toggleHiddenLines} title="가려진 모서리를 점선으로 (H)">
          은선
        </button>
        <button className="toggle" aria-pressed={gridVisible} onClick={toggleGrid} title="바닥 그리드 (G)">
          그리드
        </button>
      </div>

      <span className="toolbar-spacer" />
      <div className="toolbar-group" role="group" aria-label="내보내기">
        <button onClick={() => void runExport('png')} disabled={!hasModel || exportBusy} title={`투명 PNG로 저장, 화면의 ${scale}배 (Ctrl+E)`}>
          PNG 저장
        </button>
        <button
          onClick={() => void runExport('psd')}
          disabled={!hasModel || exportBusy}
          title={`레이어 PSD로 저장, 화면의 ${scale}배 (Ctrl+Shift+E)`}
        >
          PSD 저장
        </button>
      </div>
      <button className="icon" onClick={() => setHelpOpen(true)} title="단축키 (?)" aria-label="단축키 보기">
        ?
      </button>
      <button className="icon" aria-pressed={sideOpen} onClick={toggleSide} title={sideOpen ? '설정 패널 접기' : '설정 패널 펼치기'} aria-label="설정 패널">
        ☰
      </button>
    </header>
  )
}
