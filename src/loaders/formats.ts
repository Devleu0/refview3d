export const MODEL_FORMATS = ['obj', 'stl', 'fbx', 'gltf', 'glb'] as const
export type ModelFormat = (typeof MODEL_FORMATS)[number]

/** 뼈대·애니메이션을 담을 수 있는 포맷 */
export const RIGGED_FORMATS: readonly ModelFormat[] = ['fbx', 'gltf', 'glb']

export function getExtension(name: string) {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

export function toModelFormat(name: string): ModelFormat | null {
  const ext = getExtension(name)
  return (MODEL_FORMATS as readonly string[]).includes(ext) ? (ext as ModelFormat) : null
}

export function fileNameOf(path: string) {
  return path.split(/[\\/]/).pop() ?? path
}

/** 지원하지 않는 형식일 때 보여줄 안내 */
export function unsupportedMessage(name: string) {
  const ext = getExtension(name)
  if (ext === 'skp') {
    return 'SKP는 직접 열 수 없습니다. SketchUp에서 glTF(.glb) 또는 OBJ로 내보낸 뒤 불러와 주세요.'
  }
  return `지원하지 않는 형식입니다${ext ? ` (.${ext})` : ''}. ${MODEL_FORMATS.map((f) => f.toUpperCase()).join(', ')} 파일만 열 수 있습니다.`
}
