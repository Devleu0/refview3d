import { useHistoryStore, type Command } from '../store/historyStore'
import { useViewerStore } from '../store/viewerStore'
import type { CameraState, SceneManager } from './SceneManager'

function sameState(a: CameraState, b: CameraState) {
  const eps = 1e-6
  const close = (x: number[], y: number[]) => x.every((v, i) => Math.abs(v - y[i]) < eps)
  return close(a.position, b.position) && close(a.target, b.target) && Math.abs(a.fov - b.fov) < eps
}

function cameraCommand(label: string, before: CameraState, after: CameraState) {
  const apply = (state: CameraState) => useViewerStore.getState().applyCameraState(state)
  return { label, undo: () => apply(before), redo: () => apply(after) }
}

/** 카메라 상태가 실제로 바뀌었을 때만 히스토리에 남긴다. */
export function recordCameraChange(label: string, before: CameraState, after: CameraState) {
  if (sameState(before, after)) return
  useHistoryStore.getState().push(cameraCommand(label, before, after))
}

/** fn이 바꾼 카메라 상태를 한 번의 히스토리 항목으로 기록한다. */
export function withCameraHistory(label: string, fn: (viewer: SceneManager) => void) {
  const viewer = useViewerStore.getState().viewer
  if (!viewer) return
  const before = viewer.getCameraState()
  fn(viewer)
  recordCameraChange(label, before, viewer.getCameraState())
}

interface PendingOrbit {
  command: Command
  before: CameraState
  after: CameraState
  /** 기록 당시의 SceneManager.cameraEpoch */
  epoch: number
}

/**
 * 마우스 궤도 회전·이동·줌을 히스토리에 남긴다.
 *
 * 손을 떼는 즉시 항목을 기록해 순서가 꼬이지 않게 하고, 이후 감속(damping)으로
 * 움직이는 동안에는 그 항목의 "이후 상태"를 계속 갱신한다.
 * 짧은 간격으로 이어지는 휠 줌은 하나의 항목으로 합친다.
 * 반환값: 해제 함수
 */
export function trackOrbitHistory(viewer: SceneManager, mergeWindowMs = 300) {
  /** 아직 확정되지 않은(감속 중이거나 이어서 합칠 수 있는) 항목 */
  let pending: PendingOrbit | null = null
  let gestureBefore: CameraState | null = null
  let lastEnd = 0

  /** 다른 작업이 끼어들었거나(Undo 등) 코드로 카메라를 옮겼으면 진행 중인 항목을 확정한다. */
  const pendingIsLive = () => {
    if (!pending) return false
    const top = useHistoryStore.getState().past.at(-1)
    if (top !== pending.command || viewer.cameraEpoch !== pending.epoch) pending = null
    return pending !== null
  }

  const onStart = () => {
    const merge = pendingIsLive() && performance.now() - lastEnd < mergeWindowMs
    gestureBefore = merge && pending ? pending.before : viewer.getCameraState()
    if (!merge) pending = null
  }

  const onEnd = () => {
    lastEnd = performance.now()
    const before = gestureBefore
    gestureBefore = null
    if (!before) return
    const after = viewer.getCameraState()
    if (pendingIsLive() && pending) {
      pending.after = after
      return
    }
    if (sameState(before, after)) return
    const apply = (state: CameraState) => useViewerStore.getState().applyCameraState(state)
    const entry: PendingOrbit = {
      before,
      after,
      epoch: viewer.cameraEpoch,
      // after는 감속이 끝날 때까지 갱신되므로 실행 시점에 읽는다.
      command: { label: '시점 이동', undo: () => apply(entry.before), redo: () => apply(entry.after) },
    }
    pending = entry
    useHistoryStore.getState().push(entry.command)
  }

  // OrbitControls는 아주 작은 감속 움직임에는 change를 보내지 않으므로, 멈춘 뒤 한 번 더 읽는다.
  let settleTimer: ReturnType<typeof setTimeout> | undefined
  const syncAfter = () => {
    if (!gestureBefore && pendingIsLive() && pending) pending.after = viewer.getCameraState()
  }

  const onChange = () => {
    // 손을 뗀 뒤 감속으로 움직이는 동안 마지막 항목의 이후 상태를 따라간다.
    syncAfter()
    clearTimeout(settleTimer)
    settleTimer = setTimeout(syncAfter, mergeWindowMs)
  }

  viewer.controls.addEventListener('start', onStart)
  viewer.controls.addEventListener('end', onEnd)
  viewer.controls.addEventListener('change', onChange)
  return () => {
    clearTimeout(settleTimer)
    viewer.controls.removeEventListener('start', onStart)
    viewer.controls.removeEventListener('end', onEnd)
    viewer.controls.removeEventListener('change', onChange)
  }
}
