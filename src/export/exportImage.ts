import type { Layer } from 'ag-psd'
import { isTauri } from '../platform/env'
import { useGuideStore } from '../store/guideStore'
import { computeGuides, drawGuides } from '../viewer/perspective'
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
  return saveFile(await buildExport(viewer, format, scale), `${baseName}.${format}`, format)
}

/** 현재 화면을 PNG 또는 레이어 PSD 파일 바이트로 만든다 (저장은 하지 않는다). */
export async function buildExport(viewer: SceneManager, format: ExportFormat, scale: number): Promise<Uint8Array<ArrayBuffer>> {
  if (format === 'png') {
    const { canvases } = viewer.renderForExport(scale, ['composite'])
    const blob = await toBlob(canvases.get('composite')!)
    return new Uint8Array(await blob.arrayBuffer())
  }

  const { width, height, canvases } = viewer.renderForExport(scale, ['composite', ...PSD_LAYERS.map((l) => l.layer)])
  const { writePsd } = await import('ag-psd')
  const children: Layer[] = PSD_LAYERS.filter((l) => canvases.has(l.layer)).map((l) => ({
    name: l.name,
    canvas: canvases.get(l.layer),
  }))
  const guides = renderGuideLayer(viewer, width, height)
  // 투시선은 밑그림 잡을 때만 켜 보도록 숨긴 채로 맨 위에 둔다.
  if (guides) children.push({ name: '투시선', canvas: guides, hidden: true })
  const buffer = writePsd({
    width,
    height,
    // 합성 이미지. 미리보기와 레이어를 지원하지 않는 프로그램용
    canvas: canvases.get('composite'),
    children,
  })
  return new Uint8Array(buffer)
}

/** 투시선이 켜져 있으면 내보내기 크기로 다시 그린 캔버스. 꺼져 있으면 null */
function renderGuideLayer(viewer: SceneManager, width: number, height: number) {
  const settings = useGuideStore.getState().settings
  if (!settings.enabled) return null
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  // 선 굵기를 화면과 같은 비율로 맞춘다.
  const scale = width / Math.max(viewer.renderer.domElement.clientWidth, 1)
  drawGuides(ctx, computeGuides(viewer.camera, width, height), width, height, {
    lineCount: settings.lineCount,
    opacity: settings.opacity / 100,
    horizon: settings.horizon,
    scale,
  })
  return canvas
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
