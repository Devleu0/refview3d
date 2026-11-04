import { create } from 'zustand'
import { createSettingsStore } from './settingsStore'

export interface GuideSettings {
  /** 투시선 표시 */
  enabled: boolean
  /** 소실점마다 그을 선 개수 */
  lineCount: number
  /** 선 불투명도(%) */
  opacity: number
  /** 지평선(눈높이선) 표시 */
  horizon: boolean
}

export const DEFAULT_GUIDES: GuideSettings = {
  enabled: false,
  lineCount: 16,
  opacity: 55,
  horizon: true,
}

const guides = createSettingsStore(DEFAULT_GUIDES)

export const useGuideStore = guides.useStore
export const createGuideRecorder = guides.createRecorder
export const updateGuidesWithHistory = guides.updateWithHistory

/** 지금 시점이 몇 점 투시인지 (오버레이가 계산해 채운다). 가이드가 꺼져 있으면 null */
export const usePerspectivePoints = create<{ points: number | null }>(() => ({ points: null }))
