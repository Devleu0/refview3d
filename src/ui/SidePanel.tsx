import { useT, type MessageKey } from '../i18n'
import { useUiStore, type SideTab } from '../store/uiStore'
import { AdjustPanel } from './AdjustPanel'
import { CameraPanel } from './CameraPanel'
import { ExportPanel } from './ExportPanel'
import { HistoryPanel } from './HistoryPanel'
import { LightPanel } from './LightPanel'
import { LinePanel } from './LinePanel'
import { PerspectivePanel } from './PerspectivePanel'
import { PosePanel } from './PosePanel'

const TABS: { tab: SideTab; label: MessageKey }[] = [
  { tab: 'camera', label: 'tabs.camera' },
  { tab: 'light', label: 'tabs.light' },
  { tab: 'lines', label: 'tabs.lines' },
  { tab: 'adjust', label: 'tabs.adjust' },
  { tab: 'pose', label: 'tabs.pose' },
  { tab: 'export', label: 'tabs.export' },
  { tab: 'history', label: 'tabs.history' },
]

/** 설정을 탭으로 나눠 한 번에 한 묶음만 보여준다. */
export function SidePanel() {
  const t = useT()
  const sideTab = useUiStore((s) => s.sideTab)
  const sideOpen = useUiStore((s) => s.sideOpen)
  const setSideTab = useUiStore((s) => s.setSideTab)
  if (!sideOpen) return null

  return (
    <aside className="side-panel">
      <nav className="side-tabs" role="tablist" aria-label={t('tabs.label')}>
        {TABS.map((tab) => (
          <button
            key={tab.tab}
            role="tab"
            id={`tab-${tab.tab}`}
            aria-selected={sideTab === tab.tab}
            aria-controls="side-tabpanel"
            onClick={() => setSideTab(tab.tab)}
            // 긴 번역은 잘릴 수 있으니 전체 이름을 툴팁으로도 보여 준다.
            title={t(tab.label)}
          >
            {t(tab.label)}
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
        {sideTab === 'pose' && <PosePanel />}
        {sideTab === 'export' && <ExportPanel />}
        {sideTab === 'history' && <HistoryPanel />}
      </div>
    </aside>
  )
}
