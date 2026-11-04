import { create } from 'zustand'
import type { PoseMode, PoseSelection, PoseSnapshot } from '../viewer/PoseController'
import { createMergingRecorder, useHistoryStore } from './historyStore'
import { useViewerStore } from './viewerStore'

interface PoseState {
  /** 포즈 모드: 관절 표시·선택·기즈모 */
  enabled: boolean
  mode: PoseMode
  /** IK로 함께 굽힐 위쪽 관절 수 (2 = 팔꿈치·어깨) */
  chainLength: number
  selection: PoseSelection | null

  setEnabled: (enabled: boolean) => void
  setMode: (mode: PoseMode) => void
  setChainLength: (length: number) => void
}

/** 포즈 편집 화면 상태. 편집 결과(자세)만 히스토리에 남고, 모드 전환은 남기지 않는다. */
export const usePoseStore = create<PoseState>((set) => ({
  enabled: false,
  mode: 'rotate',
  chainLength: 2,
  selection: null,
  setEnabled: (enabled) => set({ enabled }),
  setMode: (mode) => set({ mode }),
  setChainLength: (chainLength) => set({ chainLength }),
}))

const applyPose = (pose: PoseSnapshot) => useViewerStore.getState().viewer?.pose.apply(pose)
const samePose = (a: PoseSnapshot, b: PoseSnapshot) => a.length === b.length && a.every((v, i) => v.every((x, j) => Math.abs(x - b[i][j]) < 1e-7))

/** 포즈 변경 한 번을 히스토리에 남긴다. */
export function recordPose(label: string, before: PoseSnapshot, after: PoseSnapshot) {
  if (samePose(before, after)) return
  useHistoryStore.getState().push({ label, undo: () => applyPose(before), redo: () => applyPose(after) })
}

/** 슬라이더처럼 연달아 바꾸는 포즈 변경(데포르메 크기)을 한 항목으로 합치는 기록기 */
export function createPoseRecorder(label: string) {
  return createMergingRecorder(label, (pose: PoseSnapshot) => applyPose(pose), samePose)
}
