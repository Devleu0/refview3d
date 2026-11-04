import { useUiStore, type SideTab } from '../store/uiStore'
import { AdjustPanel } from './AdjustPanel'
import { CameraPanel } from './CameraPanel'
import { ExportPanel } from './ExportPanel'
import { HistoryPanel } from './HistoryPanel'
import { LightPanel } from './LightPanel'
import { LinePanel } from './LinePanel'
import { PerspectivePanel } from './PerspectivePanel'

const TABS: { tab: SideTab; label: string }[] = [
  { tab: 'camera', label: '카메라' },
  { tab: 'light', label: '조명' },
  { tab: 'lines', label: '선화' },
  { tab: 'adjust', label: '보정' },
  { tab: 'export', label: '저장' },
  { tab: 'history', label: '기록' },
]

/** 설정을 탭으로 나눠 한 번에 한 묶음만 보여준다. */
export function SidePanel() {
  const sideTab = useUiStore((s) => s.sideTab)
  const sideOpen = useUiStore((s) => s.sideOpen)
  const setSideTab = useUiStore((s) => s.setSideTab)
  if (!sideOpen) return null

  return (
    <aside className="side-panel">
      <nav className="side-tabs" role="tablist" aria-label="설정">
        {TABS.map((t) => (
          <button
            key={t.tab}
            role="tab"
            id={`tab-${t.tab}`}
            aria-selected={sideTab === t.tab}
            aria-controls="side-tabpanel"
            onClick={() => setSideTab(t.tab)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <div className="side-body" role="tabpanel" id="side-tabpanel" aria-labelledby={`tab-${sideTab}`}>
        {sideTab === 'camera' && (
          <>
            <CameraPanel />
            <PerspectivePanel />
          </>
        )}
        {sideTab === 'light' && <LightPanel />}
        {sideTab === 'lines' && <LinePanel />}
        {sideTab === 'adjust' && <AdjustPanel />}
        {sideTab === 'export' && <ExportPanel />}
        {sideTab === 'history' && <HistoryPanel />}
      </div>
    </aside>
  )
}
