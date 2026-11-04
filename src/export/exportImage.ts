import { isTauri } from '../platform/env'
import type { ExportLayer, SceneManager } from '../viewer/SceneManager'

export type ExportFormat = 'png' | 'psd'

/** PSD 레이어 이름. 배열 순서가 아래→위 순서다. */
const PSD_LAYERS: { layer: ExportLayer; name: string }[] = [
  { layer: 'shading', name: '음영' },
  { layer: 'shadow', name: '그림자' },
  { layer: 'hiddenLines', name: '은선' },
  { layer: 'lines', name: '선화' },
]

/**
 * 현재 화면을 배경이 투명한 PNG 또는 레이어 PSD로 저장한다.
 * 반환값: 저장했으면 true, 저장 대화상자를 취소했으면 false
 */
export async function exportImage(viewer: SceneManager, format: ExportFormat, scale: number, baseName: string) {
  const fileName = `${baseName}.${format}`
  if (format === 'png') {
    const { canvases } = viewer.renderForExport(scale, ['composite'])
    const blob = await toBlob(canvases.get('composite')!)
    return saveFile(new Uint8Array(await blob.arrayBuffer()), fileName, format)
  }

  const { width, height, canvases } = viewer.renderForExport(scale, ['composite', ...PSD_LAYERS.map((l) => l.layer)])
  const { writePsd } = await import('ag-psd')
  const buffer = writePsd({
    width,
    height,
    // 합성 이미지. 미리보기와 레이어를 지원하지 않는 프로그램용
    canvas: canvases.get('composite'),
    children: PSD_LAYERS.filter((l) => canvases.has(l.layer)).map((l) => ({
      name: l.name,
      canvas: canvases.get(l.layer),
    })),
  })
  return saveFile(new Uint8Array(buffer), fileName, format)
}

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했습니다.'))), 'image/png'),
  )
}

async function saveFile(data: Uint8Array<ArrayBuffer>, fileName: string, format: ExportFormat) {
  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: format.toUpperCase(), extensions: [format] }],
    })
    if (!path) return false
    // 대화상자에서 고른 경로는 fs 플러그인 허용 범위에 자동으로 추가된다.
    const { writeFile } = await import('@tauri-apps/plugin-fs')
    await writeFile(path, data)
    return true
  }

  const url = URL.createObjectURL(new Blob([data], { type: format === 'png' ? 'image/png' : 'image/vnd.adobe.photoshop' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}

/** 모델 이름 + 시각으로 겹치지 않는 기본 파일 이름 */
export function defaultExportName(modelName: string | undefined) {
  const base = modelName ? modelName.replace(/\.[^.]+$/, '') : 'refview3d'
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${base}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}
