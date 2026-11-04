import { updateAdjustWithHistory, useAdjustStore } from '../store/adjustStore'
import { updateLightWithHistory, useLightStore, type ShadingMode } from '../store/lightStore'
import { updateLinesWithHistory, useLineStore } from '../store/lineStore'
import { useViewerStore } from '../store/viewerStore'
import { withCameraHistory } from '../viewer/cameraHistory'
import type { ViewPreset } from '../viewer/SceneManager'

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
