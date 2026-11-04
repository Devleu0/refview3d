import { t, type MessageKey } from '../i18n'
import { updateAdjustWithHistory, useAdjustStore } from '../store/adjustStore'
import { updateLightWithHistory, useLightStore, type ShadingMode } from '../store/lightStore'
import { updateGuidesWithHistory, useGuideStore } from '../store/guideStore'
import { updateLinesWithHistory, useLineStore } from '../store/lineStore'
import { usePoseStore } from '../store/poseStore'
import { useUiStore } from '../store/uiStore'
import { useViewerStore } from '../store/viewerStore'
import { withCameraHistory } from '../viewer/cameraHistory'
import type { PerspectivePreset, ViewPreset } from '../viewer/SceneManager'

/** 툴바·단축키·패널이 함께 쓰는 동작. 라벨은 번역 키로 두고 그릴 때 번역한다. */

export const SHADING_MODES: { label: MessageKey; mode: ShadingMode; title: MessageKey }[] = [
  { label: 'shading.original', mode: 'original', title: 'shading.originalTitle' },
  { label: 'shading.clay', mode: 'clay', title: 'shading.clayTitle' },
  { label: 'shading.toon', mode: 'toon', title: 'shading.toonTitle' },
]

export const VIEW_PRESETS: { label: MessageKey; preset: ViewPreset; key: string }[] = [
  { label: 'view.front', preset: 'front', key: '1' },
  { label: 'view.back', preset: 'back', key: '2' },
  { label: 'view.left', preset: 'left', key: '3' },
  { label: 'view.right', preset: 'right', key: '4' },
  { label: 'view.top', preset: 'top', key: '5' },
  { label: 'view.threeQuarter', preset: 'threeQuarter', key: '6' },
]

export function setShading(mode: ShadingMode) {
  const entry = SHADING_MODES.find((m) => m.mode === mode)
  updateLightWithHistory(t('history.shading', { label: entry ? t(entry.label) : mode }), { shading: mode })
}

/** 원본 → 클레이 → 툰 순서로 바꾼다. */
export function cycleShading() {
  const current = useLightStore.getState().settings.shading
  const index = SHADING_MODES.findIndex((m) => m.mode === current)
  setShading(SHADING_MODES[(index + 1) % SHADING_MODES.length].mode)
}

export function toggleOutline() {
  const on = !useLineStore.getState().settings.outline
  updateLinesWithHistory(t(on ? 'history.outlineOn' : 'history.outlineOff'), { outline: on })
}

export function toggleHiddenLines() {
  const on = !useLineStore.getState().settings.hiddenLines
  updateLinesWithHistory(t(on ? 'history.hiddenOn' : 'history.hiddenOff'), { hiddenLines: on })
}

export function toggleGrayscale() {
  const on = !useAdjustStore.getState().settings.grayscale
  updateAdjustWithHistory(t(on ? 'history.grayscaleOn' : 'history.grayscaleOff'), { grayscale: on })
}

export function toggleGrid() {
  const { gridVisible, setGridVisible } = useViewerStore.getState()
  setGridVisible(!gridVisible)
}

export function applyViewPreset(preset: ViewPreset) {
  const entry = VIEW_PRESETS.find((v) => v.preset === preset)
  withCameraHistory(t('history.view', { label: entry ? t(entry.label) : preset }), (viewer) => viewer.setViewPreset(preset))
}

export function frameModel() {
  withCameraHistory(t('history.fit'), (viewer) => viewer.frame())
}

export const PERSPECTIVE_PRESETS: { label: MessageKey; kind: PerspectivePreset; title: MessageKey }[] = [
  { label: 'perspective.one', kind: 'one', title: 'perspective.oneTitle' },
  { label: 'perspective.two', kind: 'two', title: 'perspective.twoTitle' },
  { label: 'perspective.threeDown', kind: 'threeDown', title: 'perspective.threeDownTitle' },
  { label: 'perspective.threeUp', kind: 'threeUp', title: 'perspective.threeUpTitle' },
]

export function toggleGuides() {
  const on = !useGuideStore.getState().settings.enabled
  updateGuidesWithHistory(t(on ? 'history.guidesOn' : 'history.guidesOff'), { enabled: on })
}

/** 투시 시점으로 돌리고, 꺼져 있으면 투시선도 켠다. */
export function applyPerspectivePreset(kind: PerspectivePreset) {
  const entry = PERSPECTIVE_PRESETS.find((p) => p.kind === kind)
  withCameraHistory(t('history.perspectiveView', { label: entry ? t(entry.label) : kind }), (viewer) => viewer.setPerspectivePreset(kind))
  if (!useGuideStore.getState().settings.enabled) updateGuidesWithHistory(t('history.guidesOn'), { enabled: true })
}

/** 포즈 편집 켜기/끄기. 켤 때는 포즈 탭을 보여 준다. */
export function togglePoseMode() {
  const on = !usePoseStore.getState().enabled
  usePoseStore.getState().setEnabled(on)
  if (on) useUiStore.getState().setSideTab('pose')
}

/** 회전 ↔ IK */
export function togglePoseTool() {
  const { enabled, mode, setMode } = usePoseStore.getState()
  if (enabled) setMode(mode === 'rotate' ? 'ik' : 'rotate')
}

export function clearPoseSelection() {
  useViewerStore.getState().viewer?.pose.select(null)
}
