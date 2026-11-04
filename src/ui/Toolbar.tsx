import {
  SHADING_MODES,
  setShading,
  toggleGrayscale,
  toggleGrid,
  toggleGuides,
  toggleHiddenLines,
  toggleOutline,
  togglePoseMode,
} from '../app/actions'
import { useT } from '../i18n'
import { useAdjustStore } from '../store/adjustStore'
import { useExportStore } from '../store/exportStore'
import { useGuideStore } from '../store/guideStore'
import { useLightStore } from '../store/lightStore'
import { useLineStore } from '../store/lineStore'
import { useModelStore } from '../store/modelStore'
import { usePoseStore } from '../store/poseStore'
import { useUiStore } from '../store/uiStore'
import { useViewerStore } from '../store/viewerStore'
import { HistoryButtons } from './HistoryButtons'
import { LanguageMenu } from './LanguageMenu'
import { OpenModelButton } from './OpenModelButton'

export function Toolbar() {
  const t = useT()
  const shading = useLightStore((s) => s.settings.shading)
  const outline = useLineStore((s) => s.settings.outline)
  const hiddenLines = useLineStore((s) => s.settings.hiddenLines)
  const gridVisible = useViewerStore((s) => s.gridVisible)
  const grayscale = useAdjustStore((s) => s.settings.grayscale)
  const guides = useGuideStore((s) => s.settings.enabled)
  const posing = usePoseStore((s) => s.enabled)
  const rigged = useModelStore((s) => !!s.model?.hasSkeleton)
  const hasModel = useModelStore((s) => s.model !== null)
  const exportBusy = useExportStore((s) => s.busy)
  const runExport = useExportStore((s) => s.run)
  const scale = useExportStore((s) => s.scale)
  const sideOpen = useUiStore((s) => s.sideOpen)
  const toggleSide = useUiStore((s) => s.toggleSide)
  const libraryOpen = useUiStore((s) => s.libraryOpen)
  const toggleLibrary = useUiStore((s) => s.toggleLibrary)
  const setHelpOpen = useUiStore((s) => s.setHelpOpen)

  return (
    <header className="toolbar">
      <span className="brand">RefView3D</span>
      <button className="toggle" aria-pressed={libraryOpen} onClick={toggleLibrary} title={t('toolbar.libraryTitle')}>
        {t('toolbar.library')}
      </button>
      <OpenModelButton />
      <HistoryButtons />

      <span className="toolbar-sep" />
      <div className="segmented" role="group" aria-label={t('toolbar.shadingGroup')}>
        {SHADING_MODES.map((m) => (
          <button
            key={m.mode}
            title={t('toolbar.shadingCycle', { title: t(m.title) })}
            aria-pressed={shading === m.mode}
            onClick={() => setShading(m.mode)}
          >
            {t(m.label)}
          </button>
        ))}
      </div>

      <span className="toolbar-sep" />
      <div className="toolbar-group" role="group" aria-label={t('toolbar.displayGroup')}>
        <button className="toggle" aria-pressed={outline} onClick={toggleOutline} title={t('toolbar.outlineTitle')}>
          {t('toolbar.outline')}
        </button>
        <button className="toggle" aria-pressed={hiddenLines} onClick={toggleHiddenLines} title={t('toolbar.hiddenLinesTitle')}>
          {t('toolbar.hiddenLines')}
        </button>
        <button className="toggle" aria-pressed={gridVisible} onClick={toggleGrid} title={t('toolbar.gridTitle')}>
          {t('toolbar.grid')}
        </button>
        <button className="toggle" aria-pressed={grayscale} onClick={toggleGrayscale} title={t('toolbar.grayscaleTitle')}>
          {t('toolbar.grayscale')}
        </button>
        <button className="toggle" aria-pressed={guides} onClick={toggleGuides} title={t('toolbar.guidesTitle')}>
          {t('toolbar.guides')}
        </button>
      </div>

      <span className="toolbar-sep" />
      <button
        className="toggle"
        aria-pressed={posing}
        onClick={togglePoseMode}
        disabled={!rigged}
        title={t(rigged ? 'toolbar.poseTitle' : 'toolbar.poseUnavailable')}
      >
        {t('toolbar.pose')}
      </button>

      <span className="toolbar-spacer" />
      <div className="toolbar-group toolbar-export" role="group" aria-label={t('toolbar.exportGroup')}>
        <button onClick={() => void runExport('png')} disabled={!hasModel || exportBusy} title={t('toolbar.savePngTitle', { scale })}>
          {t('toolbar.savePng')}
        </button>
        <button onClick={() => void runExport('psd')} disabled={!hasModel || exportBusy} title={t('toolbar.savePsdTitle', { scale })}>
          {t('toolbar.savePsd')}
        </button>
      </div>
      <LanguageMenu />
      <button className="icon" onClick={() => setHelpOpen(true)} title={t('toolbar.help')} aria-label={t('toolbar.helpLabel')}>
        ?
      </button>
      <button
        className="icon"
        aria-pressed={sideOpen}
        onClick={toggleSide}
        title={t(sideOpen ? 'toolbar.panelCollapse' : 'toolbar.panelExpand')}
        aria-label={t('toolbar.panel')}
      >
        ☰
      </button>
    </header>
  )
}
