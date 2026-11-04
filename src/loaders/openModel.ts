import { convertFileSrc, invoke } from '@tauri-apps/api/core'
import { fileNameOf, MODEL_FORMATS, toModelFormat, unsupportedMessage } from './formats'
import { loadModel, type LoadedModel } from './loadModel'

/** 디스크 경로의 모델을 연다 (Tauri 전용). */
export async function openModelFromPath(path: string): Promise<LoadedModel> {
  const name = fileNameOf(path)
  const format = toModelFormat(name)
  if (!format) throw new Error(unsupportedMessage(name))
  // 모델 폴더를 asset 프로토콜 허용 범위에 추가해야 텍스처·.bin까지 읽을 수 있다.
  await invoke('allow_model_dir', { path })
  // convertFileSrc는 경로 전체를 한 덩어리로 인코딩해(Windows의 \ → %5C) 로더가 폴더를 알아내지 못한다.
  // 그러면 외부 .bin·텍스처를 asset 루트에서 찾다 실패하므로, 폴더 URL을 따로 넘긴다.
  const dir = path.slice(0, path.length - name.length)
  return loadModel({ url: convertFileSrc(path), name, format, path, resourcePath: convertFileSrc(dir) })
}

/**
 * 브라우저 File 객체로 모델을 연다 (브라우저 개발 모드용).
 * 단일 파일만 읽으므로 외부 텍스처나 .bin을 참조하는 GLTF/OBJ는 재질이 빠질 수 있다.
 */
export async function openModelFromFile(file: File): Promise<LoadedModel> {
  const format = toModelFormat(file.name)
  if (!format) throw new Error(unsupportedMessage(file.name))
  const url = URL.createObjectURL(file)
  try {
    return await loadModel({ url, name: file.name, format, path: null })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Tauri 파일 열기 대화상자. 취소하면 null */
export async function pickModelPath(): Promise<string | null> {
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: '3D 모델', extensions: [...MODEL_FORMATS] }],
  })
  return typeof selected === 'string' ? selected : null
}

export const ACCEPT_ATTR = MODEL_FORMATS.map((f) => `.${f}`).join(',')
