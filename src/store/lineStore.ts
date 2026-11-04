import { createSettingsStore } from './settingsStore'

export interface LineSettings {
  /** 실루엣·겹치는 경계(깊이 차)에 선을 그린다 */
  outline: boolean
  /** 접힌 모서리(면 방향 차)에도 선을 그린다 */
  creases: boolean
  /** 선 굵기(px) */
  lineWidth: number
  /** 가려진 모서리를 점선으로 그린다 (스킨드 메시 제외) */
  hiddenLines: boolean
}

export const DEFAULT_LINES: LineSettings = {
  outline: false,
  creases: true,
  lineWidth: 1.5,
  hiddenLines: false,
}

const lines = createSettingsStore(DEFAULT_LINES)

export const useLineStore = lines.useStore
/** 연달아 바꾼 선화 설정(슬라이더 등)을 한 항목으로 합치는 기록기 */
export const createLineRecorder = lines.createRecorder
/** 선화 설정을 바꾸고 한 번의 히스토리 항목으로 기록한다. */
export const updateLinesWithHistory = lines.updateWithHistory
