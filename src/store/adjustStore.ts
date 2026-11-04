import { createSettingsStore } from './settingsStore'

/** 화면 전체 색 보정. 뷰포트와 내보낸 이미지에 똑같이 적용된다. */
export interface AdjustSettings {
  /** 색상 회전(도) */
  hue: number
  /** 채도(%) */
  saturation: number
  /** 명도(%) */
  brightness: number
  /** 대비(%) */
  contrast: number
  /** 흑백으로 명도(밸류)만 보기 */
  grayscale: boolean
}

export const DEFAULT_ADJUST: AdjustSettings = {
  hue: 0,
  saturation: 100,
  brightness: 100,
  contrast: 100,
  grayscale: false,
}

const adjust = createSettingsStore(DEFAULT_ADJUST)

export const useAdjustStore = adjust.useStore
export const createAdjustRecorder = adjust.createRecorder
export const updateAdjustWithHistory = adjust.updateWithHistory

/**
 * CSS/Canvas filter 문자열. 기본값이면 'none'.
 * 흑백은 다른 보정을 반영한 뒤의 명도를 보도록 마지막에 둔다.
 */
export function toFilter(s: AdjustSettings) {
  const parts: string[] = []
  if (s.hue !== 0) parts.push(`hue-rotate(${s.hue}deg)`)
  if (s.saturation !== 100) parts.push(`saturate(${s.saturation}%)`)
  if (s.brightness !== 100) parts.push(`brightness(${s.brightness}%)`)
  if (s.contrast !== 100) parts.push(`contrast(${s.contrast}%)`)
  if (s.grayscale) parts.push('grayscale(1)')
  return parts.length > 0 ? parts.join(' ') : 'none'
}
