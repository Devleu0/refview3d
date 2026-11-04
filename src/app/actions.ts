import { updateAdjustWithHistory, useAdjustStore } from '../store/adjustStore'
import { updateLightWithHistory, useLightStore, type ShadingMode } from '../store/lightStore'
import { updateGuidesWithHistory, useGuideStore } from '../store/guideStore'
import { updateLinesWithHistory, useLineStore } from '../store/lineStore'
import { usePoseStore } from '../store/poseStore'
import { useUiStore } from '../store/uiStore'
import { useViewerStore } from '../store/viewerStore'
import { withCameraHistory } from '../viewer/cameraHistory'
import type { PerspectivePreset, ViewPreset } from '../viewer/SceneManager'

/** 툴바·단축키·패널이 함께 쓰는 동작 */

export const SHADING_MODES: { label: string; mode: ShadingMode; title: string }[] = [
  { label: '원본', mode: 'original', title: '모델의 원래 재질' },
  { label: '클레이', mode: 'clay', title: '회색 단색으로 형태와 명암만 보기' },
  { label: '툰', mode: 'toon', title: '명암을 몇 단계로 끊어 보기' },
]

export const VIEW_PRESETS: { label: string; preset: ViewPreset; key: string }[] = [
  { label: '정면', preset: 'front', key: '1' },
  { label: '후면', preset: 'back', key: '2' },
  { label: '좌측', preset: 'left', key: '3' },
  { label: '우측', preset: 'right', key: '4' },
  { label: '상단', preset: 'top', key: '5' },
  { label: '3/4', preset: 'threeQuarter', key: '6' },
]

export function setShading(mode: ShadingMode) {
  const label = SHADING_MODES.find((m) => m.mode === mode)?.label ?? mode
  updateLightWithHistory(`음영: ${label}`, { shading: mode })
}

/** 원본 → 클레이 → 툰 순서로 바꾼다. */
export function cycleShading() {
  const current = useLightStore.getState().settings.shading
  const index = SHADING_MODES.findIndex((m) => m.mode === current)
  setShading(SHADING_MODES[(index + 1) % SHADING_MODES.length].mode)
}

export function toggleOutline() {
  const on = !useLineStore.getState().settings.outline
  updateLinesWithHistory(on ? '외곽선 켜기' : '외곽선 끄기', { outline: on })
}

export function toggleHiddenLines() {
  const on = !useLineStore.getState().settings.hiddenLines
  updateLinesWithHistory(on ? '은선 켜기' : '은선 끄기', { hiddenLines: on })
}

export function toggleGrayscale() {
  const on = !useAdjustStore.getState().settings.grayscale
  updateAdjustWithHistory(on ? '흑백 켜기' : '흑백 끄기', { grayscale: on })
}

export function toggleGrid() {
  const { gridVisible, setGridVisible } = useViewerStore.getState()
  setGridVisible(!gridVisible)
}

export function applyViewPreset(preset: ViewPreset) {
  const label = VIEW_PRESETS.find((v) => v.preset === preset)?.label ?? preset
  withCameraHistory(`${label} 시점`, (viewer) => viewer.setViewPreset(preset))
}

export function frameModel() {
  withCameraHistory('화면 맞추기', (viewer) => viewer.frame())
}

export const PERSPECTIVE_PRESETS: { label: string; kind: PerspectivePreset; title: string }[] = [
  { label: '1점', kind: 'one', title: '축에 맞춰 수평으로 보기 — 깊이 방향만 한 점으로 모인다' },
  { label: '2점', kind: 'two', title: '대각선에서 수평으로 보기 — 좌우가 모이고 세로는 평행' },
  { label: '3점 ↓', kind: 'threeDown', title: '대각선에서 내려다보기 — 세로도 아래로 모인다' },
  { label: '3점 ↑', kind: 'threeUp', title: '대각선에서 올려다보기 — 세로가 위로 모인다' },
]

export function toggleGuides() {
  const on = !useGuideStore.getState().settings.enabled
  updateGuidesWithHistory(on ? '투시선 켜기' : '투시선 끄기', { enabled: on })
}

/** 투시 시점으로 돌리고, 꺼져 있으면 투시선도 켠다. */
export function applyPerspectivePreset(kind: PerspectivePreset) {
  const label = PERSPECTIVE_PRESETS.find((p) => p.kind === kind)?.label ?? kind
  withCameraHistory(`${label} 투시 시점`, (viewer) => viewer.setPerspectivePreset(kind))
  if (!useGuideStore.getState().settings.enabled) updateGuidesWithHistory('투시선 켜기', { enabled: true })
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
