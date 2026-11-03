import { isTauri as tauriCheck } from '@tauri-apps/api/core'

/** Tauri 데스크톱 앱 안에서 실행 중인지. 브라우저 개발 모드(npm run dev)에서는 false. */
export const isTauri = tauriCheck()
