import { createSettingsStore } from './settingsStore'

/** 원본 재질 / 회색 클레이 / 단계 음영(툰) */
export type ShadingMode = 'original' | 'clay' | 'toon'

export interface LightSettings {
  /** 주광원 방위각(도). 0 = 정면(+Z), 90 = 오른쪽(+X) */
  keyAzimuth: number
  /** 주광원 고도(도). 90 = 바로 위, 음수 = 아래에서 비춤 */
  keyElevation: number
  keyIntensity: number
  /** 주광원 반대편에서 그림자 쪽을 살짝 밝히는 보조광 */
  fillIntensity: number
  ambientIntensity: number
  shadows: boolean
  shading: ShadingMode
  /** 툰 음영 단계 수 */
  toonSteps: number
}

/** 그림에서 흔히 쓰는 왼쪽 위 조명. 기본 3/4 시점(오른쪽 앞)과 겹치지 않아 그림자가 보인다. */
export const DEFAULT_LIGHT: LightSettings = {
  keyAzimuth: -45,
  keyElevation: 45,
  keyIntensity: 2.4,
  fillIntensity: 0.5,
  ambientIntensity: 0.5,
  shadows: true,
  shading: 'original',
  toonSteps: 3,
}

/** 그림 참고용 대표 조명 배치 */
export const LIGHT_PRESETS: { label: string; azimuth: number; elevation: number }[] = [
  { label: '3/4광', azimuth: -45, elevation: 45 },
  { label: '정면광', azimuth: 0, elevation: 20 },
  { label: '측광', azimuth: 90, elevation: 10 },
  { label: '역광', azimuth: 165, elevation: 25 },
  { label: '탑라이트', azimuth: 0, elevation: 85 },
  { label: '아래에서', azimuth: 0, elevation: -35 },
]

const lights = createSettingsStore(DEFAULT_LIGHT)

export const useLightStore = lights.useStore
/** 연달아 바꾼 조명 변경(슬라이더 등)을 한 항목으로 합치는 기록기 */
export const createLightRecorder = lights.createRecorder
/** 조명 설정을 바꾸고 한 번의 히스토리 항목으로 기록한다. */
export const updateLightWithHistory = lights.updateWithHistory
